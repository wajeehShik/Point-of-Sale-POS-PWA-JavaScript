
/**
 * periodSummary: حساب ملخص الدخل والمصروفات والأرباح لفترة.
 * inPeriod: التحقق من أن تاريخ العملية يقع داخل الفترة المحددة.
 */
import {
  periodSummary,
  inPeriod
} from '../../domain/ledger.js';

/**
 * حساب القيمة الحالية للمخزون.
 */
import { inventoryValue } from '../../domain/inventory.js';

/**
 * productName: الحصول على اسم المنتج من معرّفه.
 * accountName: الحصول على اسم الحساب من معرّفه.
 */
import {
  productName,
  accountName
} from '../../domain/lookup.js';

/**
 * دوال تحليل البيانات:
 * expenseByCategory: تجميع المصروفات حسب الصنف.
 * productPerformance: تحليل أرباح المنتجات.
 * itemPrices: تحليل أسعار الأصناف وتغيرها.
 * monthlySeries: تجهيز بيانات الأشهر للرسم البياني.
 * daysIn: حساب عدد الأيام في الفترة.
 */
import {
  expenseByCategory,
  productPerformance,
  itemPrices,
  monthlySeries,
  daysIn
} from '../../domain/analytics.js';

/**
 * الحصول على الأشهر التي تحتوي على عمليات مسجلة.
 */
import { monthsOf } from '../../domain/period.js';

/**
 * تحويل قيمة الشهر إلى اسم مفهوم للمستخدم.
 */
import { monthName } from '../../core/dates.js';

/**
 * تنسيق المبالغ المالية وحساب النسب المئوية.
 */
import {
  fmt,
  pct
} from '../../core/format.js';

/**
 * الوصول إلى حالة التطبيق الحالية، ومنها العمليات.
 */
import { store } from '../../data/store.js';

/**
 * إنشاء ملف CSV يحتوي على العمليات.
 */
import { csvFile } from '../../services/export.js';

/**
 * esc: حماية النصوص عند إدخالها داخل HTML.
 * download: تنزيل ملف على جهاز المستخدم.
 */
import {
  esc,
  download
} from '../dom.js';

/**
 * مكونات واجهة جاهزة:
 * card: بطاقة إحصائية.
 * grid: شبكة بطاقات.
 * stat: صف إحصائي.
 * listBox: صندوق قائمة.
 * emptyBox: واجهة تظهر عند عدم وجود بيانات.
 */
import {
  card,
  grid,
  stat,
  listBox,
  emptyBox
} from '../components.js';

/**
 * أدوات اختيار الفترة وعرض اسمها.
 */
import {
  periodBar,
  currentPeriod,
  periodText
} from '../periodBar.js';

/**
 * إنشاء الرسم البياني لمقارنة الأشهر.
 */
import { monthsChart } from '../views/monthsChart.js';

/**
 * ربط حدث النقر بزر أو عنصر يحمل الإجراء المحدد.
 */
import { onClick } from '../actions.js';

/**
 * تحديد فئة CSS المناسبة للرقم:
 * pos للأرباح الموجبة أو الصفر.
 * neg للقيم السالبة.
 */
const tone = n => (n >= 0 ? 'pos' : 'neg');

/**
 * إنشاء قائمة أشرطة لعرض القيم ومقارنتها بصريًا.
 *
 * rows: مصفوفة من البيانات بالشكل:
 * [[اسم الصنف، القيمة]، ...]
 *
 * color: لون الأشرطة.
 */
function barList(rows, color) {

  // إذا لم توجد بيانات، نعرض رسالة بدل الرسم.
  if (!rows.length) {
    return emptyBox('لا بيانات في هذه الفترة');
  }

  // جمع القيم لحساب النسبة التي يمثلها كل صنف.
  const total = rows.reduce(
    (s, r) => s + r[1],
    0
  );

  // إيجاد أكبر قيمة لاستخدامها في تحديد أطوال الأشرطة.
  // نستخدم 1 كحد أدنى لتجنب القسمة على صفر هنا.
  const max = Math.max(
    1,
    ...rows.map(r => r[1])
  );

  return '<div class="card">'
    + rows.map(([label, value]) => `
      <div class="bar-r">

        <!-- اسم الصنف وقيمته ونسبته من مجموع القيم -->
        <div class="bl">
          <span>${esc(label)}</span>

          <b>
            ${fmt(value)}
            <em>${Math.round((value / total) * 100)}%</em>
          </b>
        </div>

        <!-- الشريط المرئي الذي يمثل حجم القيمة -->
        <div class="bt">
          <i style="
            width:${(value / max) * 100}%;
            background:${color}
          "></i>
        </div>

      </div>
    `).join('')
    + '</div>';
}

/**
 * إنشاء صفوف توضح أداء المنتجات في الفترة المختارة.
 *
 * state: بيانات التطبيق اللازمة للحصول على أسماء المنتجات.
 * txs: العمليات التي تقع داخل الفترة المختارة.
 */
function productRows(state, txs) {

  // تحليل المبيعات حسب المنتج، ثم تحويل النتائج إلى HTML.
  const rows = productPerformance(txs)
    .map(o => `
      <div class="row-i">

        <!-- أيقونة المنتج -->
        <span class="ic">🏷️</span>

        <div class="mid">

          <!-- اسم المنتج -->
          ${esc(productName(state, o.id))}

          <!-- الكمية المباعة وهامش الربح -->
          <span>
            بيع ${o.qty} · هامش ${o.margin}%
          </span>

        </div>

        <!-- الربح مع علامة + إذا كان موجبًا -->
        <b class="${tone(o.profit)}">
          ${o.profit >= 0 ? '+' : ''}${fmt(o.profit)}
        </b>

      </div>
    `)
    .join('');

  // إذا لم تنتج عملية التحليل أي صفوف، نعرض رسالة.
  return rows || '<div class="empty">لا مبيعات في هذه الفترة</div>';
}

/**
 * إنشاء قائمة لتحليل أسعار الأصناف التي ظهرت في العمليات.
 *
 * txs: العمليات خلال الفترة المحددة.
 */
function priceRows(txs) {

  // تحليل الأسعار، ثم عرض عدد مرات الشراء والمتوسط وآخر سعر.
  return itemPrices(txs)
    .map(p => `
      <div class="row-i">

        <div class="mid">

          <!-- اسم الصنف -->
          ${esc(p.name)}

          <span>
            ${p.count} مرات

            <!-- متوسط السعر -->
            · متوسط ${fmt(p.avg)}

            <!-- إظهار الوحدة إن كانت متوفرة -->
            ${p.unit ? ' / ' + esc(p.unit) : ''}

            <!-- آخر سعر مسجل -->
            · آخر ${fmt(p.last)}
          </span>

        </div>

        <!--
          إذا ارتفع السعر نعرض سهمًا للأعلى وفئة neg.
          إذا انخفض نعرض سهمًا للأسفل وفئة pos.
          إذا لم يتغير، نعرض شرطة.
        -->
        <b class="${
          p.change > 0
            ? 'neg'
            : p.change < 0
              ? 'pos'
              : ''
        }">
          ${
            p.change
              ? (p.change > 0 ? '▲ ' : '▼ ')
                + Math.abs(Math.round(p.change))
                + '%'
              : '—'
          }
        </b>

      </div>
    `)
    .join('');
}

/**
 * إنشاء صف لكل شهر للمقارنة بين النتائج الشهرية.
 *
 * state: بيانات التطبيق التي تُستخدم لحساب ملخص كل شهر.
 */
function monthRows(state) {

  // المرور على الأشهر التي تحتوي على بيانات.
  return monthsOf(state)
    .map(m => {

      // حساب ملخص الشهر الحالي.
      const x = periodSummary(state, m);

      return `
        <!-- عند النقر على الصف، يُطلب عرض هذا الشهر -->
        <tr data-action="period-pick" data-per="${m}">

          <!-- اسم الشهر -->
          <td>${monthName(m)}</td>

          <!-- دخل البيت -->
          <td class="pos">
            ${fmt(x.home.income)}
          </td>

          <!-- مصروف البيت -->
          <td class="neg">
            ${fmt(x.home.expense)}
          </td>

          <!-- ربح الاستثمار، مع تحديد لونه حسب القيمة -->
          <td class="${tone(x.invest.profit)}">
            ${fmt(x.invest.profit)}
          </td>

        </tr>
      `;
    })
    .join('');
}

export default {
  // عنوان الصفحة.
  title: 'التقارير',

  // التقارير تشمل البيت والاستثمار، فلا ترتبط بقسم واحد.
  ctx: null,

  /**
   * بناء صفحة التقارير.
   */
  render(state) {

    // إذا لم توجد أي عمليات، لا داعي لعرض تقارير فارغة.
    if (!state.tx.length) {
      return periodBar(state)
        + `
          <div class="list" style="margin-top:14px">
            <div class="empty">
              ما في بيانات للتقارير بعد.
              أضف أول عملية من الرئيسية.
            </div>
          </div>
        `;
    }

    // الحصول على الفترة المحددة واسمها المعروض.
    const period = currentPeriod();
    const label = periodText();

    // تصفية العمليات بحيث تشمل الفترة المحددة فقط.
    const txs = state.tx.filter(
      t => inPeriod(t.date, period)
    );

    // حساب ملخص الدخل والمصروفات والأرباح للفترة.
    const s = periodSummary(state, period);

    // استخراج بيانات البيت.
    const h = s.home;

    // استخراج بيانات الاستثمار.
    const i = s.invest;

    // حساب المتبقي من دخل البيت بعد خصم مصروفاته.
    const left = h.income - h.expense;

    // صافي الفترة حسب منطق التطبيق:
    // المتبقي من البيت + ربح الاستثمار.
    const net = left + i.profit;

    // تجهيز قائمة تحليل الأسعار.
    const prices = priceRows(txs);

    return `
      <!-- شريط اختيار الفترة -->
      ${periodBar(state)}

      <!-- ملخص صافي الفترة المالية -->
      <section class="hero">

        <small>صافي الفترة · ${label}</small>

        <!-- إضافة علامة + إذا كان الصافي موجبًا -->
        <h1>
          ${net > 0 ? '+' : ''}${fmt(net)}
        </h1>

        <div class="split">

          <!-- المتبقي من دخل البيت -->
          <div>
            🏡 المتبقي من البيت
            <b>${fmt(left)}</b>
          </div>

          <!-- ربح الاستثمار -->
          <div>
            📦 ربح الاستثمار
            <b>${fmt(i.profit)}</b>
          </div>

        </div>
      </section>

      <!-- مؤشرات مالية إضافية -->
      ${grid(

        // نسبة الادخار: المتبقي مقارنة بدخل البيت.
        card(
          'نسبة الادخار',
          pct(left, h.income)
        )

        // متوسط مصروف البيت لكل يوم في الفترة.
        + card(
          'متوسط مصروف البيت يومياً',
          fmt(h.expense / daysIn(state, period))
        )

        // هامش ربح الاستثمار وفق دالة pct.
        + card(
          'هامش ربح الاستثمار',
          pct(i.profit, i.sales)
        )

        // القيمة الحالية للمخزون.
        + card(
          'قيمة المخزون',
          fmt(inventoryValue(state))
        )
      )}

      <!-- رسم بياني لبيانات آخر ستة أشهر -->
      <h3>آخر 6 أشهر</h3>
      ${monthsChart(monthlySeries(state, 6))}

      <!-- تقرير البيت للفترة المختارة -->
      <h3>🏡 البيت · ${label}</h3>

      ${listBox(
        // عرض دخل البيت ومصروفاته والمتبقي.
        stat('الدخل', fmt(h.income), 'pos')
        + stat('المصاريف', fmt(h.expense), 'neg')
        + stat(
          'المتبقي',
          fmt(left),
          tone(left),
          true
        )
      )}

      <!-- تحليل توزيع مصروفات البيت حسب الصنف -->
      <h3>أين صُرف مال البيت</h3>
      ${barList(
        expenseByCategory(txs, 'home'),
        '#DC2626'
      )}

      <!-- تقرير الاستثمار للفترة المختارة -->
      <h3>📦 الاستثمار · ${label}</h3>

      ${listBox(
        // إجمالي المبيعات.
        stat('المبيعات', fmt(i.sales))

        // تكلفة البضاعة المباعة.
        + stat('تكلفة البضاعة', fmt(i.cogs))

        // مصروفات الاستثمار.
        + stat('مصاريف الاستثمار', fmt(i.expenses), 'neg')

        // صافي ربح الاستثمار.
        + stat(
          'صافي الربح',
          fmt(i.profit),
          tone(i.profit),
          true
        )
      )}

      <!-- تحليل مصروفات الاستثمار حسب الصنف -->
      <h3>مصاريف الاستثمار حسب الصنف</h3>
      ${barList(
        expenseByCategory(txs, 'invest'),
        '#F59E0B'
      )}

      <!-- عرض أداء كل منتج وأرباحه -->
      <h3>ربح كل منتج</h3>
      ${listBox(productRows(state, txs))}

      <!--
        عرض قسم تحليل الأسعار فقط إذا أعادت priceRows
        محتوى غير فارغ.
      -->
      ${
        prices
          ? `<h3>أسعار الأصناف · هل صارت أغلى؟</h3>
             ${listBox(prices)}`
          : ''
      }

      <!-- جدول مقارنة الأشهر؛ النقر على الشهر يختاره -->
      <h3>مقارنة الأشهر · اضغط على شهر لعرضه</h3>

      <div class="list tblw">
        <table class="tbl">

          <!-- عناوين أعمدة الجدول -->
          <tr>
            <th>الشهر</th>
            <th>دخل البيت</th>
            <th>مصروف البيت</th>
            <th>ربح الاستثمار</th>
          </tr>

          <!-- صفوف الأشهر التي تحتوي على بيانات -->
          ${monthRows(state)}

        </table>
      </div>

      <!-- زر تصدير عمليات الفترة إلى ملف CSV -->
      <button
        class="btn alt"
        style="margin-top:16px"
        data-action="export-csv"
      >
        ⬇️ تصدير عمليات ${label} (CSV)
      </button>
    `;
  },
};

/**
 * ربط زر التصدير بإجراء تنزيل الملف.
 *
 * عند النقر:
 * 1. نجهز ملف CSV من بيانات التطبيق والفترة الحالية.
 * 2. نأخذ اسم الملف ومحتواه ونوعه.
 * 3. ننزله على جهاز المستخدم.
 */
onClick('export-csv', () => {

  // تجهيز بيانات الملف للفترة المختارة.
  const f = csvFile(
    store.state,
    currentPeriod()
  );

  // تنزيل الملف باستخدام بياناته الجاهزة.
  download(
    f.name,
    f.content,
    f.mime
  );
});
