import { balances, periodSummary } from '../../domain/ledger.js';
import { fmt, today } from '../../core/format.js';
import { card, grid } from '../components.js';
import { periodBar, currentPeriod, periodText } from '../periodBar.js';
import { opsBlock } from '../opsView.js';

export default {
  title: 'البيت',
  ctx: 'home',
  render(state) {
    const b = balances(state), m = periodSummary(state, currentPeriod()).home;
    const todayExpense = periodSummary(state, today()).home.expense, left = m.income - m.expense, label = periodText();
    return `<section class="hero"><small>رصيد البيت</small><h1>${fmt(b.home)}</h1></section>
    ${periodBar(state)}
    ${grid(
      card(`الدخل · ${label}`, fmt(m.income), 'pos') + card(`المصروف · ${label}`, fmt(m.expense), 'neg')
      + card(`المتبقي · ${label}`, fmt(left), left < 0 ? 'neg' : '') + card('مصروف اليوم', fmt(todayExpense), 'neg'))}
    <h3>العمليات</h3>${opsBlock(state, 'home')}`;
  },
};