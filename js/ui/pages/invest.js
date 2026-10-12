
/**
 * balances: حساب الأرصدة الحالية للأموال.
 * periodSummary: حساب ملخص العمليات خلال الفترة المحددة.
 */
import {
  balances,
  periodSummary
} from '../../domain/ledger.js';

/**
 * حساب القيمة الإجمالية للمخزون الموجود حاليًا.
 */
import { inventoryValue } from '../../domain/inventory.js';

/**
 * fmt: تنسيق المبالغ المالية.
 * pct: حساب نسبة مئوية وعرضها بتنسيق مناسب.
 */
import {
  fmt,
  pct
} from '../../core/format.js';

/**
 * أدوات بناء بطاقات الإحصائيات وترتيبها في شبكة.
 */
import {
  card,
  grid
} from '../components.js';

/**
 * شريط اختيار الفترة الحالية والحصول على الفترة المختارة.
 */
import {
  periodBar,
  currentPeriod
} from '../periodBar.js';

/**
 * عرض العمليات التابعة لقسم الاستثمار.
 */
import { opsBlock } from '../opsView.js';

/**
 * مكونات إضافية لعرض تفاصيل الاستثمار:
 * التدفق النقدي، والمورّدون، والمنتجات.
 */
import { cashFlowView } from '../views/cashFlowView.js';
import { suppliersSection } from '../views/suppliersView.js';
import { productsSection } from '../views/productsView.js';

export default {
  // عنوان الصفحة.
  title: 'الاستثمار',

  // ربط الصفحة بقسم الاستثمار في التطبيق.
  ctx: 'invest',

  /**
   * إنشاء واجهة صفحة الاستثمار.
   * state تحتوي على بيانات التطبيق الحالية.
   */
  render(state) {

    // حساب الأرصدة الحالية، ثم استخراج رصيد الاستثمار النقدي.
    const b = balances(state);

    // حساب ملخص عمليات الاستثمار للفترة المختارة.
    const m = periodSummary(state, currentPeriod()).invest;

    // حساب ربح المبيعات قبل خصم المصروفات:
    // إجمالي المبيعات - تكلفة المنتجات المباعة.
    const gross = m.sales - m.cogs;

    /**
     * تحديد فئة CSS حسب قيمة الربح:
     * pos: ربح موجب أو صفر.
     * neg: نتيجة سالبة.
     */
    const tone = n => (n >= 0 ? 'pos' : 'neg');

    return `
      <!-- عرض الرصيد النقدي الحالي لقسم الاستثمار -->
      <section class="hero">
        <small>رصيد الاستثمار (نقد)</small>
        <h1>${fmt(b.invest)}</h1>
      </section>

      <!-- اختيار الفترة المستخدمة في الإحصائيات -->
      ${periodBar(state)}

      <!-- بطاقات ملخص النشاط التجاري -->
      ${grid(

        // القيمة الحالية للمنتجات الموجودة في المخزون.
        card(
          'قيمة المخزون',
          fmt(inventoryValue(state))
        )

        // إجمالي المشتريات خلال الفترة المختارة.
        + card(
          'المشتريات',
          fmt(m.purchases)
        )

        // إجمالي المبيعات خلال الفترة المختارة.
        + card(
          'المبيعات',
          fmt(m.sales)
        )

        // تكلفة المنتجات التي تم بيعها خلال الفترة.
        + card(
          'تكلفة المباع',
          fmt(m.cogs)
        )

        // المصروفات التشغيلية للاستثمار.
        + card(
          'المصاريف',
          fmt(m.expenses),
          'neg'
        )

        // نسبة الربح إلى المبيعات وفق حساب m.profit.
        + card(
          'هامش الربح',
          pct(m.profit, m.sales)
        )

        // ربح المبيعات قبل خصم المصروفات التشغيلية.
        + card(
          'ربح المبيعات (قبل المصاريف)',
          fmt(gross),
          tone(gross),
          'hl'
        )

        // صافي الربح بعد خصم المصروفات.
        + card(
          'صافي الربح (بعد المصاريف)',
          fmt(m.profit),
          tone(m.profit),
          'hl'
        )
      )}

      <!-- تفاصيل حركة الأموال الداخلة والخارجة -->
      ${cashFlowView(state)}

      <!-- قسم متابعة المبالغ المستحقة للمورّدين -->
      ${suppliersSection(state)}

      <!-- قسم المنتجات وإدارة المخزون -->
      ${productsSection(state)}

      <!-- قائمة عمليات الاستثمار -->
      <h3>العمليات</h3>
      ${opsBlock(state, 'invest')}
    `;
  },
};
