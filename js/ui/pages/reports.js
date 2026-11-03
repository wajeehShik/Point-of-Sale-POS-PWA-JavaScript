import {
  periodSummary,
  inPeriod
} from '../../domain/ledger.js';

import { inventoryValue } from '../../domain/inventory.js';

import {
  productName
} from '../../domain/lookup.js';

import {
  expenseByCategory,
  productPerformance,
  itemPrices,
  monthlySeries,
  daysIn
} from '../../domain/analytics.js';

import { monthsOf } from '../../domain/period.js';
import { monthName } from '../../core/dates.js';
import { fmt, pct } from '../../core/format.js';
import { store } from '../../data/store.js';
import { csvFile } from '../../services/export.js';
import { esc, download } from '../dom.js';
import { periodBar, currentPeriod, periodText } from '../periodBar.js';
import { monthsChart } from '../views/monthsChart.js';
import { onClick } from '../actions.js';

const tone = n => (n >= 0 ? 'pos' : 'neg');

const sign = n =>
  `${n >= 0 ? '+' : ''}${fmt(n)}`;

function iconForCategory(name, index = 0) {
  const icons = ['🧾', '🛒', '🚗', '🏠', '🔥', '📦', '💳', '🔧'];
  return icons[index % icons.length];
}

function categoryRows(rows, color = 'var(--p)') {
  if (!rows.length) {
    return '<div class="empty">لا توجد مصاريف مسجلة في هذه الفترة</div>';
  }

  const total = rows.reduce(
    (sum, [, value]) => sum + value,
    0
  );

  const max = Math.max(
    1,
    ...rows.map(([, value]) => value)
  );

  return rows
    .slice(0, 7)
    .map(([label, value], index) => {
      const share =
        total > 0
          ? Math.round((value / total) * 100)
          : 0;

      const width = Math.round((value / max) * 100);

      return `
        <div class="report-category">
          <div class="report-category-head">
            <span class="report-category-name">
              <i>${iconForCategory(label, index)}</i>
              ${esc(label)}
            </span>

            <strong>
              ${fmt(value)}
              <em>${share}%</em>
            </strong>
          </div>

          <div class="report-progress">
            <i
              style="width:${width}%;background:${color}"
            ></i>
          </div>
        </div>
      `;
    })
    .join('');
}

function productRows(state, txs) {
  const rows = productPerformance(txs);

  if (!rows.length) {
    return `
      <div class="empty">
        لا توجد مبيعات مسجلة في هذه الفترة
      </div>
    `;
  }

  return rows
    .slice(0, 6)
    .map((item, index) => `
      <div class="report-product">
        <span class="report-rank">
          ${index + 1}
        </span>

        <span class="report-product-icon">
          🏷️
        </span>

        <div class="report-product-main">
          <strong>
            ${esc(productName(state, item.id))}
          </strong>

          <span>
            ${item.qty} وحدة · هامش ربح ${item.margin}%
          </span>
        </div>

        <b class="${tone(item.profit)}">
          ${sign(item.profit)}
        </b>
      </div>
    `)
    .join('');
}

function priceRows(txs) {
  const rows = itemPrices(txs);

  if (!rows.length) {
    return `
      <div class="empty">
        لا توجد بيانات أسعار قابلة للمقارنة
      </div>
    `;
  }

  return rows
    .slice(0, 6)
    .map(item => `
      <div class="report-price-row">
        <div>
          <strong>
            ${esc(item.name)}
          </strong>

          <span>
            ${item.count} عمليات · المتوسط ${fmt(item.avg)}
            ${item.unit ? ` / ${esc(item.unit)}` : ''}
          </span>
        </div>

        <b class="${
          item.change > 0
            ? 'neg'
            : item.change < 0
              ? 'pos'
              : ''
        }">
          ${
            item.change
              ? `${item.change > 0 ? '▲' : '▼'} ${
                  Math.abs(Math.round(item.change))
                }%`
              : 'ثابت'
          }
        </b>
      </div>
    `)
    .join('');
}

function monthRows(state) {
  const rows = monthsOf(state);

  if (!rows.length) {
    return `
      <tr>
        <td colspan="4" class="empty">
          لا توجد أشهر للمقارنة
        </td>
      </tr>
    `;
  }

  return rows
    .map(month => {
      const summary = periodSummary(state, month);

      return `
        <tr
          data-action="period-pick"
          data-per="${month}"
        >
          <td>
            <strong>${monthName(month)}</strong>
            <small>${month}</small>
          </td>

          <td class="pos">
            ${fmt(summary.home.income)}
          </td>

          <td class="neg">
            ${fmt(summary.home.expense)}
          </td>

          <td class="${tone(summary.invest.profit)}">
            ${fmt(summary.invest.profit)}
          </td>
        </tr>
      `;
    })
    .join('');
}

function kpi(
  label,
  value,
  helper,
  icon,
  cls = ''
) {
  return `
    <article class="report-kpi ${cls}">
      <span class="report-kpi-icon">
        ${icon}
      </span>

      <div>
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${helper}</small>
      </div>
    </article>
  `;
}

export default {
  title: 'التقارير',

  ctx: null,

  render(state) {
    if (!state.tx.length) {
      return `
        <div class="reports-empty">
          ${periodBar(state)}

          <div class="report-empty-card">
            <span>📊</span>

            <h2>
              التقرير سيظهر هنا
            </h2>

            <p>
              أضف أول عملية مالية حتى نعرض لك
              الملخص، المصاريف، المبيعات، والأرباح
              في مكان واحد.
            </p>

            <a href="#/dashboard">
              العودة إلى الرئيسية
            </a>
          </div>
        </div>
      `;
    }

    const period = currentPeriod();
    const label = periodText();

    const txs = state.tx.filter(t =>
      inPeriod(t.date, period)
    );

    const summary = periodSummary(
      state,
      period
    );

    const home = summary.home;
    const invest = summary.invest;

    const homeLeft =
      home.income - home.expense;

    const net =
      homeLeft + invest.profit;

    const savingRate =
      home.income > 0
        ? Math.round(
            (homeLeft / home.income) * 100
          )
        : 0;

    const dailyExpense =
      home.expense /
      daysIn(state, period);

    const salesCount = txs.filter(
      t => t.type === 'sale'
    ).length;

    const expenseCount = txs.filter(
      t => t.type === 'expense'
    ).length;

    const topExpense =
      expenseByCategory(txs, 'home')[0];

    const prices = priceRows(txs);

    return `
      <div class="reports-shell">

        <div class="report-toolbar">
          <div>
            <span class="eyebrow">
              <i></i>
              مركز مالي موحّد
            </span>

            <h1>
              التقارير والتحليلات
            </h1>

            <p>
              قراءة سريعة وواضحة لأداء أموالك خلال
              <b>${esc(label)}</b>
            </p>
          </div>

          <button
            class="report-export"
            data-action="export-csv"
            aria-label="تصدير التقرير"
          >
            <span>↥</span>
            <b>تصدير</b>
          </button>
        </div>

        ${periodBar(state)}

        <nav
          class="report-tabs"
          aria-label="أقسام التقرير"
        >
          <a href="#report-overview">
            نظرة عامة
          </a>

          <a href="#report-home">
            البيت
          </a>

          <a href="#report-invest">
            الاستثمار
          </a>

          <a href="#report-products">
            المنتجات
          </a>
        </nav>

        <section
          id="report-overview"
          class="report-hero"
        >
          <div class="report-hero-glow"></div>

          <div class="report-hero-top">
            <div>
              <span>
                صافي الأداء خلال الفترة
              </span>

              <h2 class="${tone(net)}">
                ${sign(net)}
              </h2>

              <p>
                المتبقي من البيت + صافي ربح الاستثمار
              </p>
            </div>

            <span class="report-score">
              ${
                savingRate >= 20
                  ? 'أداء جيد'
                  : 'يحتاج متابعة'
              }

              <i>●</i>
            </span>
          </div>

          <div class="report-hero-split">
            <div>
              <span>المتبقي من البيت</span>
              <strong>${fmt(homeLeft)}</strong>
            </div>

            <div>
              <span>ربح الاستثمار</span>
              <strong class="${tone(invest.profit)}">
                ${fmt(invest.profit)}
              </strong>
            </div>

            <div>
              <span>قيمة المخزون</span>
              <strong>
                ${fmt(inventoryValue(state))}
              </strong>
            </div>
          </div>
        </section>

        <section class="report-kpis">
          ${kpi(
            'نسبة الادخار',
            `${savingRate}%`,
            'من دخل البيت',
            '◒',
            savingRate >= 0
              ? 'kpi-green'
              : 'kpi-red'
          )}

          ${kpi(
            'متوسط الصرف',
            fmt(dailyExpense),
            'لكل يوم',
            '↘',
            'kpi-red'
          )}

          ${kpi(
            'هامش الاستثمار',
            pct(invest.profit, invest.sales),
            `${salesCount} عملية بيع`,
            '↗',
            'kpi-blue'
          )}

          ${kpi(
            'حركة الفترة',
            txs.length,
            `${expenseCount} مصروف · ${salesCount} بيع`,
            '⌁',
            'kpi-purple'
          )}
        </section>

        <section
          class="report-section report-chart-section"
        >
          <div class="report-section-head">
            <div>
              <span class="section-kicker">
                التدفق المالي
              </span>

              <h2>
                الدخل والمصاريف والأرباح
              </h2>

              <p>
                مقارنة آخر ستة أشهر المسجلة
              </p>
            </div>

            <span class="section-badge">
              تحليل زمني
            </span>
          </div>

          ${monthsChart(monthlySeries(state, 6))}
        </section>

        <div class="report-columns">

          <section
            id="report-home"
            class="report-section"
          >
            <div class="report-section-head">
              <div>
                <span class="section-kicker green">
                  قسم البيت
                </span>

                <h2>
                  أين يذهب المال؟
                </h2>

                <p>
                  ${
                    topExpense
                      ? `أعلى بند: ${esc(topExpense[0])}`
                      : 'توزيع مصاريف البيت'
                  }
                </p>
              </div>

              <span class="section-icon">
                🏡
              </span>
            </div>

            <div class="report-mini-summary">
              <span>
                الدخل
                <b class="pos">
                  ${fmt(home.income)}
                </b>
              </span>

              <span>
                المصاريف
                <b class="neg">
                  ${fmt(home.expense)}
                </b>
              </span>
            </div>

            <div class="report-breakdown">
              ${categoryRows(
                expenseByCategory(txs, 'home'),
                'var(--danger)'
              )}
            </div>
          </section>

          <section
            id="report-invest"
            class="report-section"
          >
            <div class="report-section-head">
              <div>
                <span class="section-kicker amber">
                  قسم الاستثمار
                </span>

                <h2>
                  هل الاستثمار مربح؟
                </h2>

                <p>
                  ملخص المبيعات والتكلفة والربح
                </p>
              </div>

              <span class="section-icon">
                📦
              </span>
            </div>

            <div class="report-invest-stats">
              <div>
                <span>المبيعات</span>
                <b>${fmt(invest.sales)}</b>
              </div>

              <div>
                <span>تكلفة البضاعة</span>
                <b>${fmt(invest.cogs)}</b>
              </div>

              <div>
                <span>المصاريف</span>
                <b class="neg">
                  ${fmt(invest.expenses)}
                </b>
              </div>

              <div class="highlight">
                <span>صافي الربح</span>
                <b class="${tone(invest.profit)}">
                  ${fmt(invest.profit)}
                </b>
              </div>
            </div>

            <div class="report-breakdown">
              ${categoryRows(
                expenseByCategory(txs, 'invest'),
                'var(--warn)'
              )}
            </div>
          </section>
        </div>

        <div
          id="report-products"
          class="report-columns"
        >
          <section class="report-section">
            <div class="report-section-head">
              <div>
                <span class="section-kicker blue">
                  الأداء التجاري
                </span>

                <h2>
                  المنتجات الأكثر ربحًا
                </h2>

                <p>
                  ترتيب المنتجات حسب صافي الربح
                </p>
              </div>

              <span class="section-icon">
                🏷️
              </span>
            </div>

            <div class="report-products">
              ${productRows(state, txs)}
            </div>
          </section>

          <section class="report-section">
            <div class="report-section-head">
              <div>
                <span class="section-kicker purple">
                  مراقبة الأسعار
                </span>

                <h2>
                  هل الأسعار تتغير؟
                </h2>

                <p>
                  آخر سعر مقابل متوسط الشراء
                </p>
              </div>

              <span class="section-icon">
                ⌁
              </span>
            </div>

            <div class="report-prices">
              ${prices}
            </div>
          </section>
        </div>

        <section
          class="report-section report-months"
        >
          <div class="report-section-head">
            <div>
              <span class="section-kicker">
                المقارنة
              </span>

              <h2>
                ملخص الأشهر
              </h2>

              <p>
                اضغط على أي شهر لعرض تقريره
              </p>
            </div>

            <span class="section-badge">
              ${monthsOf(state).length} أشهر
            </span>
          </div>

          <div
            class="list tblw report-table-wrap"
          >
            <table class="tbl report-table">
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>دخل البيت</th>
                  <th>مصروف البيت</th>
                  <th>ربح الاستثمار</th>
                </tr>
              </thead>

              <tbody>
                ${monthRows(state)}
              </tbody>
            </table>
          </div>
        </section>

        <button
          class="btn alt report-export-bottom"
          data-action="export-csv"
        >
          ⬇️ تصدير عمليات ${esc(label)} بصيغة CSV
        </button>
      </div>
    `;
  },
};

onClick('export-csv', () => {
  const file = csvFile(
    store.state,
    currentPeriod()
  );

  download(
    file.name,
    file.content,
    file.mime
  );
});
