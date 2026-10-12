
/**
 * ui: حالة واجهة المستخدم، ومنها خيار عرض جميع المورّدين.
 */
import { ui } from '../state.js';

/**
 * supplierGroups: تجميع ديون المشتريات حسب المورّد.
 * كل مجموعة تحتوي على بيانات الدين والدفعات والمبالغ المستحقة.
 */
import { supplierGroups } from '../../domain/debts.js';

/**
 * EPS: هامش صغير لتجنب اعتبار الفروق المالية البسيطة جدًا
 * مبالغ مستحقة فعلية.
 */
import { EPS } from '../../core/constants.js';

/**
 * shortDate: عرض التاريخ بصيغة مختصرة.
 */
import { shortDate } from '../../core/dates.js';

/**
 * fmt: تنسيق المبالغ المالية.
 */
import { fmt } from '../../core/format.js';

/**
 * esc: حماية النصوص عند إدراجها داخل HTML.
 */
import { esc } from '../dom.js';

/**
 * card: إنشاء بطاقة إحصائية.
 * grid: ترتيب البطاقات في شبكة.
 */
import { card, grid } from '../components.js';

/**
 * onClick: التعامل مع أحداث النقر.
 */
import { onClick } from '../actions.js';

/**
 * refresh: إعادة تحديث الواجهة بعد تغيير طريقة العرض.
 */
import { refresh } from '../router.js';

// العدد الافتراضي للمورّدين الذين تظهر تفاصيلهم في القائمة.
const LIMIT = 3;

/**
 * إنشاء قسم ديون المورّدين.
 *
 * state: بيانات التطبيق الحالية.
 */
export function suppliersSection(state) {

  // تجميع الديون والدفعات حسب المورّد.
  const groups = supplierGroups(state);

  // إذا لم توجد ديون للمورّدين، لا نعرض القسم.
  if (!groups.length) return '';

  // حساب إجمالي المبالغ المتبقية من ديون المورّدين.
  const total = groups.reduce(
    (a, g) => a + g.left,
    0
  );

  // حساب مجموع المبالغ المستحقة حاليًا.
  const due = groups.reduce(
    (a, g) => a + g.due,
    0
  );

  // تحديد عدد المورّدين المعروضين:
  // - عرض الجميع إذا فعّل المستخدم هذا الخيار.
  // - عرض الجميع أيضًا إذا كان العدد 4 أو أقل.
  // - إذا زاد العدد عن 4، نعرض أول 3 فقط.
  const limit =
    ui.showAllSuppliers || groups.length <= LIMIT + 1
      ? groups.length
      : LIMIT;

  // إنشاء صف لكل مورّد ضمن العدد المحدد للعرض.
  const rows = groups
    .slice(0, limit)
    .map(g => `
      <!-- الضغط على الصف يفتح تفاصيل ديون هذا المورّد -->
      <div
        class="row-i"
        data-action="sup-open"
        data-key="${esc(g.key)}"
      >

        <!-- أيقونة المورّد -->
        <span class="ic">🤝</span>

        <div class="mid">

          <!-- اسم المورّد، أو عبارة بديلة إذا لم يُسجّل اسمه -->
          ${esc(g.key || 'بدون مورّد')}

          <span>
            <!-- عدد دفعات الدين مع مراعاة المفرد والجمع -->
            ${g.count} ${g.count === 1 ? 'دفعة' : 'دفعات'}

            · إجمالي الدين ${fmt(g.left)}

            <!-- تاريخ أول دفعة مسجلة لهذا المورّد -->
            · منذ ${shortDate(g.first)}
          </span>

        </div>

        <!-- عرض المبلغ المستحق حاليًا إذا كان أكبر من EPS -->
        ${
          g.due > EPS
            ? `
              <div class="dcol">
                <small>مستحق الآن</small>
                <b class="due">${fmt(g.due)}</b>
              </div>
            `
            : '<b class="pos">لا مستحق</b>'
        }

        <!-- سهم يدل على إمكانية فتح التفاصيل -->
        <span class="chev">‹</span>

      </div>
    `)
    .join('');

  // تجهيز زر عرض جميع المورّدين أو تقليل القائمة.
  let btn = '';

  // إذا كانت هناك أسماء إضافية غير معروضة، نظهر زر عرض الجميع.
  if (groups.length > limit) {
    btn = `
      <button class="btn alt" data-action="suppliers-toggle">
        عرض كل الموردين (${groups.length})
      </button>
    `;
  }

  // عند عرض القائمة كاملة، نظهر زر العودة إلى العرض المختصر.
  else if (
    ui.showAllSuppliers &&
    groups.length > LIMIT + 1
  ) {
    btn = `
      <button class="btn alt" data-action="suppliers-toggle">
        عرض أقل
      </button>
    `;
  }

  // إرجاع القسم كاملًا.
  return `
    <h3>🤝 ديون الموردين</h3>

    <!-- بطاقتان تلخصان وضع الديون -->
    ${grid(
      card(
        'مستحق الآن (عن المباع)',
        fmt(due),
        due > EPS ? 'due' : ''
      )
      +
      card(
        'إجمالي الديون',
        fmt(total),
        'neg'
      ),
      'margin:0 0 10px'
    )}

    <!-- قائمة المورّدين -->
    <div class="list">
      ${rows}
    </div>

    <!-- زر عرض المزيد إن كانت هناك أسماء مخفية -->
    ${btn}
  `;
}

/**
 * عند الضغط على زر عرض جميع المورّدين أو عرض أقل:
 * نغيّر حالة العرض ثم نعيد تحديث الواجهة.
 */
onClick('suppliers-toggle', () => {

  // عكس حالة العرض الحالية.
  ui.showAllSuppliers = !ui.showAllSuppliers;

  // إعادة رسم الواجهة لإظهار القائمة بالحالة الجديدة.
  refresh();
});
