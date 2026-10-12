
/**
 * الوصول إلى بيانات التطبيق الحالية.
 */
import { store } from '../data/store.js';

// إدارة النافذة المنبثقة التي تعرض نموذج تعديل المنتج.
import { sheet } from './sheet.js';

// البحث عن منتج باستخدام معرّفه.
import { findProduct } from '../domain/lookup.js';

// حساب الكمية المتوفرة وإحصائيات مبيعات المنتج.
import { stock, productStats } from '../domain/inventory.js';

// جلب الديون المرتبطة بالمبيعات والموردين.
import { debts } from '../domain/debts.js';

// حفظ بيانات المنتج أو حذفه.
import {
  saveProduct,
  deleteProduct
} from '../services/products.js';

// إنشاء حقول إدخال الأرقام داخل النموذج.
import { numberField } from './forms/fields.js';

// تنسيق المبالغ المالية.
import { fmt } from '../core/format.js';

// أدوات HTML: حماية النصوص، اختيار العناصر، وعرض التنبيهات.
import { esc, $, toast } from './dom.js';

// ربط الأزرار بالدوال المناسبة.
import { onClick } from './actions.js';


// حفظ معرّف المنتج الذي يجري تعديله حالياً.
// تكون القيمة null عندما لا توجد عملية تعديل مفتوحة.
let currentId = null;


/**
 * تحديد كلاس اللون بناءً على إشارة الرقم.
 * الصفر والموجب يأخذان pos، والسالب يأخذ neg.
 */
const signCls = n => (n >= 0 ? 'pos' : 'neg');


/**
 * إنشاء محتوى نموذج تعديل المنتج.
 *
 * s: حالة بيانات التطبيق.
 * p: بيانات المنتج المراد تعديله.
 */
function body(s, p) {

  // جلب عدد الوحدات المباعة والربح المتحقق من المنتج.
  const { sold, profit } = productStats(s, p.id);

  // جلب الديون المرتبطة بهذا المنتج فقط.
  const ds = debts(s).filter(d => d.t.productId === p.id);

  // مجموع المبالغ المتبقية من الديون المرتبطة بالمنتج.
  // Math.max يمنع احتساب الرصيد السالب كدين.
  const debt = ds.reduce(
    (a, d) => a + Math.max(0, d.left),
    0
  );

  // مجموع المبالغ المستحقة حالياً حسب منطق debts().
  const due = ds.reduce((a, d) => a + d.due, 0);


  // إنشاء حقل اسم المنتج.
  // esc تمنع تفسير الرموز الخاصة في الاسم على أنها HTML.
  return `
    <label>
      اسم المنتج
      <input name="pname" value="${esc(p.name)}">
    </label>

    <!-- حقلا تكلفة الوحدة وسعر بيع الوحدة -->
    <div class="row">
      ${numberField('cost', 'سعر التكلفة (للوحدة)', '', p.cost)}
      ${numberField('price', 'سعر البيع (للوحدة)', '', p.price)}
    </div>

    <!-- الكمية الحالية والحد الأدنى لتنبيه انخفاض المخزون -->
    <div class="row">
      ${numberField('stock', 'الكمية المتوفرة', '', stock(s, p.id))}
      ${numberField('min', 'الحد الأدنى للتنبيه', '', p.min || 0)}
    </div>

    <!-- إحصائيات الربح التي تتحدث عند تعديل القيم -->
    <div class="sumbox">

      <div class="stat">
        <span>ربح الوحدة</span>
        <b id="pu">—</b>
      </div>

      <div class="stat">
        <span>هامش الربح</span>
        <b id="pm">—</b>
      </div>

      <div class="stat">
        <span>ربح متوقع من المتبقي</span>
        <b id="pe">—</b>
      </div>

      <!-- الربح المتحقق من المبيعات السابقة -->
      <div class="stat">
        <span>الربح المتحقق (بيع ${sold})</span>
        <b class="${signCls(profit)}">
          ${profit > 0 ? '+' : ''}${fmt(profit)}
        </b>
      </div>

      ${
        // لا نعرض تفاصيل الدين إلا إذا تجاوز المبلغ
        // قيمة صغيرة لتجنب عرض أرقام تافهة بسبب الكسور.
        debt > 0.005
          ? `
            <div class="stat">
              <span>دين عليك لهذا المنتج</span>
              <b class="neg">${fmt(debt)}</b>
            </div>

            <div class="stat">
              <span>منه مستحق الآن (عن المباع)</span>
              <b class="due">${fmt(due)}</b>
            </div>
          `
          : ''
      }

      <!-- توضيح أثر تعديل الكمية والسعر -->
      <div class="note">
        تعديل الكمية = جرد وتصحيح للمخزون.
        وتغيير السعر لا يغيّر أرباح المبيعات السابقة.
      </div>
    </div>

    <!-- زر الحفظ وزر حذف المنتج -->
    <div class="savebar">
      <button class="btn">حفظ</button>

      <button
        type="button"
        class="btn alt"
        style="color:var(--danger);margin-top:8px"
        data-action="product-delete"
      >
        حذف المنتج
      </button>
    </div>
  `;
}


/**
 * تحديث حسابات الربح مباشرة أثناء تعديل الحقول.
 */
function live() {

  // الحصول على نموذج المنتج الحالي.
  const f = sheet.form;

  // قراءة تكلفة الوحدة وسعر البيع والكمية.
  // إذا كانت القيمة فارغة أو غير قابلة للتحويل إلى رقم،
  // نستخدم الصفر.
  const c = +f.elements.cost.value || 0;
  const pr = +f.elements.price.value || 0;
  const st = +f.elements.stock.value || 0;

  // ربح الوحدة = سعر البيع - تكلفة الوحدة.
  const unit = pr - c;

  // دالة مساعدة لتحديث نص عنصر HTML ولونه.
  const set = (id, text) => {
    const el = $(id);

    // وضع القيمة المحسوبة داخل العنصر.
    el.textContent = text;

    // تحديد اللون حسب ربح الوحدة.
    el.className = signCls(unit);
  };


  // تحديث ربح الوحدة.
  // نضيف علامة + إذا كان الربح موجباً.
  set(
    '#pu',
    (unit > 0 ? '+' : '') + fmt(unit)
  );


  // حساب هامش الربح كنسبة من سعر البيع.
  // إذا كان سعر البيع صفراً، نعرض شرطة بدلاً من القسمة على صفر.
  set(
    '#pm',
    pr > 0
      ? Math.round((unit / pr) * 100) + '%'
      : '—'
  );


  // الربح المتوقع من الكمية المتبقية:
  // ربح الوحدة × الكمية المتوفرة.
  set(
    '#pe',
    (unit * st > 0 ? '+' : '') + fmt(unit * st)
  );
}


/**
 * فتح نافذة تعديل منتج معين.
 */
export function openProduct(id) {

  // البحث عن المنتج في بيانات التطبيق.
  const p = findProduct(store.state, id);

  // إذا لم يتم العثور على المنتج، نوقف العملية.
  if (!p) return;

  // حفظ معرّف المنتج حتى نستخدمه في الحفظ أو الحذف.
  currentId = id;

  // فتح نافذة التعديل وتجهيز محتواها وأحداثها.
  sheet.open({
    title: 'تعديل منتج',

    // HTML الخاص بنموذج المنتج.
    html: body(store.state, p),

    // عند إرسال النموذج، ننفذ دالة الحفظ.
    onSubmit: save,

    // عند تعديل أي حقل، نعيد حساب مؤشرات الربح.
    onInput: live,

    // عند إغلاق النافذة، نمسح معرّف المنتج الحالي.
    onClose: () => {
      currentId = null;
    }
  });

  // حساب القيم الأولية فور فتح النافذة.
  live();
}


/**
 * حفظ تعديلات المنتج.
 */
function save() {

  // الحصول على نموذج التعديل.
  const f = sheet.form;

  // دالة مختصرة لقراءة قيمة أي حقل بالاسم.
  const v = n => f.elements[n].value;

  // إرسال القيم إلى خدمة حفظ المنتجات.
  // الخدمة هي المسؤولة عن التحقق من البيانات وتخزينها.
  const res = saveProduct(currentId, {
    name: v('pname'),
    cost: v('cost'),
    price: v('price'),
    stock: v('stock'),
    min: v('min')
  });

  // إذا حدث خطأ، نظهر رسالة ولا نغلق النافذة.
  if (res.error) {
    return toast(res.error, true);
  }

  // عند نجاح الحفظ، نغلق النافذة ونبلغ المستخدم.
  sheet.close();
  toast('تم حفظ المنتج ✓');
}


// عند الضغط على أي منتج في القائمة، نفتح نافذة تعديله.
onClick('product-open', d => {
  openProduct(d.id);
});


// عند الضغط على زر حذف المنتج.
onClick('product-delete', () => {

  // طلب تأكيد المستخدم قبل حذف المنتج.
  if (!confirm('حذف هذا المنتج؟')) return;

  // تنفيذ عملية الحذف باستخدام معرّف المنتج الحالي.
  const res = deleteProduct(currentId);

  // إذا رفضت الخدمة الحذف، نعرض سبب الخطأ.
  if (res.error) {
    return toast(res.error, true);
  }

  // عند نجاح الحذف، نغلق النافذة ونظهر رسالة نجاح.
  sheet.close();
  toast('تم حذف المنتج');
});
