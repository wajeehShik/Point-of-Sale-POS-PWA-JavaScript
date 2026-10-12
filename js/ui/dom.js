
/**
 * إرجاع أول عنصر HTML يطابق محدد CSS.
 * مثال: $(' #toast ') يبحث عن عنصر التنبيه.
 * نكتب عادةً $('#toast') بدون المسافات.
 */
export const $ = s => document.querySelector(s);


/**
 * تحويل النص إلى نص آمن عند إدراجه داخل HTML.
 *
 * يحوّل الرموز الخاصة إلى كيانات HTML حتى لا تُفسَّر
 * على أنها وسوم HTML عند وضع النص داخل قالب HTML.
 *
 * ?? '' تعني استخدام نص فارغ إذا كانت القيمة null أو undefined.
 */
export const esc = s => String(s ?? '').replace(/[&<>"]/g,
  c => ({
    '&': '&amp;',   // منع تفسير & كجزء من كيان HTML
    '<': '&lt;',    // منع فتح وسم HTML
    '>': '&gt;',    // منع إغلاق وسم HTML
    '"': '&quot;'   // حماية علامات الاقتباس المزدوجة
  }[c])
);


/**
 * إظهار رسالة مؤقتة للمستخدم.
 *
 * msg: نص الرسالة.
 * isError: إذا كانت true، تُعرض الرسالة بتنسيق الخطأ.
 */
export function toast(msg, isError = false) {
  // البحث عن عنصر التنبيه الموجود في الصفحة.
  let el = $('#toast');

  // إذا لم يكن موجوداً، ننشئه ونضيفه إلى الصفحة.
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }

  // وضع نص الرسالة بأمان؛ textContent لا يفسر النص كـ HTML.
  el.textContent = msg;

  // إضافة كلاس العرض، وإضافة err إذا كانت الرسالة خطأ.
  el.className = 'show' + (isError ? ' err' : '');

  // إلغاء مؤقت الرسالة السابق إن وُجد،
  // حتى لا تختفي الرسالة الجديدة بسبب مؤقت قديم.
  clearTimeout(el._t);

  // إخفاء الرسالة بعد 2600 مللي ثانية، أي 2.6 ثانية.
  el._t = setTimeout(() => {
    el.className = '';
  }, 2600);
}


/**
 * تنزيل محتوى على هيئة ملف إلى جهاز المستخدم.
 *
 * name: اسم الملف، مثل backup.json.
 * content: المحتوى الذي سيُكتب داخل الملف.
 * mime: نوع الملف، مثل application/json أو text/csv.
 */
export function download(name, content, mime) {
  // إنشاء رابط HTML مؤقت لتنزيل الملف.
  const a = document.createElement('a');

  // تحويل المحتوى إلى Blob، ثم إنشاء رابط مؤقت له.
  a.href = URL.createObjectURL(
    new Blob([content], { type: mime })
  );

  // تحديد اسم الملف الذي سيظهر للمستخدم عند التنزيل.
  a.download = name;

  // محاكاة النقر لبدء عملية التنزيل.
  a.click();

  // ملاحظة: من الأفضل تحرير الرابط المؤقت بعد بدء التنزيل
  // باستخدام URL.revokeObjectURL() لتجنب تراكم الموارد.
}
