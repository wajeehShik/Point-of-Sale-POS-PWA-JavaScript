import { TX_TYPES } from './txTypes.js';

export function balances(state) {
  const r = { home: 0, invest: 0, total: 0, accounts: {} };
  state.accounts.forEach(a => { r.accounts[a.id] = { total: 0, home: 0, invest: 0 }; });
  for (const t of state.tx) {
    for (const e of TX_TYPES[t.type].effects(t)) {
      r[e.sector] += e.delta;
      const acc = r.accounts[e.account];
      if (acc) { acc.total += e.delta; acc[e.sector] += e.delta; }
    }
  }
  r.total = r.home + r.invest;
  return r;
}

/** الفترة: '' للكل، 'YYYY-MM' أو 'YYYY-MM-DD'، أو {from,to} */
export const inPeriod = (date, p) =>
  !p || (typeof p === 'object' ? date >= p.from && date <= p.to : date.startsWith(p));

export function periodSummary(state, period) {
  const s = {
    home: { income: 0, expense: 0 },
    invest: { sales: 0, cogs: 0, expenses: 0, purchases: 0, profit: 0 },
  };
  for (const t of state.tx) {
    if (!inPeriod(t.date, period)) continue;
    if (t.sector === 'home') {
      if (t.type === 'income') s.home.income += t.amount;
      if (t.type === 'expense') s.home.expense += t.amount;
    } else if (t.sector === 'invest') {
      if (t.type === 'sale') { s.invest.sales += t.amount; s.invest.cogs += t.cogs || 0; }
      if (t.type === 'expense') s.invest.expenses += t.amount;
      if (t.type === 'purchase') s.invest.purchases += t.amount;
    }
  }
  s.invest.profit = s.invest.sales - s.invest.cogs - s.invest.expenses;
  return s;
}

/** تفصيل الرصيد النقدي للاستثمار */
export function cashFlow(state) {
  const r = { capital: 0, sales: 0, paidPurchases: 0, debtPayments: 0, expenses: 0 };
  for (const t of state.tx) {
    if (t.type === 'transfer') {
      if (t.toSector === 'invest') r.capital += t.amount;
      if (t.sector === 'invest') r.capital -= t.amount;
      continue;
    }
    if (t.sector !== 'invest') continue;
    switch (t.type) {
      case 'income': r.capital += t.amount; break;
      case 'sale': r.sales += t.amount; break;
      case 'purchase': if (!t.credit) r.paidPurchases += t.amount; break;
      case 'debtpay': r.debtPayments += t.amount; break;
      case 'expense': r.expenses += t.amount; break;
    }
  }
  return r;
}