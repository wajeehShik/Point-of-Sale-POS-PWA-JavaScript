// استيراد دالة حماية النصوص قبل وضعها داخل HTML
import { esc } from '../dom.js';

// استيراد تعريفات الأقسام المالية، مثل المنزل والاستثمار
import { SECTORS } from '../../core/constants.js';

// استيراد دالة الحصول على تاريخ اليوم
import { today } from '../../core/format.js';

/**
 * إنشاء خيارات قائمة select.
 *
 * arr: مصفوفة تحتوي على أزواج [القيمة، النص الظاهر].
 * sel: القيمة التي نريد تحديدها افتراضياً.
 *
 * مثال:
 * opts([['cash', 'نقداً'], ['bank', 'البنك']], 'cash')
 */
export const opts = (arr, sel) =>
  arr.map(([v, l]) =>
    `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`
  ).join('');

/**
 * إنشاء خيارات الحسابات المالية.
 *
 * state: بيانات التطبيق التي تحتوي على الحسابات.
 * sel: معرّف الحساب المحدد افتراضياً.
 */
export const accountOptions = (state, sel) =>
  opts(
    state.accounts.map(a => [a.id, a.name]),
    sel
  );

/**
 * إنشاء خيارات الأقسام المالية.
 *
 * sel: القسم المحدد افتراضياً.
 * order: ترتيب ظهور الأقسام، وإذا لم يُحدد نستخدم الترتيب الافتراضي.
 */
export const sectorOptions = (sel, order = Object.keys(SECTORS)) =>
  opts(
    order.map(k => [
      k, // القيمة التي ستُحفظ عند اختيار القسم
      `${SECTORS[k].icon} ${SECTORS[k].label}` // النص الظاهر للمستخدم
    ]),
    sel
  );

/**
 * إنشاء حقل إدخال رقمي.
 *
 * name: اسم الحقل الذي نستخدمه للوصول إليه داخل النموذج.
 * label: العنوان الظاهر للمستخدم.
 * placeholder: النص الإرشادي داخل الحقل.
 * value: القيمة الافتراضية للحقل.
 */
export const numberField = (name, label, placeholder = '', value = '') =>
  `<label>
    ${label}
    <input
      name="${name}"
      type="number"
      step="any"
      min="0"
      inputmode="decimal"
      placeholder="${placeholder}"
      value="${value}"
    >
  </label>`;

/**
 * إنشاء حقل اختيار الحساب المالي.
 *
 * state: بيانات التطبيق لاستخراج الحسابات.
 * label: العنوان الظاهر فوق القائمة.
 */
export const accountField = (state, label) =>
  `<label>
    ${label}
    <select name="account">
      ${accountOptions(state)}
    </select>
  </label>`;

/**
 * إنشاء حقل اختيار القسم المالي.
 *
 * إذا فُتحت النافذة من صفحة قسم محدد، وكان المستخدم يضيف عملية جديدة،
 * نخفي حقل القسم ونضع القسم الحالي في حقل مخفي.
 *
 * أما عند التعديل أو عند عدم تحديد قسم مسبقاً،
 * نظهر قائمة اختيار القسم للمستخدم.
 */
export const sectorField = ({ ctx, editId }) =>
  (ctx && !editId)
    // عملية جديدة من داخل صفحة قسم محدد: لا حاجة لإظهار القائمة
    ? `<input type="hidden" name="sector" value="${ctx}">`

    // عملية عامة أو عملية تعديل: إظهار قائمة الأقسام
    : `<label>
        القسم
        <select name="sector">
          ${sectorOptions()}
        </select>
      </label>`;

/**
 * إنشاء الحقول المشتركة بين نماذج العمليات.
 *
 * تشمل:
 * 1. تاريخ العملية، ويكون اليوم افتراضياً.
 * 2. ملاحظة اختيارية.
 */
export const commonFields = () => `
  <label class="date-field">
    تاريخ العملية
    <input
      type="date"
      name="date"
      value="${today()}"
      required
    >
  </label>

  <label>
    ملاحظة
    <input name="note" placeholder="اختياري">
  </label>
`;


/**
 * قراءة قيمة حقل من النموذج.
 *
 * إذا لم يكن الحقل موجوداً، نرجع نصاً فارغاً بدلاً من حدوث خطأ.
 */
export const val = (f, name) =>
  (f.elements[name] ? f.elements[name].value : '');

/**
 * وضع قيمة داخل حقل في النموذج.
 *
 * f: النموذج.
 * name: اسم الحقل.
 * v: القيمة المراد وضعها.
 */
export function setValue(f, name, v) {
  // البحث عن الحقل المطلوب داخل النموذج
  const el = f.elements[name];

  // إذا لم يوجد الحقل أو كانت القيمة غير محددة، لا نغيّر شيئاً
  if (!el || v === undefined || v === null) return;

  // إذا كان الحقل قائمة اختيار، نتأكد من وجود القيمة ضمن خياراتها
  if (el.tagName === 'SELECT') {

    // إذا كانت القيمة فارغة، نترك الاختيار الحالي كما هو
    if (v === '') return;

    // إذا لم تكن القيمة موجودة ضمن الخيارات، نضيف خياراً جديداً
    // وهذا مفيد عند تعديل بيانات قديمة تحتوي على قيمة غير موجودة حالياً
    if (![...el.options].some(o => o.value === String(v))) {
      el.add(new Option(v, v));
    }
  }

  // تعيين القيمة المطلوبة داخل الحقل
  el.value = v;
}