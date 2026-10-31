
import { store } from '../data/store.js';

// إدارة النافذة التي تظهر فيها نماذج إضافة وتعديل العمليات.
import { sheet } from './sheet.js';

// النماذج المختلفة؛ لكل نوع عملية نموذج مستقل.
import { FORMS } from './forms/index.js';

// الحقول المشتركة بين النماذج، ودالة تعبئة قيمة حقل معين.
import { commonFields, setValue } from './forms/fields.js';

// أسماء أنواع العمليات وأيقوناتها وتسمياتها.
import { TX_TYPES } from '../domain/txTypes.js';

// البحث عن عملية موجودة باستخدام معرّفها.
import { findTx } from '../domain/lookup.js';

// حفظ العملية الجديدة أو تحديث عملية موجودة.
import { saveTransaction } from '../services/transactions.js';

// حذف العملية بعد تأكيد المستخدم.
import { deleteWithConfirm } from './deleteFlow.js';

// معرفة الصفحة الحالية، لتحديد سياق العملية.
import { currentPage } from './router.js';

// ربط أزرار HTML بالدوال المسؤولة عن تنفيذها.
import { onClick } from './actions.js';

// اختيار عناصر HTML وعرض رسائل التنبيه.
import { $, toast } from './dom.js';


/**
 * أنواع العمليات المتاحة حسب السياق.
 *
 * البيت:
 * - دخل
 * - مصروف
 *
 * الاستثمار:
 * - بيع
 * - شراء
 * - مصروف
 */
const CTX_TYPES = {
  home: ['income', 'expense'],
  invest: ['sale', 'purchase', 'expense']
};

// جميع أنواع العمليات المتاحة عند عدم تحديد سياق معين.
const ALL_TYPES = [
  'income',
  'expense',
  'sale',
  'purchase',
  'transfer'
];

// العناوين التي تظهر أعلى نافذة العملية حسب السياق.
const TITLES = {
  home: 'عملية على البيت',
  invest: 'عملية على الاستثمار'
};


// حالة النافذة الحالية.
// type: نوع العملية.
// ctx: سياق العملية، مثل البيت أو الاستثمار.
// editId: معرّف العملية عند التعديل، أو null عند الإضافة.
// ref: مرجع مرتبط بالعملية، ويُستخدم هنا مع سداد الدين.
let st = null;


/**
 * تجهيز البيانات التي تحتاجها النماذج.
 * بدلاً من تمرير كل البيانات بشكل منفصل،
 * نعيد كائناً يحتوي على الحالة والسياق ومعرّف التعديل والمرجع.
 */
const env = () => ({
  state: store.state,
  ctx: st.ctx,
  editId: st.editId,
  ref: st.ref
});


/**
 * إرجاع النموذج المناسب لنوع العملية الحالي.
 * مثال: إذا كان النوع sale، نأخذ نموذج البيع من FORMS.
 */
const form = () => FORMS[st.type];


/**
 * إنشاء أزرار اختيار نوع العملية.
 */
function chips() {
  // عند تعديل عملية موجودة لا نسمح بتغيير نوعها من هذه الأزرار.
  // كما نخفي الأزرار عند إضافة سداد دين.
  if (st.editId || st.type === 'debtpay') return '';

  // استخدام الأنواع الخاصة بالسياق الحالي.
  // إذا لم يكن السياق معروفاً، نعرض جميع الأنواع المتاحة.
  const types = CTX_TYPES[st.ctx] || ALL_TYPES;

  // إنشاء زر لكل نوع عملية.
  const items = types.map(k => `
    <button
      type="button"
      class="chip${k === st.type ? ' on' : ''}"
      data-action="entry-type"
      data-type="${k}"
    >
      <span>${TX_TYPES[k].icon}</span>
      ${TX_TYPES[k].label}
    </button>
  `).join('');

  // ترتيب الأزرار بالتساوي في شبكة واحدة.
  return `
    <div
      class="chips"
      style="grid-template-columns:repeat(${types.length},1fr)"
    >
      ${items}
    </div>
  `;
}


/**
 * إنشاء شريط الأزرار أسفل النموذج.
 * يظهر زر الحفظ دائماً، ويظهر زر الحذف عند تعديل عملية.
 */
const savebar = () => `
  <div class="savebar">
    <button class="btn">حفظ</button>

    ${
      st.editId
        ? `<button
             type="button"
             class="btn alt"
             style="color:var(--danger);margin-top:8px"
             data-action="entry-delete"
           >حذف العملية</button>`
        : ''
    }
  </div>
`;
onClick('clear-product-name', (_data, button) => {
  const label = button.closest('label');
  const input = label?.querySelector('input[name="productName"]');

  if (!input) return;

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
});


/**
 * إعادة رسم محتوى النافذة حسب نوع العملية الحالي.
 */
function draw() {
  // تركيب أزرار أنواع العمليات، والنموذج الخاص بالعملية،
  // والحقول المشتركة، وشريط الحفظ والحذف.
  sheet.setBody(
    chips() +
    form().render(env()) +
    commonFields() +
    savebar()
  );

  // الوصول إلى نموذج HTML داخل النافذة.
  const f = sheet.form;

  // إعادة تعيين مؤشرات حالة النموذج.
  // هذه القيم مخصصة لمنطق النماذج الأخرى في التطبيق.
  f.dataset.touched = '';
  f.dataset.amtT = '';

  // السماح للنموذج الحالي بمزامنة الحقول بعد رسمها.
  // علامة ?. تعني تنفيذ sync فقط إذا كانت موجودة.
  form().sync?.(f, env());
}


/**
 * فتح النافذة وربط أحداثها بالدوال المناسبة.
 */
function openSheet(title) {
  sheet.open({
    title,

    // استدعاء submit عند إرسال النموذج.
    onSubmit: submit,

    // عند إدخال المستخدم بيانات:
    // 1. تنفيذ منطق الإدخال الخاص بالنموذج.
    // 2. مزامنة الحقول حسب القيم الجديدة.
    onInput: e => {
      if (!st) return;

      form().input?.(sheet.form, e, env());
      form().sync?.(sheet.form, env());
    },

    // عند تغيير قيمة حقل، مثل اختيار قائمة أو تاريخ.
    onChange: e => {
      if (!st) return;

      form().change?.(sheet.form, e, env());
      form().sync?.(sheet.form, env());
    },

    // عند إغلاق النافذة، نتخلص من حالة العملية الحالية.
    onClose: () => {
      st = null;
    }
  });
}


/**
 * فتح نافذة لإضافة عملية جديدة.
 *
 * ctx يحدد سياق العملية، مثل home أو invest.
 */
export function openNew(ctx) {
  st = {
    // اختيار أول نوع متاح في السياق.
    // إذا لم يكن السياق معروفاً، نستخدم جميع الأنواع.
    type: (CTX_TYPES[ctx] || ALL_TYPES)[0],

    ctx,

    // لا يوجد معرّف لعملية سابقة عند الإضافة.
    editId: null,

    // لا يوجد مرجع مرتبط افتراضياً.
    ref: null
  };

  // فتح النافذة بعنوان مناسب للسياق.
  openSheet(TITLES[ctx] || 'عملية جديدة');

  // رسم النموذج الأولي.
  draw();
}


/**
 * فتح نافذة تعديل عملية موجودة.
 *
 * id هو معرّف العملية المراد تعديلها.
 */
export function openEdit(id) {
  // البحث عن العملية داخل بيانات التطبيق.
  const t = findTx(store.state, id);

  // إذا لم نجد العملية، لا نفتح النافذة.
  if (!t) return;

  // حفظ معلومات العملية المراد تعديلها.
  st = {
    type: t.type,
    ctx: null,
    editId: id,

    // الاحتفاظ بمرجع سداد الدين إذا كان النوع debtpay.
    ref: t.type === 'debtpay' ? t.ref : null
  };

  // فتح نافذة التعديل.
  openSheet('تعديل عملية');

  // رسم النموذج الموافق لنوع العملية.
  draw();

  // الوصول إلى نموذج HTML.
  const f = sheet.form;

  // تعبئة حقول النموذج بقيم العملية الحالية.
  form().fill?.(f, t, env());

  // تعبئة الحقول المشتركة، مثل الملاحظة والتاريخ.
  setValue(f, 'note', t.note);
  setValue(f, 'date', t.date);

  // الإشارة إلى أن مبلغ العملية تمت تهيئته.
  f.dataset.amtT = '1';


  // إعادة مزامنة النموذج بعد تعبئة القيم.
  form().sync?.(f, env());
}


/**
 * حفظ العملية الجديدة أو التعديلات على عملية موجودة.
 */
function submit() {
  const f = sheet.form;

  // قراءة بيانات النموذج، ثم إضافة الحقول المشتركة:
  // نوع العملية والتاريخ والملاحظة.
  const draft = {
    ...form().read(f),
    type: st.type,
    date: f.elements.date.value,
    note: f.elements.note.value
  };

  // إذا كانت العملية سداد دين، نضيف مرجع الدين المرتبط بها.
  if (st.type === 'debtpay') {
    draft.ref = st.ref;
  }

  // إرسال البيانات إلى خدمة الحفظ.
  // وجود editId يعني تعديل عملية؛ وعدم وجوده يعني إضافة جديدة.
  const res = saveTransaction(draft, st.editId);

  // إذا حدث خطأ أثناء الحفظ، نظهر رسالة ونبقي النافذة مفتوحة.
  if (res.error) return toast(res.error, true);

  // تسجيل ما إذا كانت العملية تعديلاً أم إضافة جديدة.
  const wasEdit = !!st.editId;

  // إغلاق النافذة بعد نجاح الحفظ.
  sheet.close();

  // عرض رسالة مناسبة للمستخدم.
  toast(wasEdit ? 'تم تعديل العملية ✓' : 'تم الحفظ ✓');
}


/**
 * ربط الأزرار بالدوال المسؤولة عن تنفيذها.
 */

// عند الضغط على زر الإضافة العائم:
// نأخذ السياق من الصفحة الحالية ونفتح نموذج الإضافة.
onClick('fab', () => {
  openNew(currentPage().ctx ?? null);
});

// عند الضغط على زر تعديل عملية:
// نأخذ معرّف العملية من data-id.
onClick('tx-edit', d => {
  openEdit(d.id);
});

// عند اختيار نوع آخر من أزرار الأنواع:
// نحدّث النوع ثم نعيد رسم النموذج المناسب.
onClick('entry-type', d => {
  st.type = d.type;
  draw();
});


// عند الضغط على زر حذف العملية:
// نطلب التأكيد، ثم نغلق النافذة ونعرض رسالة نجاح إذا تم الحذف.
onClick('entry-delete', () => {
  if (deleteWithConfirm(st.editId)) {
    sheet.close();
    toast('تم حذف العملية');
  }
});
