
/**
 * balances: حساب الأرصدة الحالية للأموال والحسابات والأقسام.
 * periodSummary: حساب ملخص العمليات خلال فترة زمنية محددة.
 */
import {
  balances,
  periodSummary
} from '../../domain/ledger.js';

/**
 * بيانات الأقسام، مثل قسم البيت وقسم الاستثمار،
 * بما فيها أسماء الأقسام والأيقونات.
 */
import { SECTORS } from '../../core/constants.js';

/**
 * تنسيق الأرقام والمبالغ المالية للعرض.
 */
import { fmt } from '../../core/format.js';

/**
 * حماية النصوص عند إدخالها داخل HTML.
 */
import { esc } from '../dom.js';

/**
 * مكونات جاهزة لبناء بطاقات الإحصائيات
 * والشبكات وصناديق القوائم.
 */
import {
  card,
  grid,
  listBox
} from '../components.js';

/**
 * أدوات اختيار الفترة المالية وعرض اسم الفترة الحالية.
 */
import {
  periodBar,
  currentPeriod,
  periodText
} from '../periodBar.js';

/**
 * عرض جميع العمليات وإنشاء مربع البحث فيها.
 */
import {
  allOpsList,
  searchBox
} from '../opsView.js';

/**
 * إرجاع اسم CSS للفئة التي تميّز الرصيد السالب.
 * إذا كان الرقم سالبًا نستخدم class باسم neg،
 * وإذا كان صفرًا أو موجبًا نرجع نصًا فارغًا.
 */
const neg = n => (n < 0 ? 'neg' : '');

/**
 * إنشاء صف يعرض بيانات محفظة واحدة.
 *
 * acc: بيانات الحساب، مثل اسمه ومعرّفه.
 * w: أرصدة الحساب الإجمالية وأرصدته حسب القسم.
 */
const walletRow = (acc, w) => `
  <div class="wal">

    <!-- اسم المحفظة ورصيدها الإجمالي -->
    <div class="top">
      <span>${esc(acc.name)}</span>
      <b class="${neg(w.total)}">${fmt(w.total)}</b>
    </div>

    <!-- توزيع رصيد المحفظة بين البيت والاستثمار -->
    <div class="sub">

      <!-- رصيد قسم البيت داخل هذه المحفظة -->
      <span>
        ${SECTORS.home.icon}
        ${SECTORS.home.label}
        <b class="${neg(w.home)}">${fmt(w.home)}</b>
      </span>

      <!-- رصيد قسم الاستثمار داخل هذه المحفظة -->
      <span>
        ${SECTORS.invest.icon}
        ${SECTORS.invest.label}
        <b class="${neg(w.invest)}">${fmt(w.invest)}</b>
      </span>

    </div>
  </div>
`;

export default {
  // عنوان الصفحة الذي يمكن استخدامه في التنقل أو الواجهة.
  title: 'الرئيسية',

  // لا ترتبط الصفحة افتراضيًا بقسم محدد.
  ctx: null,

  /**
   * بناء الصفحة الرئيسية اعتمادًا على بيانات التطبيق.
   *
   * state: الحالة الحالية التي تحتوي على الحسابات والعمليات
   * والبيانات التي تحتاجها دوال الحساب.
   */
  render(state) {
    // حساب الأرصدة الحالية لجميع الأموال والحسابات.
    const b = balances(state);

    // حساب ملخص العمليات للفترة التي اختارها المستخدم.
    const s = periodSummary(state, currentPeriod());

    // اختصار الوصول إلى ملخص قسم البيت.
    const h = s.home;

    // اختصار الوصول إلى ملخص قسم الاستثمار.
    const i = s.invest;

    return `
      <!-- القسم الرئيسي الذي يعرض إجمالي الأموال الحالية -->
      <section class="hero">

        <small>إجمالي الأموال</small>

        <!-- الرصيد الإجمالي لجميع الأموال -->
        <h1>${fmt(b.total)}</h1>

        <!-- تقسيم الإجمالي حسب الأقسام -->
        <div class="split">

          <!-- إجمالي رصيد قسم البيت -->
          <div>
            ${SECTORS.home.icon}
            ${SECTORS.home.label}
            <b>${fmt(b.home)}</b>
          </div>

          <!-- إجمالي رصيد قسم الاستثمار -->
          <div>
            ${SECTORS.invest.icon}
            ${SECTORS.invest.label}
            <b>${fmt(b.invest)}</b>
          </div>

        </div>
      </section>

      <!-- شريط اختيار الفترة الزمنية للملخص -->
      ${periodBar(state)}

      <!-- عنوان ملخص الفترة المختارة -->
      <h3>ملخص · ${periodText()}</h3>

      <!-- بطاقات الإحصائيات المالية -->
      ${grid(
        // دخل البيت خلال الفترة المختارة.
        card('دخل البيت', fmt(h.income), 'pos')

        // مصروفات البيت خلال الفترة المختارة.
        + card('مصروف البيت', fmt(h.expense), 'neg')

        // إجمالي مبيعات قسم الاستثمار.
        + card('مبيعات الاستثمار', fmt(i.sales))

        // ربح الاستثمار، مع تمييز الربح عن الخسارة.
        + card(
          'ربح الاستثمار',
          fmt(i.profit),
          i.profit >= 0 ? 'pos' : 'neg'
        ),

        // إزالة الهامش العلوي الافتراضي للشبكة.
        'margin-top:0'
      )}

      <!-- قائمة المحافظ والأرصدة الفعلية -->
      <h3>المحافظ · الرصيد الفعلي وتوزيعه</h3>

      ${listBox(
        // إنشاء صف لكل حساب مسجل في التطبيق.
        state.accounts
          .map(a => walletRow(a, b.accounts[a.id]))
          .join('')
      )}

      <!-- قائمة العمليات ضمن الفترة المختارة -->
      <h3>العمليات · ${periodText()}</h3>

      <!-- مربع البحث في العمليات -->
      ${searchBox('all')}

      <!-- حاوية تعرض جميع العمليات -->
      <div id="ops-all">
        ${allOpsList(state)}
      </div>
    `;
  },
};
