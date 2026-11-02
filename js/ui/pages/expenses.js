import {
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
  title: 'المصاريف',

  // المصاريف تتبع قطاع الاستثمار
  ctx: 'invest',

  render(state) {
    const period = currentPeriod();

    const summary =
      periodSummary(state, period).invest;

    const expensesCount =
      state.tx.filter(t =>
        t.type === 'expense' &&
        t.sector === 'invest' &&
        inPeriod(t.date, period)
      ).length;

    return `
      <section class="hero compact-hero">
        <small>مصاريف الاستثمار للفترة</small>
        <h1>${fmt(summary.expenses)}</h1>
      </section>

      ${periodBar(state)}

      ${grid(
        card(
          'مصاريف الاستثمار',
          fmt(summary.expenses),
          'neg'
        )

        + card(
          'عدد المصاريف',
          String(expensesCount)
        )
      )}

      <h3>سجل المصاريف</h3>

      ${opsBlock(state, 'expenses')}
    `;
  },
};
