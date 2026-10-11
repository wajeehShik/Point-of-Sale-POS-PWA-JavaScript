import { EPS } from '../core/constants.js';

const byDate = (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export const paidOn = (s, id) =>
  s.tx.filter(t => t.type === 'debtpay' && t.ref === id).reduce((a, t) => a + t.amount, 0);

/** توزيع الكميات المباعة على الديون من الأقدم للأحدث (FIFO لكل منتج) */
function soldByDebt(s) {
  const out = {}, byProduct = {};
  s.tx.filter(t => t.type === 'purchase' && t.credit).forEach(t => {
    (byProduct[t.productId] ||= []).push(t);
    out[t.id] = 0;
  });
  for (const pid in byProduct) {
    const p = s.products.find(x => x.id === pid);
    let sold = s.tx.filter(t => t.type === 'sale' && t.productId === pid).reduce((a, t) => a + t.qty, 0);
    sold = Math.max(0, sold - Math.max(0, +(p && p.qty0) || 0)); // البضاعة القديمة المدفوعة تُباع أولاً
    byProduct[pid].sort(byDate).forEach(t => { const x = Math.min(t.qty, sold); out[t.id] = x; sold -= x; });
  }
  return out;
}

/** لكل دين: paid المسدد، left المتبقي، soldQty المباع، soldCost ثمن المباع، due المستحق الآن */
export function debts(s) {
  const sold = soldByDebt(s);
  return s.tx.filter(t => t.type === 'purchase' && t.credit).map(t => {
    const paid = paidOn(s, t.id), soldQty = sold[t.id] || 0, unit = t.qty > 0 ? t.amount / t.qty : 0;
    const soldCost = soldQty * unit, left = t.amount - paid;
    return { t, paid, left, soldQty, soldCost, unit, due: Math.max(0, Math.min(left, soldCost - paid)) };
  }).sort((a, b) => byDate(a.t, b.t));
}

export const supplierOf = d => d.t.supplier || '';
export const supplierDebts = (s, key) => debts(s).filter(d => supplierOf(d) === key);
export const debtTotal = s => debts(s).reduce((a, d) => a + Math.max(0, d.left), 0);

export function supplierGroups(s) {
  const m = {};
  debts(s).filter(d => d.left > EPS).forEach(d => {
    const k = supplierOf(d);
    const g = (m[k] ||= { key: k, count: 0, left: 0, due: 0, first: d.t.date });
    g.count++; g.left += d.left; g.due += d.due;
    if (d.t.date < g.first) g.first = d.t.date;
  });
  return Object.values(m).sort((a, b) => b.due - a.due || b.left - a.left);
}