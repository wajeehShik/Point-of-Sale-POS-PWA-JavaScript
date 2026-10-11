export function stockMap(state) {
  const m = {};
  state.products.forEach(p => { m[p.id] = +p.qty0 || 0; });
  for (const t of state.tx) {
    if (!(t.productId in m)) continue;
    if (t.type === 'purchase') m[t.productId] += t.qty;
    else if (t.type === 'sale') m[t.productId] -= t.qty;
  }
  return m;
}

export const stock = (s, pid) => stockMap(s)[pid] ?? 0;
export const hasNegativeStock = s => Object.values(stockMap(s)).some(q => q < -1e-9);

export function inventoryValue(s) {
  const m = stockMap(s);
  return s.products.reduce((sum, p) => sum + Math.max(0, m[p.id]) * p.cost, 0);
}

export function productStats(s, pid) {
  let sold = 0, profit = 0;
  for (const t of s.tx) {
    if (t.type === 'sale' && t.productId === pid) { sold += t.qty; profit += t.amount - (t.cogs || 0); }
  }
  return { sold, profit };
}