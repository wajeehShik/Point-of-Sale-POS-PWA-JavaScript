
/**
 * balances: حساب الأرصدة الحالية للأموال.
 * periodSummary: حساب ملخص الدخل والمصروفات لفترة معينة.
 */
import {
  balances,
  periodSummary
} from '../../domain/ledger.js';

/**
 * fmt: تنسيق المبالغ المالية.
 * today: إرجاع تاريخ اليوم.
 */
import {
  fmt,
  today
} from '../../core/format.js';

/**
 * مكونات جاهزة لإنشاء بطاقات الإحصائيات
 * وترتيبها داخل شبكة.
 */
import {
  card,
  grid
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
 * إنشاء قائمة عمليات القسم المحدد.
 */
import { opsBlock } from '../opsView.js';

export default {
  // عنوان الصفحة الذي يظهر للمستخدم.
  title: 'البيت',

  // ربط الصفحة بقسم البيت داخل التطبيق.
  // يساعد بقية النظام على معرفة القسم المرتبط بالصفحة.
  ctx: 'home',

  /**
   * إنشاء واجهة صفحة البيت.
   * state تحتوي على بيانات التطبيق الحالية.
   */
  render(state) {
    // حساب الأرصدة الحالية، ثم استخراج رصيد البيت.
    const b = balances(state);

    // حساب ملخص الفترة المختارة لقسم البيت.
    const m = periodSummary(state, currentPeriod()).home;

    // حساب إجمالي مصروفات اليوم لقسم البيت.
    const todayExpense =
      periodSummary(state, today()).home.expense;

    // حساب المتبقي خلال الفترة:
    // المتبقي = الدخل - المصروفات.
    const left = m.income - m.expense;

    // الحصول على اسم الفترة المختارة لعرضه على البطاقات.
    const label = periodText();

    return `
      <!-- عرض رصيد البيت الحالي، وليس رصيد الفترة فقط -->
      <section class="hero">
        <small>رصيد البيت</small>
        <h1>${fmt(b.home)}</h1>
      </section>

      <!-- شريط اختيار الفترة الزمنية -->
      ${periodBar(state)}

      <!-- بطاقات ملخص البيت -->
      ${grid(
        // إجمالي الدخل خلال الفترة المختارة.
        card(
          `الدخل · ${label}`,
          fmt(m.income),
          'pos'
        )

        // إجمالي المصروفات خلال الفترة المختارة.
        + card(
          `المصروف · ${label}`,
          fmt(m.expense),
          'neg'
        )

        // المتبقي من الدخل بعد خصم المصروفات.
        // إذا كان سالبًا، نستخدم فئة neg لتمييزه.
        + card(
          `المتبقي · ${label}`,
          fmt(left),
          left < 0 ? 'neg' : ''
        )

        // إجمالي المصروفات المسجلة في تاريخ اليوم.
        + card(
          'مصروف اليوم',
          fmt(todayExpense),
          'neg'
        )
      )}

      <!-- عرض العمليات التابعة لقسم البيت -->
      <h3>العمليات</h3>

      ${opsBlock(state, 'home')}
    `;
  },
};
