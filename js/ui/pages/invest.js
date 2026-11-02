import {
  balances,
  periodSummary
} from '../../domain/ledger.js';

import {
  inventoryValue
} from '../../domain/inventory.js';

import {
  fmt,
  pct
} from '../../core/format.js';

import {
  card,
  grid
} from '../components.js';

import {
  periodBar,
  currentPeriod
} from '../periodBar.js';

import { opsBlock } from '../opsView.js';

import { cashFlowView } from '../views/cashFlowView.js';
import { suppliersSection } from '../views/suppliersView.js';
import { productsSection } from '../views/productsView.js';

/*
|--------------------------------------------------------------------------
| حساب رأس المال المدخل كاملًا منذ بداية المشروع
|--------------------------------------------------------------------------
|
| رأس المال الأساسي لا يعتمد على الفلتر.
|
| يتم جمع:
| 1. الإيرادات التي سجلتها في قسم الاستثمار
|    ومصدرها "رأس مال جديد".
|
| 2. التحويلات الداخلة إلى الاستثمار.
|
| لا نطرح من هذه القيمة.
*/
function capitalTotal(state) {
  let total = 0;

  for (const t of state.tx) {
    /*
     * إيراد رأس مال جديد من الصفحة الرئيسية
     */
    if (
      t.type === 'income' &&
      t.sector === 'invest' &&
      t.category === 'رأس مال جديد'
    ) {
      total += Number(t.amount) || 0;
    }

    /*
     * إذا نقلت مبلغًا من البيت إلى الاستثمار
     */
    if (
      t.type === 'transfer' &&
      t.toSector === 'invest'
    ) {
      total += Number(t.amount) || 0;
    }
  }

  return Math.round(total * 100) / 100;
}


export default {
  title: 'الاستثمار',

  ctx: 'invest',

  render(state) {
    /*
     * هذا هو رصيد الاستثمار الحالي الأصلي
     *
     * مثال:
     * رأس مال 200
     * مشتريات 160
     * الرصيد الحالي = 40
     */
    const b = balances(state);

    /*
     * ملخص العمليات للفترة المختارة
     */
    const m =
      periodSummary(
        state,
        currentPeriod()
      ).invest;

    /*
     * رأس المال الكامل منذ البداية
     *
     * لا يتأثر بالفلتر
     * ولا يتم طرح المصاريف أو المشتريات منه
     */
    const capital = capitalTotal(state);

    /*
     * الربح قبل خصم المصاريف
     */
    const gross =
      m.sales - m.cogs;

    /*
     * تحديد لون الربح
     */
    const tone = n =>
      n >= 0 ? 'pos' : 'neg';

    return `
      <!-- رصيد الاستثمار المتبقي -->
      <section class="hero">
        <small>رصيد الاستثمار المتبقي</small>
        <h1>${fmt(b.invest)}</h1>
      </section>

      <!-- فلتر الفترة -->
      ${periodBar(state)}

      <!-- البطاقات -->
      ${grid(

        /*
         * رأس المال الأساسي الكامل
         *
         * لا يتغير عند اختيار شهر أو فترة
         */
        card(
          'رأس المال الأساسي',
          fmt(capital),
          'pos'
        )

        /*
         * قيمة المخزون الحالية
         */
        + card(
          'قيمة المخزون',
          fmt(inventoryValue(state))
        )

        /*
         * المشتريات حسب الفترة المختارة
         */
        + card(
          'المشتريات',
          fmt(m.purchases)
        )

        /*
         * المبيعات حسب الفترة المختارة
         */
        + card(
          'المبيعات',
          fmt(m.sales)
        )

        /*
         * تكلفة المنتجات المباعة
         */
        + card(
          'تكلفة المباع',
          fmt(m.cogs)
        )

        /*
         * المصاريف حسب الفترة المختارة
         */
        + card(
          'المصاريف',
          fmt(m.expenses),
          'neg'
        )

        /*
         * هامش الربح
         */
        + card(
          'هامش الربح',
          pct(m.profit, m.sales)
        )

        /*
         * ربح المبيعات قبل المصاريف
         */
        + card(
          'ربح المبيعات (قبل المصاريف)',
          fmt(gross),
          tone(gross),
          'hl'
        )

        /*
         * صافي الربح بعد المصاريف
         */
        + card(
          'صافي الربح (بعد المصاريف)',
          fmt(m.profit),
          tone(m.profit),
          'hl'
        )
      )}

      <!-- شرح الحساب -->
      <details class="det">
        <summary>كيف انحسب رأس المال ورصيد الاستثمار؟</summary>

        <div class="list">
          <div class="stat">
            <span>رأس المال المدخل كاملًا</span>
            <b class="pos">${fmt(capital)}</b>
          </div>

          <div class="stat">
            <span>رصيد الاستثمار المتبقي</span>
            <b>${fmt(b.invest)}</b>
          </div>

          <div class="stat">
            <span>ملاحظة</span>
            <b>
              رأس المال لا ينقص، لكن رصيد الاستثمار ينقص بالمشتريات والمصاريف
            </b>
          </div>
        </div>
      </details>

      <!-- تفاصيل حركة الأموال -->
      ${cashFlowView(state)}

      <!-- الموردون -->
      ${suppliersSection(state)}

      <!-- المنتجات والمخزون -->
      ${productsSection(state)}

      <!-- عمليات الاستثمار -->
      <h3>العمليات</h3>
      ${opsBlock(state, 'invest')}
    `;
  },
};
