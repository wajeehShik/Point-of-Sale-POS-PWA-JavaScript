import { balances, periodSummary } from '../../domain/ledger.js';
import { SECTORS } from '../../core/constants.js';
import { fmt } from '../../core/format.js';
import { esc } from '../dom.js';
import { card, grid, listBox } from '../components.js';
import { periodBar, currentPeriod, periodText } from '../periodBar.js';
import { allOpsList, searchBox } from '../opsView.js';

const neg = n => (n < 0 ? 'neg' : '');

const walletRow = (acc, w) => `<div class="wal">
  <div class="top"><span>${esc(acc.name)}</span><b class="${neg(w.total)}">${fmt(w.total)}</b></div>
  <div class="sub">
    <span>${SECTORS.home.icon} ${SECTORS.home.label} <b class="${neg(w.home)}">${fmt(w.home)}</b></span>
    <span>${SECTORS.invest.icon} ${SECTORS.invest.label} <b class="${neg(w.invest)}">${fmt(w.invest)}</b></span>
  </div></div>`;

export default {
  title: 'الرئيسية',
  ctx: null,
  render(state) {
    const b = balances(state), s = periodSummary(state, currentPeriod()), h = s.home, i = s.invest;
    return `<section class="hero"><small>إجمالي الأموال</small><h1>${fmt(b.total)}</h1>
      <div class="split">
        <div>${SECTORS.home.icon} ${SECTORS.home.label}<b>${fmt(b.home)}</b></div>
        <div>${SECTORS.invest.icon} ${SECTORS.invest.label}<b>${fmt(b.invest)}</b></div>
      </div></section>
    ${periodBar(state)}
    <h3>ملخص · ${periodText()}</h3>
    ${grid(
      card('دخل البيت', fmt(h.income), 'pos') + card('مصروف البيت', fmt(h.expense), 'neg')
      + card('مبيعات الاستثمار', fmt(i.sales)) + card('ربح الاستثمار', fmt(i.profit), i.profit >= 0 ? 'pos' : 'neg'),
      'margin-top:0')}
    <h3>المحافظ · الرصيد الفعلي وتوزيعه</h3>
    ${listBox(state.accounts.map(a => walletRow(a, b.accounts[a.id])).join(''))}
    <h3>العمليات · ${periodText()}</h3>
    ${searchBox('all')}<div id="ops-all">${allOpsList(state)}</div>`;
  },
};