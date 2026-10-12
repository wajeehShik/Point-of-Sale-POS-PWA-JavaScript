
/**
 * إنشاء بطاقة إحصائية.
 *
 * label: عنوان البطاقة، مثل "رصيد الاستثمار".
 * value: القيمة التي تظهر داخل البطاقة، مثل "500 شيكل".
 * cls: اسم CSS إضافي لتنسيق القيمة، مثل pos أو neg.
 * extra: اسم CSS إضافي لتنسيق البطاقة نفسها.
 */
export const card = (label, value, cls = '', extra = '') =>
  `<div class="card${extra ? ' ' + extra : ''}">
    <small>${label}</small>
    <b class="${cls}">${value}</b>
  </div>`;

/**
 * إنشاء صف إحصائي لعرض اسم وقيمة.
 *
 * label: اسم البند، مثل "المبيعات".
 * value: القيمة، مثل "300 شيكل".
 * cls: تنسيق القيمة، مثل pos للأخضر أو neg للأحمر.
 * isSum: إذا كانت true، نضيف الصنف sum لتمييز صف الإجمالي.
 */
export const stat = (label, value, cls = '', isSum = false) =>
  `<div class="stat${isSum ? ' sum' : ''}">
    <span>${label}</span>
    <b class="${cls}">${value}</b>
  </div>`;

/**
 * وضع مجموعة من البطاقات داخل شبكة.
 *
 * cards: محتوى البطاقات بصيغة HTML.
 * style: تنسيقات CSS اختيارية للشبكة.
 *
 * إذا أُرسل style، تتم إضافته إلى خاصية style.
 */
export const grid = (cards, style = '') =>
  `<div class="grid"${style ? ` style="${style}"` : ''}>${cards}</div>`;

/**
 * وضع مجموعة من الصفوف داخل حاوية قائمة.
 *
 * rows: عناصر HTML التي ستظهر داخل القائمة.
 */
export const listBox = rows =>
  `<div class="list">${rows}</div>`;

/**
 * عرض رسالة عندما لا توجد بيانات.
 *
 * msg: الرسالة التي ستظهر للمستخدم.
 */
export const emptyBox = msg =>
  `<div class="list">
    <div class="empty">${msg}</div>
  </div>`;

/**
 * تحديد صنف CSS بحسب إشارة الرقم:
 *
 * رقم موجب  → pos.
 * رقم سالب  → neg.
 * صفر       → لا نضيف صنفًا.
 */
export const signCls = n =>
  (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
