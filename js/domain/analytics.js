import { periodSummary } from './ledger.js';
import { monthsOf } from './period.js';
import { today } from '../core/format.js';

/** آخر سعر وحدة دُفع لصنف (وبنفس الوحدة إذا انحددت) */
export function lastUnitPrice(state, item, unit, excludeId) {
  return state.tx
    .filter(t => t.type === 'expense' && t.category === item && t.unitPrice && t.id !== excludeId && (!unit || t.eunit === unit))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0] || null;
}

/** متوسط وآخر سعر ونسبة التغيّر لكل صنف */
export function itemPrices(txs) {
  const groups = {};
  txs.filter(t => t.type === 'expense' && t.unitPrice).forEach(t => {
    (groups[t.category + '|' + (t.eunit || '')] ||= []).push(t);
  });
  return Object.entries(groups).map(([k, a]) => {
    a.sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
    const [name, unit] = k.split('|');
    const last = a.at(-1).unitPrice, prev = a.length > 1 ? a.at(-2).unitPrice : null;
    const qty = a.reduce((s, t) => s + t.eqty, 0);
    const avg = a.reduce((s, t) => s + t.amount, 0) / qty;
    const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    return { name, unit, count: a.length, avg, last, change: Math.abs(change) >= 1 ? change : 0 };
  });
}

export function expenseByCategory(txs, sector) {
  const m = {};
  txs.filter(t => t.type === 'expense' && t.sector === sector).forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export function productPerformance(txs) {
  const m = {};
  txs.filter(t => t.type === 'sale').forEach(t => {
    const o = (m[t.productId] ||= { id: t.productId, qty: 0, revenue: 0, cost: 0 });
    o.qty += t.qty; o.revenue += t.amount; o.cost += t.cogs || 0;
  });
  return Object.values(m)
    .map(o => ({ ...o, profit: o.revenue - o.cost, margin: o.revenue > 0 ? Math.round(((o.revenue - o.cost) / o.revenue) * 100) : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

export function monthlySeries(state, n = 6) {
  return monthsOf(state).slice(0, n).reverse().map(month => {
    const x = periodSummary(state, month);
    return { month, income: x.home.income, expense: x.home.expense, profit: Math.max(0, x.invest.profit) };
  });
}

export function daysIn(state, period) {
  const t = today();
  if (period && typeof period === 'object') {
    const to = period.to > t ? t : period.to;
    return Math.max(1, Math.round((new Date(to) - new Date(period.from)) / 864e5) + 1);
  }
  if (period && period.length === 10) return 1;
  if (period && period.length === 7) {
    const [y, m] = period.split('-').map(Number);
    return period === t.slice(0, 7) ? new Date().getDate() : new Date(y, m, 0).getDate();
  }
  const dates = state.tx.map(x => x.date).sort();
  return dates.length ? Math.max(1, Math.round((new Date(t) - new Date(dates[0])) / 864e5) + 1) : 1;
}