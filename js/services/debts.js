import { store, newId } from '../data/store.js';
import { findTx, findProduct } from '../domain/lookup.js';
import { hasNegativeStock } from '../domain/inventory.js';
import { debts, paidOn } from '../domain/debts.js';
import { EPS } from '../core/constants.js';
import { fmt, r2, today } from '../core/format.js';

const fail = error => ({ error });
const payment = (ref, amount, account) =>
  ({ id: newId(), type: 'debtpay', sector: 'invest', ref, amount, account, date: today(), note: '' });

export function saveDebt(id, { qty, amount, supplier }) {
  return store.transact(s => {
    const t = findTx(s, id);
    if (!t) return fail('الدين غير موجود');
    qty = +qty; amount = +amount;
    if (!(qty > 0 && amount > 0)) return fail('أدخل الكمية والمبلغ');
    const paid = paidOn(s, id);
    if (amount < paid - EPS) return fail('المبلغ أقل من المسدد (' + fmt(paid) + ')');
    Object.assign(t, { qty, amount, unit: amount / qty, supplier: (supplier || '').trim() });
    const p = findProduct(s, t.productId);
    if (p) p.cost = t.unit;
    if (hasNegativeStock(s)) return fail('الكمية بتخلي المخزون سالب');
  });
}

export function payDebt(id, { amount, account, all = false }) {
  return store.transact(s => {
    const d = debts(s).find(x => x.t.id === id);
    if (!d) return fail('الدين غير موجود');
    const a = all ? d.left : +amount;
    if (!(a > 0)) return fail('أدخل مبلغ السداد');
    if (a > d.left + EPS) return fail('المبلغ أكبر من المتبقي (' + fmt(d.left) + ')');
    s.tx.push(payment(id, r2(a), account));
  });
}

export function savePayment(id, { amount, account }) {
  return store.transact(s => {
    const t = findTx(s, id);
    if (!t) return fail('السداد غير موجود');
    const a = +amount;
    if (!(a > 0)) return fail('أدخل مبلغاً أكبر من صفر');
    const d = debts(s).find(x => x.t.id === t.ref);
    if (d && a > d.left + t.amount + EPS) return fail('المبلغ أكبر من المتبقي من الدين');
    Object.assign(t, { amount: a, account });
  });
}

export const deletePayment = id => store.transact(s => { s.tx = s.tx.filter(x => x.id !== id); });

/** تسوية مورّد: المستحق عن المباع أولاً (من الأقدم)، وما زاد يذهب لباقي الدين */
export function settleSupplier(key, { amount, account }) {
  return store.transact(s => {
    let rest = +amount;
    const ds = debts(s).filter(d => (d.t.supplier || '') === key && d.left > EPS);
    const left = ds.reduce((a, d) => a + d.left, 0);
    if (!(rest > 0)) return fail('أدخل مبلغ السداد');
    if (rest > left + EPS) return fail('المبلغ أكبر من كل المتبقي (' + fmt(left) + ')');

    const plan = ds.map(d => ({ d, x: 0 }));
    for (const p of plan) { const v = Math.min(p.d.due, rest); p.x += v; rest -= v; }
    for (const p of plan) { if (rest <= 0.004) break; const v = Math.min(p.d.left - p.x, rest); p.x += v; rest -= v; }
    plan.forEach(p => { if (p.x > 0.004) s.tx.push(payment(p.d.t.id, r2(p.x), account)); });
  });
}