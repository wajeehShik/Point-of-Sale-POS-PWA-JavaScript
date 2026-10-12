
/**
 * أنواع العمليات المالية، ودالة تحديد الإشارة المالية للعملية.
 */
import { TX_TYPES, signed } from '../domain/txTypes.js';

// البحث عن أسماء الحسابات والمنتجات والعمليات المرتبطة.
import {
  accountName,
  productName,
  findTx
} from '../domain/lookup.js';

// تحويل أسماء القطاعات إلى تسميات عربية.
import { sectorLabel } from '../core/constants.js';

// تنسيق التاريخ لعرضه للمستخدم.
import { dayLabel } from '../core/dates.js';

// تنسيق المبالغ المالية.
import { fmt } from '../core/format.js';

// حماية النصوص التي تُعرض داخل HTML.
import { esc } from './dom.js';

// إنشاء رسالة عند عدم وجود عمليات.
import { emptyBox } from './components.js';


/**
 * إنشاء الوصف الرئيسي للعملية.
 *
 * s: حالة التطبيق.
 * t: العملية المراد عرضها.
 *
 * يختلف الوصف حسب نوع العملية:
 * البيع والشراء يعرضان اسم المنتج والكمية،
 * وسداد الدين يعرض معلومات الدين المرتبط،
 * والتحويل يعرض القطاعين،
 * والمصروف يعرض التصنيف والكمية إن وجدت.
 */
function rowLabel(s, t) {

  // الحصول على الاسم العربي لنوع العملية.
  const type = TX_TYPES[t.type].label;

  switch (t.type) {

    // وصف عملية البيع أو الشراء.
    case 'sale':
    case 'purchase':
      return `${type} ${productName(s, t.productId)} × ${t.qty}`;


    // وصف عملية سداد الدين.
    case 'debtpay': {

      // البحث عن العملية الأصلية التي يرتبط بها السداد.
      const p = findTx(s, t.ref);

      // عرض اسم المنتج والمورّد إذا توفرت معلوماتهما.
      return 'سداد دين'
        + (p ? ' · ' + productName(s, p.productId) : '')
        + (p && p.supplier ? ' · ' + p.supplier : '');
    }


    // وصف التحويل بين القطاعات.
    case 'transfer':
      return `${sectorLabel(t.sector)} ← ${sectorLabel(t.toSector)}`;


    // وصف المصروف مع تفاصيل الكمية إن وجدت.
    case 'expense': {

      // إذا كانت هناك كمية ووحدة، نعرضهما معاً.
      // وإلا نستخدم الوصف النصي للكمية إن كان موجوداً.
      const q = t.eqty
        ? `${t.eqty} ${t.eunit || ''}`.trim()
        : (t.qtyText || '');

      // اسم التصنيف، مع تفاصيل الكمية اختيارياً.
      return t.category + (q ? ' · ' + q : '');
    }


    // بقية العمليات تعرض التصنيف الخاص بها.
    default:
      return t.category;
  }
}


/**
 * إنشاء المعلومات الثانوية التي تظهر أسفل وصف العملية.
 *
 * scoped: هل القائمة تخص قطاعاً واحداً،
 * مثل البيت أو الاستثمار، أم تعرض جميع القطاعات؟
 */
function rowMeta(s, t, scoped) {

  // التحويل يعرض اسم الحساب المصدر والحساب المستقبِل.
  if (t.type === 'transfer') {
    return `${accountName(s, t.account)} ← ${accountName(s, t.toAccount)}`;
  }

  // في قائمة قطاع محدد لا نحتاج إلى تكرار اسم القطاع.
  // أما في القائمة العامة فنضيف اسم القطاع.
  const prefix = scoped ? '' : sectorLabel(t.sector) + ' · ';


  // إذا كانت العملية بالدين، نعرض كلمة "بالدين"
  // واسم المورّد إن كان مسجلاً.
  // وإلا نعرض الحساب الذي تمت العملية من خلاله.
  let meta = t.credit
    ? `${prefix}بالدين${t.supplier ? ' · ' + t.supplier : ''}`
    : `${prefix}${accountName(s, t.account)}`;


  // في عمليات البيع، نعرض الربح المحسوب من المبلغ
  // مطروحاً منه تكلفة البضاعة المباعة.
  if (t.type === 'sale') {
    meta += ` · ربح ${fmt(t.amount - (t.cogs || 0))}`;
  }


  // في المصروفات التي لها سعر وحدة ووحدة قياس،
  // نعرض سعر الوحدة بجانب المعلومات الثانوية.
  if (t.type === 'expense' && t.unitPrice && t.eunit) {
    meta += ` · ${fmt(t.unitPrice)}/${t.eunit}`;
  }

  return meta;
}


/**
 * إنشاء صف عملية مالية واحدة.
 *
 * الصف قابل للضغط، وعند الضغط عليه يُفتح نموذج تعديل العملية.
 */
function row(s, t, scoped) {

  // تحديد الإشارة المالية للعملية بحسب قواعد signed().
  const v = signed(t);

  // التحويل والعمليات التي تمت بالدين تعرض المبلغ دون
  // إشارة + أو -، وفقاً لطريقة العرض المعتمدة في التطبيق.
  const plain = t.type === 'transfer' || t.credit;


  // تحديد لون المبلغ:
  // warn للعملية بالدين،
  // بدون لون خاص للتحويل،
  // pos للمبلغ الموجب،
  // neg للمبلغ السالب.
  const cls = t.credit
    ? 'warn'
    : plain
      ? ''
      : v > 0
        ? 'pos'
        : 'neg';


  // تحديد الإشارة الظاهرة بجانب المبلغ.
  // لا نضع إشارة للتحويل أو العمليات بالدين.
  const sign = plain
    ? ''
    : v > 0
      ? '+'
      : '-';


  // بناء HTML الخاص بالعملية.
  return `
    <div
      class="row-i"
      data-action="tx-edit"
      data-id="${t.id}"
    >

      <!-- الأيقونة الخاصة بنوع العملية -->
      <span class="ic">${TX_TYPES[t.type].icon}</span>

      <!-- وصف العملية ومعلوماتها الثانوية -->
      <div class="mid">
        ${esc(rowLabel(s, t))}
        <span>${esc(rowMeta(s, t, scoped))}</span>
      </div>

      <!-- المبلغ مع الإشارة واللون المناسبين -->
      <b class="${cls}">${sign}${fmt(t.amount)}</b>

      <span class="chev">‹</span>
    </div>
  `;
}


/**
 * إنشاء عنوان اليوم مع صافي العمليات المسجلة فيه.
 *
 * day: تاريخ العمليات.
 * v: صافي اليوم الذي تم حسابه باستخدام signed().
 */
const dayHeader = (day, v) => `
  <div class="dh">

    <!-- عرض التاريخ -->
    <span>${dayLabel(day)}</span>

    <!-- عرض صافي اليوم بإشارة ولون مناسبين -->
    <b class="${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">
      ${v ? (v > 0 ? '+' : '-') + fmt(Math.abs(v)) : ''}
    </b>

  </div>
`;


/**
 * عرض قائمة العمليات المالية مجمّعة حسب اليوم.
 *
 * state: بيانات التطبيق.
 * list: العمليات التي اجتازت الفلاتر والبحث.
 * limit: الحد الأقصى للعمليات المعروضة.
 * page: اسم الصفحة، مثل home أو invest أو all.
 */
export function txList(state, list, limit, page = '') {

  // إذا كانت القائمة تخص البيت أو الاستثمار،
  // نعتبرها قائمة قطاع محدد.
  // أما الصفحة all فتعرض العمليات من جميع القطاعات.
  const scoped = !!page && page !== 'all';


  // نسخ القائمة ثم ترتيب العمليات من الأحدث إلى الأقدم.
  // عند تساوي التاريخ، نرتب حسب المعرّف تنازلياً.
  // النسخ يمنع تعديل ترتيب المصفوفة الأصلية.
  const rows = [...list].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.id.localeCompare(a.id)
  );


  // إذا لم توجد عمليات مطابقة، نعرض رسالة مناسبة.
  if (!rows.length) {
    return emptyBox(
      state.tx.length
        ? 'ما في عمليات بهذا الفلتر.'
        : 'ما في عمليات بعد. اضغط ＋ لإضافة أول عملية.'
    );
  }


  /**
   * حساب صافي كل يوم.
   *
   * المفتاح هو التاريخ، والقيمة هي مجموع signed(t)
   * لكل العمليات المسجلة في ذلك اليوم.
   *
   * ملاحظة: هذا الحساب يشمل كل عناصر rows،
   * حتى العمليات التي لن تظهر بسبب limit.
   */
  const net = {};

  rows.forEach(t => {
    net[t.date] = (net[t.date] || 0) + signed(t);
  });


  // بدء إنشاء القائمة.
  let html = '<div class="list">';

  // حفظ تاريخ آخر مجموعة عرضنا عنوانها.
  let day = '';


  // عرض أول limit عملية فقط.
  for (const t of rows.slice(0, limit)) {

    // إذا انتقلنا إلى يوم مختلف، نعرض عنوان اليوم وصافيه.
    if (t.date !== day) {
      day = t.date;
      html += dayHeader(day, net[day] || 0);
    }

    // إضافة صف العملية الحالية.
    html += row(state, t, scoped);
  }


  // إغلاق عنصر القائمة.
  html += '</div>';


  // إذا كانت القائمة مرتبطة بصفحة محددة
  // ويوجد المزيد من العمليات غير المعروضة،
  // نظهر زر "عرض المزيد".
  if (page && rows.length > limit) {
    html += `
      <button
        class="btn alt"
        data-action="ops-more"
        data-page="${page}"
      >
        عرض المزيد (${rows.length - limit})
      </button>
    `;
  }

  return html;
}
