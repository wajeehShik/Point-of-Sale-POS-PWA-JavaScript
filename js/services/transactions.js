import { store, newId } from '../data/store.js';
import { findTx, findProduct } from '../domain/lookup.js';
import { hasNegativeStock } from '../domain/inventory.js';
import { debts, paidOn } from '../domain/debts.js';
import { EPS } from '../core/constants.js';
import { fmt, today } from '../core/format.js';

const fail = error => ({ error });

/**
 * لكل نوع "بانٍ": يتحقق من المُدخلات ويرجع {tx, after?} أو {error}.
 * s = نسخة مؤقتة من البيانات (تُهمل إذا صار خطأ)، old = العملية القديمة عند التعديل.
 */
const BUILD = {
  income: (s, d) => ({ tx: { sector: d.sector, category: d.category, amount: +d.amount } }),

  expense(s, d, old) {
    const item = (d.category || '').trim();
    if (!item) return fail('اكتب اسم الصنف');
    const tx = { sector: d.sector, category: item, amount: +d.amount };
    const q = +d.eqty, unit = (d.eunit || '').trim();
    if (q > 0) Object.assign(tx, { eqty: q, eunit: unit, unitPrice: tx.amount / q, qtyText: `${q} ${unit}`.trim() });
    else if (old && old.qtyText && !old.eqty) tx.qtyText = old.qtyText;
    return { tx };
  },

  transfer(s, d) {
    if (d.sector === d.toSector && d.account === d.toAccount) return fail('اختر قسمين أو حسابين مختلفين');
    return { tx: { sector: d.sector, toSector: d.toSector, toAccount: d.toAccount, amount: +d.amount } };
  },

  debtpay(s, d, old) {
    const debt = debts(s).find(x => x.t.id === d.ref);
    if (!debt) return fail('الدين غير موجود');
    const amount = +d.amount;
    if (amount > debt.left + (old ? old.amount : 0) + EPS) return fail('المبلغ أكبر من المتبقي من الدين');
    return { tx: { sector: 'invest', ref: d.ref, amount } };
  },

  sale(s, d, old) {
    const qty = +d.qty, amount = +d.amount;
    if (!(qty > 0 && amount > 0)) return fail('أدخل الكمية وإجمالي البيع');
    const p = findProduct(s, d.productId);
    if (!p) return fail('اختر منتجاً');
    const unit = amount / qty;
    const sameProduct = old && old.type === 'sale' && old.productId === p.id && old.qty > 0;
    const cogs = sameProduct ? (old.cogs / old.qty) * qty : p.cost * qty; // تكلفة الوحدة وقت البيع الأصلي
    return { tx: { sector: 'invest', productId: p.id, qty, amount, unit, cogs }, after: () => { p.price = unit; } };
  },

  purchase(s, d, old) {
    const qty = +d.qty, amount = +d.amount;
    if (!(qty > 0 && amount > 0)) return fail('أدخل الكمية والمبلغ');
    const unit = amount / qty, credit = !!d.credit;
    if (old) {
      const paid = paidOn(s, old.id);
      if (paid > EPS) {
        if (!credit) return fail('عليه سدادات، احذفها أولاً');
        if (amount < paid - EPS) return fail('المبلغ أقل من المسدد (' + fmt(paid) + ')');
      }
    }
    let p = findProduct(s, d.productId);
    if (d.productId === '__new') {
      const name = (d.newName || '').trim();
      if (!name) return fail('اكتب اسم المنتج');
      p = { id: newId(), name, cost: unit, price: 0, qty0: 0, min: 0 };
      s.products.push(p);
    }
    if (!p) return fail('اختر منتجاً');
    const tx = { sector: 'invest', productId: p.id, qty, amount, unit, credit };
    if (credit) { tx.account = ''; tx.supplier = (d.supplier || '').trim(); }
    return { tx, after: () => { p.cost = unit; } };
  },
};

export function saveTransaction(draft, editId = null) {
  return store.transact(s => {
    const old = editId ? findTx(s, editId) : null;
    if (editId && !old) return fail('العملية غير موجودة');
    const build = BUILD[draft.type];
    if (!build) return fail('نوع عملية غير معروف');

    const r = build(s, draft, old);
    if (r.error) return r;

    const tx = { type: draft.type, date: draft.date || today(), note: draft.note || '', account: draft.account || '', ...r.tx };
    if (!(tx.amount > 0)) return fail('أدخل مبلغاً أكبر من صفر');

    if (editId) { tx.id = editId; s.tx[s.tx.findIndex(x => x.id === editId)] = tx; }
    else { tx.id = newId(); s.tx.push(tx); }
    r.after?.();

    if (hasNegativeStock(s)) return fail('الكمية أكبر من المخزون المتوفر');
  });
}

/** السدادات المرتبطة بدين (تُحذف معه) */
export function relatedPayments(s, id) {
  const t = findTx(s, id);
  return t && t.type === 'purchase' ? s.tx.filter(x => x.type === 'debtpay' && x.ref === id) : [];
}

export function deleteTransaction(id) {
  return store.transact(s => {
    s.tx = s.tx.filter(t => t.id !== id && !(t.type === 'debtpay' && t.ref === id));
    if (hasNegativeStock(s)) return fail('ما بتنحذف: بتخلي مخزون منتج سالب. احذف عمليات البيع المرتبطة أولاً');
  });
}