import { balances, periodSummary } from '../../domain/ledger.js';
import { inventoryValue } from '../../domain/inventory.js';
import { fmt, pct } from '../../core/format.js';
import { card, grid } from '../components.js';
import { periodBar, currentPeriod } from '../periodBar.js';
import { opsBlock } from '../opsView.js';
import { cashFlowView } from '../views/cashFlowView.js';
import { suppliersSection } from '../views/suppliersView.js';
import { productsSection } from '../views/productsView.js';

export default {
  title: 'الاستثمار',
  ctx: 'invest',
  render(state) {
    const b = balances(state), m = periodSummary(state, currentPeriod()).invest;
    const gross = m.sales - m.cogs, tone = n => (n >= 0 ? 'pos' : 'neg');
    return `<section class="hero"><small>رصيد الاستثمار (نقد)</small><h1>${fmt(b.invest)}</h1></section>
    ${periodBar(state)}
    ${grid(
      card('قيمة المخزون', fmt(inventoryValue(state))) + card('المشتريات', fmt(m.purchases))
      + card('المبيعات', fmt(m.sales)) + card('تكلفة المباع', fmt(m.cogs))
      + card('المصاريف', fmt(m.expenses), 'neg') + card('هامش الربح', pct(m.profit, m.sales))
      + card('ربح المبيعات (قبل المصاريف)', fmt(gross), tone(gross), 'hl')
      + card('صافي الربح (بعد المصاريف)', fmt(m.profit), tone(m.profit), 'hl'))}
    ${cashFlowView(state)}
    ${suppliersSection(state)}
    ${productsSection(state)}
    <h3>العمليات</h3>${opsBlock(state, 'invest')}`;
  },
};