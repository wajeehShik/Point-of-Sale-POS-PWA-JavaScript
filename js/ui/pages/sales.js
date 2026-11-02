import {
  balances,
  periodSummary,
  inPeriod
} from '../../domain/ledger.js';

import { fmt } from '../../core/format.js';

import {
  card,
  grid
} from '../components.js';

import {
  periodBar,
  currentPeriod
} from '../periodBar.js';

import { opsBlock } from '../opsView.js';

export default {
  title: 'المبيعات',

  // صفحة المبيعات مرتبطة ماليًا بالاستثمار
  ctx: 'invest',

  render(state) {
    const period = currentPeriod();

    const summary =
      periodSummary(state, period).invest;

    const cash =
      balances(state).invest;

    const salesCount =
      state.tx.filter(t =>
        t.type === 'sale' &&
        t.sector === 'invest' &&
        inPeriod(t.date, period)
      ).length;

    const grossProfit =
      summary.sales - summary.cogs;

    return `
      <section class="hero compact-hero">
        <small>مبيعات الفترة</small>
        <h1>${fmt(summary.sales)}</h1>
      </section>

      ${periodBar(state)}

      ${grid(
        card(
          'إجمالي المبيعات',
          fmt(summary.sales),
          'pos'
        )

        + card(
          'عدد عمليات البيع',
          String(salesCount)
        )

        + card(
          'تكلفة المباع',
          fmt(summary.cogs)
        )

        + card(
          'ربح المبيعات',
          fmt(grossProfit),
          grossProfit >= 0 ? 'pos' : 'neg',
          'hl'
        )

        + card(
          'رصيد الاستثمار الحالي',
          fmt(cash)
        )
      )}

      <h3>سجل المبيعات</h3>

      ${opsBlock(state, 'sales')}
    `;
  },
};
