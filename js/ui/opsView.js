
/**
 * استيراد حالة واجهة المستخدم، مثل:
 * - نص البحث.
 * - التبويب المحدد.
 * - عدد العمليات المعروضة.
 */
import { ui } from './state.js';

// الوصول إلى بيانات التطبيق الحالية.
import { store } from '../data/store.js';

// التحقق مما إذا كان تاريخ العملية يقع ضمن الفترة المحددة.
import { inPeriod } from '../domain/ledger.js';

// البحث داخل العمليات وفق النص المدخل.
import { searchTx } from '../domain/search.js';

// معرفة الفترة الزمنية المختارة في واجهة التطبيق.
import { currentPeriod } from './periodBar.js';

// إنشاء HTML لقائمة العمليات المالية.
import { txList } from './txList.js';

// ربط أحداث الضغط والكتابة بالعناصر.
import { onClick, onInput } from './actions.js';

// إعادة تحديث الصفحة عند تغيير التبويب أو عدد العمليات.
import { refresh } from './router.js';

// تنسيق المبالغ المالية للعرض.
import { fmt } from '../core/format.js';

// حماية النصوص عند إدراجها في HTML.
import { esc } from './dom.js';


/**
 * التبويبات المتاحة في كل قسم.
 *
 * كل تبويب يحتوي على:
 * [المعرّف، الاسم الظاهر، أنواع العمليات المسموح بها]
 *
 * القيمة null تعني عرض جميع أنواع العمليات في القسم.
 */
const TABS = {
  // تبويبات البيت: الكل، الإيرادات، المصروفات، التحويلات.
  home: [
    ['all', 'الكل', null],
    ['income', 'إيراد', ['income']],
    ['expense', 'مصروف', ['expense']],
    ['transfer', 'تحويل', ['transfer']]
  ],

  // تبويبات الاستثمار: البيع، الشراء، المصروفات، وغيرها.
  invest: [
    ['all', 'الكل', null],
    ['sale', 'بيع', ['sale']],
    ['purchase', 'شراء', ['purchase']],
    ['expense', 'مصاريف', ['expense']],
    ['other', 'أخرى', ['income', 'transfer', 'debtpay']]
  ]
};


// النص الذي يظهر داخل حقل البحث.
const PLACEHOLDER =
  '🔍 ابحث (صنف، منتج، مورّد، ملاحظة، مبلغ، يوم...)';


/**
 * معرفة التبويب المحدد حالياً في الصفحة.
 *
 * إذا كانت قيمة التبويب المحفوظة غير موجودة ضمن التبويبات،
 * نستخدم أول تبويب افتراضياً.
 */
const activeTab = page =>
  TABS[page].find(t => t[0] === ui.tab[page]) || TABS[page][0];


/**
 * إنشاء حقل البحث الخاص بصفحة معينة.
 *
 * page: سياق الصفحة، مثل home أو invest.
 */
export const searchBox = page => `
  <input
    class="search"
    type="search"
    placeholder="${PLACEHOLDER}"
    value="${esc(ui.query[page])}"
    data-input="ops-search"
    data-page="${page}"
  >
`;


/**
 * إنشاء قائمة العمليات لصفحة البيت أو الاستثمار.
 */
function pageList(state, page) {

  // أنواع العمليات المسموح بعرضها حسب التبويب المحدد.
  // null تعني عدم التصفية حسب النوع.
  const types = activeTab(page)[2];

  // نص البحث بعد إزالة المسافات من البداية والنهاية.
  const q = ui.query[page].trim();

  // الفترة الزمنية المحددة في واجهة التطبيق.
  const period = currentPeriod();


  // تصفية العمليات وفق الشروط التالية:
  // 1. العملية مرتبطة بالقطاع الحالي.
  // 2. نوع العملية مسموح به في التبويب، إن وُجد.
  // 3. إذا لم يوجد بحث، يجب أن تقع العملية ضمن الفترة المحددة.
  //
  // عند وجود نص بحث، لا نقيّد النتائج بالفترة الزمنية هنا.
  let list = state.tx.filter(t =>
    (t.sector === page || t.toSector === page) &&
    (!types || types.includes(t.type)) &&
    (q || inPeriod(t.date, period))
  );


  // إذا كتب المستخدم نصاً للبحث، نمرر العمليات المطابقة
  // مبدئياً إلى محرك البحث للحصول على النتائج النهائية.
  if (q) {
    list = searchTx(state, list, q);
  }


  // تحديد ما إذا كان التبويب يعرض نوعاً واحداً فقط،
  // مع استثناء التحويلات من حساب الإجمالي الظاهر.
  const single =
    types &&
    types.length === 1 &&
    types[0] !== 'transfer';


  // جمع مبالغ العمليات الموجودة في القائمة الحالية.
  const total = list.reduce((s, t) => s + t.amount, 0);


  // تجهيز الجزء العلوي الذي يعرض عدد النتائج أو العمليات
  // وإجمالي المبالغ عند الحاجة.
  let head = '';

  if (q) {

    // عند البحث، نوضح عدد النتائج وأنها تشمل كل الفترات.
    // إذا كان التبويب لنوع واحد، نعرض مجموع مبالغ النتائج.
    head = `
      <div class="tsum">
        <span>${list.length} نتيجة · كل الفترات</span>
        ${single ? `<b>${fmt(total)}</b>` : ''}
      </div>
    `;

  } else if (single) {

    // دون بحث، إذا كان التبويب لنوع واحد،
    // نعرض عدد العمليات وإجمالي مبالغها.
    head = `
      <div class="tsum">
        <span>${list.length} عملية</span>
        <b>${fmt(total)}</b>
      </div>
    `;
  }


  // إعادة الجزء العلوي متبوعاً بقائمة العمليات.
  // ui.limit[page] يحدد عدد العمليات المعروضة.
  return head + txList(state, list, ui.limit[page], page);
}


/**
 * إنشاء قائمة جميع العمليات، دون الاقتصار على قطاع محدد.
 */
export function allOpsList(state) {

  // نص البحث العام.
  const q = ui.query.all.trim();

  // عند البحث نستخدم محرك البحث على جميع العمليات.
  // وإلا نعرض العمليات الواقعة ضمن الفترة المحددة.
  const list = q
    ? searchTx(state, state.tx, q)
    : state.tx.filter(t => inPeriod(t.date, currentPeriod()));


  // عند البحث، نعرض عدد النتائج ونوضح أنها تشمل كل الفترات.
  const head = q
    ? `<div class="tsum"><span>${list.length} نتيجة · كل الفترات</span></div>`
    : '';


  // إنشاء قائمة العمليات العامة وفق الحد المعروض حالياً.
  return head + txList(state, list, ui.limit.all, 'all');
}


/**
 * إنشاء كتلة العمليات في صفحة البيت أو الاستثمار.
 */
export function opsBlock(state, page) {

  // معرفة معرّف التبويب المحدد.
  const active = activeTab(page)[0];


  // إنشاء أزرار التبويبات.
  // نضيف الكلاس on إلى التبويب النشط لتمييزه بصرياً.
  const tabs = TABS[page].map(([k, l]) => `
    <button
      class="tab${k === active ? ' on' : ''}"
      data-action="ops-tab"
      data-page="${page}"
      data-tab="${k}"
    >${l}</button>
  `).join('');


  // إرجاع التبويبات وحقل البحث وقائمة العمليات.
  // يحمل عنصر القائمة معرّفاً خاصاً بكل صفحة.
  return `
    <div class="tabs">${tabs}</div>
    ${searchBox(page)}
    <div id="ops-${page}">
      ${pageList(state, page)}
    </div>
  `;
}


/**
 * التعامل مع الكتابة داخل حقل البحث.
 */
onInput('ops-search', (d, el) => {

  // حفظ نص البحث في حالة واجهة المستخدم للصفحة المطلوبة.
  ui.query[d.page] = el.value;

  // تحديد عدد النتائج المعروضة:
  // - في القائمة العامة: 30 عند البحث، و10 بدونه.
  // - في صفحات البيت والاستثمار: 30.
  ui.limit[d.page] =
    d.page === 'all'
      ? (el.value.trim() ? 30 : 10)
      : 30;


  // الوصول إلى عنصر قائمة العمليات الخاص بالصفحة.
  const slot = document.getElementById('ops-' + d.page);

  // إذا كان العنصر موجوداً، نحدّث محتواه مباشرةً
  // دون إعادة رسم الصفحة كاملة.
  if (slot) {
    slot.innerHTML =
      d.page === 'all'
        ? allOpsList(store.state)
        : pageList(store.state, d.page);
  }
});


/**
 * عند الضغط على أحد تبويبات العمليات.
 */
onClick('ops-tab', d => {

  // حفظ التبويب الذي اختاره المستخدم.
  ui.tab[d.page] = d.tab;

  // إعادة الحد المعروض إلى 30 عملية.
  ui.limit[d.page] = 30;

  // إعادة تحديث الصفحة لعرض العمليات وفق التبويب الجديد.
  refresh();
});


/**
 * عند الضغط على زر عرض المزيد.
 */
onClick('ops-more', d => {

  // زيادة الحد المعروض بمقدار 30 عملية إضافية.
  ui.limit[d.page] += 30;

  // إعادة رسم القائمة لإظهار العمليات الإضافية.
  refresh();
});
