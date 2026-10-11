import { periodSummary, inPeriod } from '../../domain/ledger.js';
import { inventoryValue } from '../../domain/inventory.js';
import { productName, accountName } from '../../domain/lookup.js';
import { expenseByCategory, productPerformance, itemPrices, monthlySeries, daysIn } from '../../domain/analytics.js';
import { monthsOf } from '../../domain/period.js';
import { monthName } from '../../core/dates.js';
import { fmt, pct } from '../../core/format.js';
import { store } from '../../data/store.js';
import { csvFile } from '../../services/export.js';
import { esc, download } from '../dom.js';
import { card, grid, stat, listBox, emptyBox } from '../components.js';
import { periodBar, currentPeriod, periodText } from '../periodBar.js';
import { monthsChart } from '../views/monthsChart.js';
import { onClick } from '../actions.js';

const tone = n => (n >= 0 ? 'pos' : 'neg');

function barList(rows, color) {
  if (!rows.length) return emptyBox('لا بيانات في هذه الفترة');
  const total = rows.reduce((s, r) => s + r[1], 0), max = Math.max(1, ...rows.map(r => r[1]));
  return '<div class="card">' + rows.map(([label, value]) => `<div class="bar-r">
    <div class="bl"><span>${esc(label)}</span><b>${fmt(value)} <em>${Math.round((value / total) * 100)}%</em></b></div>
    <div class="bt"><i style="width:${(value / max) * 100}%;background:${color}"></i></div></div>`).join('') + '</div>';
}

function productRows(state, txs) {
  const rows = productPerformance(txs).map(o => `<div class="row-i"><span class="ic">🏷️</span>
    <div class="mid">${esc(productName(state, o.id))}<span>بيع ${o.qty} · هامش ${o.margin}%</span></div>
    <b class="${tone(o.profit)}">${o.profit >= 0 ? '+' : ''}${fmt(o.profit)}</b></div>`).join('');
  return rows || '<div class="empty">لا مبيعات في هذه الفترة</div>';
}

function priceRows(txs) {
  return itemPrices(txs).map(p => `<div class="row-i"><div class="mid">${esc(p.name)}
    <span>${p.count} مرات · متوسط ${fmt(p.avg)}${p.unit ? ' / ' + esc(p.unit) : ''} · آخر ${fmt(p.last)}</span></div>
    <b class="${p.change > 0 ? 'neg' : p.change < 0 ? 'pos' : ''}">${p.change ? (p.change > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(p.change)) + '%' : '—'}</b></div>`).join('');
}

function monthRows(state) {
  return monthsOf(state).map(m => {
    const x = periodSummary(state, m);
    return `<tr data-action="period-pick" data-per="${m}"><td>${monthName(m)}</td>
      <td class="pos">${fmt(x.home.income)}</td><td class="neg">${fmt(x.home.expense)}</td>
      <td class="${tone(x.invest.profit)}">${fmt(x.invest.profit)}</td></tr>`;
  }).join('');
}

export default {
  title: 'التقارير',
  ctx: null,
  render(state) {
    if (!state.tx.length)
      return periodBar(state) + '<div class="list" style="margin-top:14px"><div class="empty">ما في بيانات للتقارير بعد. أضف أول عملية من الرئيسية.</div></div>';

    const period = currentPeriod(), label = periodText();
    const txs = state.tx.filter(t => inPeriod(t.date, period));
    const s = periodSummary(state, period), h = s.home, i = s.invest;
    const left = h.income - h.expense, net = left + i.profit;
    const prices = priceRows(txs);

    return `${periodBar(state)}
    <section class="hero"><small>صافي الفترة · ${label}</small><h1>${net > 0 ? '+' : ''}${fmt(net)}</h1>
      <div class="split"><div>🏡 المتبقي من البيت<b>${fmt(left)}</b></div><div>📦 ربح الاستثمار<b>${fmt(i.profit)}</b></div></div></section>

    ${grid(card('نسبة الادخار', pct(left, h.income)) + card('متوسط مصروف البيت يومياً', fmt(h.expense / daysIn(state, period)))
      + card('هامش ربح الاستثمار', pct(i.profit, i.sales)) + card('قيمة المخزون', fmt(inventoryValue(state))))}

    <h3>آخر 6 أشهر</h3>${monthsChart(monthlySeries(state, 6))}

    <h3>🏡 البيت · ${label}</h3>
    ${listBox(stat('الدخل', fmt(h.income), 'pos') + stat('المصاريف', fmt(h.expense), 'neg') + stat('المتبقي', fmt(left), tone(left), true))}
    <h3>أين صُرف مال البيت</h3>${barList(expenseByCategory(txs, 'home'), '#DC2626')}

    <h3>📦 الاستثمار · ${label}</h3>
    ${listBox(stat('المبيعات', fmt(i.sales)) + stat('تكلفة البضاعة', fmt(i.cogs)) + stat('مصاريف الاستثمار', fmt(i.expenses), 'neg') + stat('صافي الربح', fmt(i.profit), tone(i.profit), true))}
    <h3>مصاريف الاستثمار حسب الصنف</h3>${barList(expenseByCategory(txs, 'invest'), '#F59E0B')}
    <h3>ربح كل منتج</h3>${listBox(productRows(state, txs))}
    ${prices ? `<h3>أسعار الأصناف · هل صارت أغلى؟</h3>${listBox(prices)}` : ''}

    <h3>مقارنة الأشهر · اضغط على شهر لعرضه</h3>
    <div class="list tblw"><table class="tbl"><tr><th>الشهر</th><th>دخل البيت</th><th>مصروف البيت</th><th>ربح الاستثمار</th></tr>${monthRows(state)}</table></div>

    <button class="btn alt" style="margin-top:16px" data-action="export-csv">⬇️ تصدير عمليات ${label} (CSV)</button>`;
  },
};

onClick('export-csv', () => {
  const f = csvFile(store.state, currentPeriod());
  download(f.name, f.content, f.mime);
});