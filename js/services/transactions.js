// استيراد مخزن البيانات وإنشاء معرّفات فريدة للعمليات والمنتجات
import { store, newId } from '../data/store.js';

// استيراد دوال البحث عن عملية أو منتج
import { findTx, findProduct } from '../domain/lookup.js';

// استيراد دالة التحقق من عدم وجود مخزون سالب
import { hasNegativeStock } from '../domain/inventory.js';

// استيراد دوال حساب الديون والمبالغ المسددة منها
import { debts, paidOn } from '../domain/debts.js';

// استيراد هامش السماح للأخطاء البسيطة في الكسور العشرية
import { EPS } from '../core/constants.js';

// استيراد تنسيق المبالغ والحصول على تاريخ اليوم
import { fmt, today } from '../core/format.js';

// دالة موحدة لإرجاع رسالة الخطأ
const fail = error => ({ error });

/**
 * البحث عن منتج بالاسم دون التأثر باختلاف
 * الأحرف الكبيرة أو الصغيرة والمسافات الزائدة.
 */
function findProductByName(state, name) {
  const normalizedName = (name || '')
    .trim()
    .toLocaleLowerCase();

  if (!normalizedName) return null;

  return (state.products || []).find(product =>
    (product.name || '')
      .trim()
      .toLocaleLowerCase() === normalizedName
  ) || null;
}

/**
 * BUILD يحتوي على دالة بناء لكل نوع من العمليات المالية.
 *
 * كل دالة تستقبل:
 * s: بيانات التطبيق داخل المعاملة.
 * d: البيانات التي أدخلها المستخدم.
 * old: العملية القديمة عند تعديل عملية موجودة.
 */
const BUILD = {
  // =========================
  // 1. عملية إيراد
  // =========================
  income: (s, d) => ({
    tx: {
      sector: d.sector,
      category: d.category,
      amount: +d.amount
    }
  }),

  // =========================
  // 2. عملية مصروف
  // =========================
  expense(s, d, old) {
    const item = (d.category || '').trim();

    if (!item) {
      return fail('اكتب اسم الصنف');
    }

    const tx = {
      sector: d.sector,
      category: item,
      amount: +d.amount
    };

    const q = +d.eqty;
    const unit = (d.eunit || '').trim();

    if (q > 0) {
      Object.assign(tx, {
        eqty: q,
        eunit: unit,
        unitPrice: tx.amount / q,
        qtyText: `${q} ${unit}`.trim()
      });
    } else if (old && old.qtyText && !old.eqty) {
      tx.qtyText = old.qtyText;
    }

    return { tx };
  },

  // =========================
  // 3. تحويل مالي بين حسابات أو أقسام
  // =========================
  transfer(s, d) {
    if (d.sector === d.toSector && d.account === d.toAccount) {
      return fail('اختر قسمين أو حسابين مختلفين');
    }

    return {
      tx: {
        sector: d.sector,
        toSector: d.toSector,
        toAccount: d.toAccount,
        amount: +d.amount
      }
    };
  },

  // =========================
  // 4. سداد دين لمورّد
  // =========================
  debtpay(s, d, old) {
    const debt = debts(s).find(x => x.t.id === d.ref);

    if (!debt) {
      return fail('الدين غير موجود');
    }

    const amount = +d.amount;

    if (amount > debt.left + (old ? old.amount : 0) + EPS) {
      return fail('المبلغ أكبر من المتبقي من الدين');
    }

    return {
      tx: {
        sector: 'invest',
        ref: d.ref,
        amount
      }
    };
  },

  // =========================
  // 5. عملية بيع منتج
  // =========================
  sale(s, d, old) {
    const qty = +d.qty;
    const amount = +d.amount;

    if (!(qty > 0 && amount > 0)) {
      return fail('أدخل الكمية وإجمالي البيع');
    }

    // دعم اختيار المنتج بالمعرّف في القائمة القديمة
    // أو باسمه المكتوب في حقل البحث.
    const productName = (
      d.productName ||
      d.newName ||
      ''
    ).trim();

    let p = d.productId && d.productId !== '__new'
      ? findProduct(s, d.productId)
      : null;

    if (!p && productName) {
      p = findProductByName(s, productName);
    }

    if (!p) {
      return fail('اختر منتجاً موجوداً للبيع');
    }

    const unit = amount / qty;

    const sameProduct =
      old &&
      old.type === 'sale' &&
      old.productId === p.id &&
      old.qty > 0;

    const cogs = sameProduct
      ? (old.cogs / old.qty) * qty
      : p.cost * qty;

    return {
      tx: {
        sector: 'invest',
        productId: p.id,
        qty,
        amount,
        unit,
        cogs
      },

      after: () => {
        p.price = unit;
      }
    };
  },

  // =========================
  // 6. عملية شراء منتج
  // =========================
  purchase(s, d, old) {
    const qty = +d.qty;
    const amount = +d.amount;

    if (!(qty > 0 && amount > 0)) {
      return fail('أدخل الكمية والمبلغ');
    }

    const unit = amount / qty;
    const credit = !!d.credit;

    // عند تعديل شراء قديم، نتحقق من السدادات المرتبطة به.
    if (old) {
      const paid = paidOn(s, old.id);

      if (paid > EPS) {
        if (!credit) {
          return fail('عليه سدادات، احذفها أولاً');
        }

        if (amount < paid - EPS) {
          return fail('المبلغ أقل من المسدد (' + fmt(paid) + ')');
        }
      }
    }

    // بعض النماذج ترسل اسم المنتج في productName،
    // وبعضها ترسله في newName؛ ندعم الحالتين.
    const productName = (
      d.productName ||
      d.newName ||
      ''
    ).trim();

    // أولًا: ابحث باستخدام معرّف المنتج إذا توفر.
    let p = d.productId && d.productId !== '__new'
      ? findProduct(s, d.productId)
      : null;

    // ثانيًا: إذا لم نجد المنتج بالمعرّف، ابحث بالاسم المكتوب.
    if (!p && productName) {
      p = findProductByName(s, productName);
    }

    // إذا لم يكن المنتج موجودًا، أنشئه لأول مرة.
    if (!p) {
      if (!productName) {
        return fail('اكتب اسم المنتج أو اختر منتجاً');
      }

      p = {
        id: newId(),
        name: productName,
        cost: unit,
        price: 0,
        qty0: 0,
        min: 0
      };

      s.products.push(p);
    }

    const tx = {
      sector: 'invest',
      productId: p.id,
      qty,
      amount,
      unit,
      credit
    };

    if (credit) {
      tx.account = '';
      tx.supplier = (d.supplier || '').trim();
    }

    return {
      tx,

      after: () => {
        p.cost = unit;
      }
    };
  }
};

/**
 * حفظ عملية مالية جديدة أو تعديل عملية موجودة.
 *
 * draft: البيانات المدخلة من النموذج.
 * editId: معرّف العملية القديمة، أو null عند إضافة عملية جديدة.
 */
export function saveTransaction(draft, editId = null) {
  return store.transact(s => {
    const old = editId ? findTx(s, editId) : null;

    if (editId && !old) {
      return fail('العملية غير موجودة');
    }

    const build = BUILD[draft.type];

    if (!build) {
      return fail('نوع عملية غير معروف');
    }

    const result = build(s, draft, old);

    if (result.error) {
      return result;
    }

    const tx = {
      type: draft.type,
      date: draft.date || today(),
      note: draft.note || '',
      account: draft.account || '',
      ...result.tx
    };

    if (!(tx.amount > 0)) {
      return fail('أدخل مبلغاً أكبر من صفر');
    }

    if (editId) {
      tx.id = editId;

      const index = s.tx.findIndex(item => item.id === editId);

      if (index === -1) {
        return fail('العملية غير موجودة');
      }

      s.tx[index] = tx;
    } else {
      tx.id = newId();
      s.tx.push(tx);
    }

    result.after?.();

    if (hasNegativeStock(s)) {
      return fail('الكمية أكبر من المخزون المتوفر');
    }
  });
}

/**
 * إرجاع عمليات سداد الدين المرتبطة بعملية شراء محددة.
 *
 * s: بيانات التطبيق.
 * id: معرّف عملية الشراء.
 */
export function relatedPayments(s, id) {
  const transaction = findTx(s, id);

  return transaction && transaction.type === 'purchase'
    ? s.tx.filter(item =>
        item.type === 'debtpay' && item.ref === id
      )
    : [];
}

/**
 * حذف عملية مالية وسدادات الدين المرتبطة بها إن وجدت.
 */
export function deleteTransaction(id) {
  return store.transact(s => {
    s.tx = s.tx.filter(
      transaction =>
        transaction.id !== id &&
        !(transaction.type === 'debtpay' && transaction.ref === id)
    );

    if (hasNegativeStock(s)) {
      return fail(
        'ما بتنحذف: بتخلي مخزون منتج سالب. احذف عمليات البيع المرتبطة أولاً'
      );
    }
  });
}
