
/**
 * نظام ربط الواجهة بالمنطق بدون كتابة onclick داخل HTML:
 *
 * data-action="name"  → تنفيذ دالة عند النقر.
 * data-input="name"   → تنفيذ دالة عند الكتابة داخل الحقل.
 * data-change="name"  → تنفيذ دالة عند تغيير قيمة الحقل.
 *
 * مثال:
 * <button data-action="save">حفظ</button>
 *
 * ثم في ملف آخر:
 * onClick('save', (data, el, event) => {
 *   // الكود الذي ينفذ عند الضغط على الزر
 * });
 */

/**
 * تخزين الدوال المسجلة لكل نوع حدث.
 *
 * click: دوال النقر.
 * input: دوال الكتابة وتغيّر القيمة أثناء الإدخال.
 * change: دوال تغيير القيمة.
 *
 * كل Map تربط اسم الحدث بالدالة المسؤولة عنه.
 */
const maps = {
  click: new Map(),
  input: new Map(),
  change: new Map()
};

/**
 * تسجيل دالة تُنفّذ عند النقر على عنصر.
 *
 * name: الاسم الموجود في data-action.
 * fn: الدالة التي ستُنفّذ عند حدوث النقر.
 */
export const onClick = (name, fn) =>
  maps.click.set(name, fn);

/**
 * تسجيل دالة تُنفّذ عند الكتابة داخل حقل.
 *
 * name: الاسم الموجود في data-input.
 * fn: الدالة التي ستُنفّذ عند تغيّر محتوى الحقل.
 */
export const onInput = (name, fn) =>
  maps.input.set(name, fn);

/**
 * تسجيل دالة تُنفّذ عند تغيير قيمة عنصر.
 *
 * name: الاسم الموجود في data-change.
 * fn: الدالة التي ستُنفّذ عند حدوث التغيير.
 */
export const onChange = (name, fn) =>
  maps.change.set(name, fn);

/**
 * تفعيل مستمعات الأحداث على مستوى المستند.
 *
 * بدل إضافة مستمع منفصل لكل زر أو حقل،
 * نضيف مستمعًا واحدًا لكل نوع حدث.
 *
 * بهذه الطريقة يمكن للأحداث أن تعمل أيضًا مع العناصر
 * التي تُضاف لاحقًا إلى الصفحة عن طريق innerHTML.
 */
export function bindActions() {

  /**
   * إنشاء مستمع عام لنوع حدث معين.
   *
   * event: نوع الحدث، مثل click أو input أو change.
   * attr: الخاصية التي تحدد اسم الدالة المطلوبة.
   */
  const listen = (event, attr) => {

    // الاستماع للحدث على مستوى المستند كله.
    document.addEventListener(event, e => {

      // البحث عن أقرب عنصر يحمل الخاصية المطلوبة.
      // closest يسمح بالتعامل مع النقر على عنصر داخلي
      // داخل الزر أو العنصر الذي يحمل الخاصية.
      const el = e.target.closest(`[${attr}]`);

      // إذا لم نجد عنصرًا مناسبًا، لا ننفذ شيئًا.
      if (!el) return;

      // قراءة اسم الدالة من الخاصية، ثم البحث عنها في Map.
      // مثال: data-action="save" يعني البحث عن دالة save.
      const fn = maps[event].get(el.getAttribute(attr));

      // إذا كانت الدالة مسجلة، ننفذها ونمرر إليها:
      // el.dataset: جميع خصائص data-* كبيانات.
      // el: العنصر الذي يحمل الخاصية المطلوبة.
      // e: كائن الحدث الأصلي.
      if (fn) fn(el.dataset, el, e);
    });
  };

  // ربط النقر بالخاصية data-action.
  listen('click', 'data-action');

  // ربط الكتابة بالخاصية data-input.
  listen('input', 'data-input');

  // ربط تغيير القيم بالخاصية data-change.
  listen('change', 'data-change');
}
