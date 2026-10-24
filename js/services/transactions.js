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

// دالة موحدة لإرجاع رسالة خطأ
const fail = error => ({ error });

/**
 * BUILD هو كائن يحتوي على طريقة بناء كل نوع من العمليات المالية.
 *
 * كل دالة تستقبل:
 * s: بيانات التطبيق الحالية داخل المعاملة.
 * d: البيانات التي أدخلها المستخدم.
 * old: العملية القديمة إذا كنا نعدّل عملية موجودة.
 *
 * النتيجة تكون عادة:
 * { tx: بيانات العملية }
 * أو { error: رسالة خطأ }
 *
 * ويمكن إضافة after لتنفيذ تعديل إضافي بعد حفظ العملية.
 */
const BUILD = {

  // =========================
  // 1. عملية إيراد
  // =========================
  income: (s, d) => ({
    tx: {
      sector: d.sector,   // القسم الذي ينتمي إليه الإيراد
      category: d.category, // تصنيف الإيراد
      amount: +d.amount   // تحويل المبلغ إلى رقم
    }
  }),

  // =========================
  // 2. عملية مصروف
  // =========================
  expense(s, d, old) {
    // تنظيف اسم الصنف من المسافات الزائدة
    const item = (d.category || '').trim();

    // لا نسمح بتسجيل مصروف دون اسم للصنف
    if (!item) return fail('اكتب اسم الصنف');

    // تجهيز البيانات الأساسية للمصروف
    const tx = {
      sector: d.sector,
      category: item,
      amount: +d.amount
    };

    // قراءة الكمية ووحدة القياس، إن وُجدتا
    const q = +d.eqty;
    const unit = (d.eunit || '').trim();

    // إذا كانت هناك كمية موجبة، نحفظ بياناتها وسعر الوحدة
    if (q > 0) {
      Object.assign(tx, {
        eqty: q,
        eunit: unit,
        unitPrice: tx.amount / q, // تكلفة الوحدة الواحدة
        qtyText: `${q} ${unit}`.trim() // نص جاهز لعرض الكمية
      });

    // عند تعديل مصروف قديم، نحافظ على وصف الكمية القديم
    // إذا كان محفوظاً كنص فقط وليس ككمية رقمية
    } else if (old && old.qtyText && !old.eqty) {
      tx.qtyText = old.qtyText;
    }

    // إرجاع بيانات المصروف بعد تجهيزها
    return { tx };
  },

  // =========================
  // 3. تحويل مالي بين حسابات أو أقسام
  // =========================
  transfer(s, d) {
    // منع التحويل من الحساب نفسه إلى الحساب نفسه
    // داخل القسم نفسه
    if (d.sector === d.toSector && d.account === d.toAccount) {
      return fail('اختر قسمين أو حسابين مختلفين');
    }

    // تجهيز بيانات التحويل
    return {
      tx: {
        sector: d.sector,       // القسم المصدر
        toSector: d.toSector,   // القسم المستقبِل
        toAccount: d.toAccount, // الحساب المستقبِل
        amount: +d.amount       // مبلغ التحويل
      }
    };
  },

  // =========================
  // 4. سداد دين لمورّد
  // =========================
  debtpay(s, d, old) {
    // البحث عن الدين المرتبط بعملية السداد
    const debt = debts(s).find(x => x.t.id === d.ref);

    // رفض السداد إذا لم يكن الدين موجوداً
    if (!debt) return fail('الدين غير موجود');

    // تحويل المبلغ إلى رقم
    const amount = +d.amount;

    // التحقق من أن المبلغ لا يتجاوز المتبقي من الدين.
    // عند تعديل سداد موجود، نضيف مبلغ السداد القديم للمقارنة،
    // لأن حساب المتبقي قد يكون قد احتسب السداد القديم بالفعل.
    if (amount > debt.left + (old ? old.amount : 0) + EPS) {
      return fail('المبلغ أكبر من المتبقي من الدين');
    }

    // تسجيل السداد في قسم الاستثمار وربطه بالدين الأصلي
    return {
      tx: {
        sector: 'invest',
        ref: d.ref, // معرّف عملية الشراء التي نشأ عنها الدين
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

  const name = (d.productName || '').trim();
  if (!name) {
    return fail('اكتب اسم المنتج');
  }

  let p = s.products.find(
    item => item.name.trim().toLocaleLowerCase() ===
      name.toLocaleLowerCase()
  );

  // إذا لم يكن المنتج موجوداً، أضفه باستخدام التكلفة والمخزون المدخلين.
  if (!p) {
    const cost = +d.newCost;
    const openingStock = +d.newStock;

    if (!(cost >= 0)) {
      return fail('أدخل تكلفة صحيحة للمنتج الجديد');
    }

    if (!(openingStock >= qty)) {
      return fail('المخزون الابتدائي يجب أن يساوي الكمية المباعة أو يزيد عليها');
    }

    p = {
      id: newId(),
      name,
      cost,
      price: 0,
      qty0: openingStock,
      min: 0
    };

    s.products.push(p);
  }

  const sameProduct =
    old &&
    old.type === 'sale' &&
    old.productId === p.id &&
    old.qty > 0;

  const unit = amount / qty;
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
    // قراءة كمية الشراء والمبلغ الإجمالي
    const qty = +d.qty;
    const amount = +d.amount;

    // التحقق من صحة الكمية والمبلغ
    if (!(qty > 0 && amount > 0)) {
      return fail('أدخل الكمية والمبلغ');
    }

    // حساب تكلفة الوحدة الواحدة
    const unit = amount / qty;

    // هل تم الشراء بالدين؟
    const credit = !!d.credit;

    // إذا كنا نعدّل عملية شراء قديمة، نتحقق من السدادات المرتبطة بها
    if (old) {
      const paid = paidOn(s, old.id);

      // إذا كان قد تم سداد جزء من الدين سابقاً
      if (paid > EPS) {

        // لا يمكن تحويل الشراء من دين إلى شراء نقدي
        // ما دامت هناك سدادات مرتبطة به
        if (!credit) {
          return fail('عليه سدادات، احذفها أولاً');
        }

        // لا يمكن تخفيض قيمة الدين إلى أقل من المبلغ المسدد
        if (amount < paid - EPS) {
          return fail('المبلغ أقل من المسدد (' + fmt(paid) + ')');
        }
      }
    }

    // البحث عن المنتج المحدد
    let p = findProduct(s, d.productId);

    // إذا اختار المستخدم إنشاء منتج جديد
    if (d.productId === '__new') {
      // قراءة اسم المنتج الجديد وتنظيفه
      const name = (d.newName || '').trim();

      // لا يمكن إنشاء منتج دون اسم
      if (!name) return fail('اكتب اسم المنتج');

      // إنشاء كائن المنتج الجديد
      p = {
        id: newId(), // معرّف فريد
        name,        // اسم المنتج
        cost: unit,  // تكلفة الوحدة من عملية الشراء الحالية
        price: 0,    // سعر البيع يبدأ بصفر
        qty0: 0,     // رصيد البداية
        min: 0       // الحد الأدنى للمخزون
      };

      // إضافة المنتج إلى قائمة المنتجات
      s.products.push(p);
    }

    // رفض العملية إذا لم يتم العثور على منتج صالح
    if (!p) return fail('اختر منتجاً');

    // تجهيز بيانات عملية الشراء
    const tx = {
      sector: 'invest',
      productId: p.id,
      qty,
      amount,
      unit,
      credit // حفظ ما إذا كان الشراء بالدين أم لا
    };

    // عند الشراء بالدين، لا نربطه بمحفظة دفع مباشرة
    if (credit) {
      tx.account = '';
      tx.supplier = (d.supplier || '').trim(); // اسم المورّد
    }

    return {
      tx,

      // بعد حفظ الشراء، حدّث تكلفة المنتج إلى تكلفة الوحدة الجديدة
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
 * editId: معرّف العملية القديمة، ويكون null عند الإضافة.
 */
export function saveTransaction(draft, editId = null) {
  // تنفيذ التعديلات داخل معاملة في مخزن البيانات
  return store.transact(s => {

    // إذا كان هناك معرّف تعديل، ابحث عن العملية القديمة
    const old = editId ? findTx(s, editId) : null;

    // إذا طلبنا تعديل عملية غير موجودة، نرجع خطأ
    if (editId && !old) {
      return fail('العملية غير موجودة');
    }

    // الحصول على دالة بناء العملية بحسب نوعها
    const build = BUILD[draft.type];

    // التأكد من أن نوع العملية مدعوم
    if (!build) return fail('نوع عملية غير معروف');

    // التحقق من المدخلات وبناء بيانات العملية
    const r = build(s, draft, old);

    // إذا فشلت عملية البناء، نعيد رسالة الخطأ
    if (r.error) return r;

    // تجهيز بيانات العملية النهائية
    // القيم الموجودة في r.tx تتقدم على القيم الافتراضية
    const tx = {
      type: draft.type,
      date: draft.date || today(), // استخدام تاريخ اليوم إذا لم يُدخل تاريخ
      note: draft.note || '',      // الملاحظة، أو نص فارغ
      account: draft.account || '',// الحساب المالي، أو نص فارغ
      ...r.tx
    };

    // التحقق من أن المبلغ أكبر من صفر
    if (!(tx.amount > 0)) {
      return fail('أدخل مبلغاً أكبر من صفر');
    }

    // إذا كنا نعدّل عملية، نستبدل العملية القديمة بالجديدة
    if (editId) {
      tx.id = editId;

      // إيجاد موقع العملية القديمة واستبدالها
      s.tx[s.tx.findIndex(x => x.id === editId)] = tx;

    } else {
      // إذا كانت عملية جديدة، أنشئ لها معرّفاً وأضفها
      tx.id = newId();
      s.tx.push(tx);
    }

    // تنفيذ التعديل الإضافي إن كانت العملية تحتاج إليه
    // مثل تحديث سعر المنتج بعد البيع أو تكلفة المنتج بعد الشراء
    r.after?.();

    // التحقق من أن العملية لم تجعل مخزون أي منتج سالباً
    if (hasNegativeStock(s)) {
      return fail('الكمية أكبر من المخزون المتوفر');
    }

    // إذا لم يظهر خطأ، تُكمل المعاملة حفظ العملية
  });
}

/**
 * إرجاع عمليات سداد الدين المرتبطة بعملية شراء محددة.
 *
 * s: بيانات التطبيق.
 * id: معرّف عملية الشراء.
 */
export function relatedPayments(s, id) {
  // البحث عن عملية الشراء
  const t = findTx(s, id);

  // إذا كانت العملية عملية شراء، أرجع السدادات المرتبطة بها.
  // أما إذا لم تكن شراء أو لم توجد، فأرجع قائمة فارغة.
  return t && t.type === 'purchase'
    ? s.tx.filter(x => x.type === 'debtpay' && x.ref === id)
    : [];
}

/**
 * حذف عملية مالية وسدادات الدين المرتبطة بها إن وجدت.
 */
export function deleteTransaction(id) {
  // تنفيذ الحذف داخل معاملة
  return store.transact(s => {

    // حذف العملية المطلوبة.
    // وإذا كانت عملية شراء، تُحذف أيضاً عمليات السداد التي تشير إليها.
    s.tx = s.tx.filter(
      t => t.id !== id && !(t.type === 'debtpay' && t.ref === id)
    );

    // التأكد من أن الحذف لم يجعل مخزون منتج سالباً
    if (hasNegativeStock(s)) {
      return fail(
        'ما بتنحذف: بتخلي مخزون منتج سالب. احذف عمليات البيع المرتبطة أولاً'
      );
    }

    // إذا لم يظهر خطأ، تُكمل المعاملة عملية الحذف
  });
}