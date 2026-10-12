
/**
 * مخزن بيانات التطبيق، ويحتوي على العمليات والمنتجات والحسابات.
 */
import { store } from '../data/store.js';

// النافذة المنبثقة التي تعرض تفاصيل المورّد وديونه.
import { sheet } from './sheet.js';

// حساب ديون المورّدين وتفاصيل المبالغ المستحقة.
import { supplierDebts } from '../domain/debts.js';

// البحث عن أسماء المنتجات والمحافظ والمورّدين.
import {
  productName,
  accountName,
  supplierNames
} from '../domain/lookup.js';

// خدمات إنشاء الديون وسدادها وتعديل دفعاتها وحذفها.
import {
  saveDebt,
  payDebt,
  savePayment,
  deletePayment,
  settleSupplier
} from '../services/debts.js';

// حذف الدين مع التأكد من العمليات المرتبطة به.
import { deleteWithConfirm } from './deleteFlow.js';

// إنشاء خيارات القوائم المنسدلة للمحافظ.
import { opts, accountOptions } from './forms/fields.js';

// تنسيق الأرقام المالية والتقريب إلى منزلتين عشريتين.
import { fmt, r2 } from '../core/format.js';

// تنسيق تاريخ العملية لعرضه للمستخدم.
import { dayLabel } from '../core/dates.js';

// حد صغير لتجاهل الفروقات المالية الضئيلة.
import { EPS } from '../core/constants.js';

// حماية النصوص من تفسيرها على أنها HTML، وعرض التنبيهات.
import { esc, toast } from './dom.js';

// ربط الأزرار بالأحداث.
import { onClick } from './actions.js';


/**
 * حالة نافذة المورّد الحالية.
 *
 * key: اسم المورّد المحدد.
 * open: معرّف الدين أو الدفعة المفتوحة تفاصيلها.
 * settle: هل نموذج سداد المستحق الجماعي ظاهر؟
 */
const S = {
  key: '',
  open: '',
  settle: false
};


/**
 * جمع قيم مستخرجة من عناصر مصفوفة.
 *
 * مثال:
 * sum(debts, d => d.left)
 * يجمع المبالغ المتبقية في الديون.
 */
const sum = (arr, f) =>
  arr.reduce((a, x) => a + f(x), 0);


/**
 * قراءة قيمة حقل من النموذج المفتوح داخل النافذة.
 *
 * مثال: v('pa') يقرأ مبلغ السداد.
 */
const v = name => sheet.form.elements[name].value;


/**
 * بناء صف دين واحد في قائمة ديون المورّد.
 *
 * state: بيانات التطبيق.
 * d: تفاصيل الدين المحسوبة من supplierDebts().
 */
function debtRow(state, d) {

  // العملية الأصلية التي تمثل شراء البضاعة بالدين.
  const t = d.t;

  // التحقق مما إذا كانت تفاصيل هذا الدين مفتوحة.
  const isOpen = S.open === t.id;

  // حساب الكمية التي لم تُبع بعد.
  const remaining = Math.max(0, t.qty - d.soldQty);


  // تحديد المبلغ الذي سيظهر بجانب الدين:
  // إذا كان هناك مستحق عن البضاعة المباعة، نعرضه.
  // وإلا نعرض المبلغ المتبقي من الدين.
  // وإذا انتهى الدين، نعرض أنه مسدد.
  const amountCell = d.left > EPS
    ? (
        d.due > EPS
          ? `<b class="due">${fmt(d.due)}</b>`
          : `<b class="neg">${fmt(d.left)}</b>`
      )
    : '<b class="pos">مسدد ✓</b>';


  // إنشاء الصف الرئيسي للدين.
  // الضغط عليه يفتح التفاصيل أو يغلقها.
  let h = `
    <div
      class="row-i${isOpen ? ' open' : ''}"
      data-action="sup-toggle"
      data-id="${t.id}"
    >
      <span class="ic">📦</span>

      <div class="mid">
        ${esc(productName(state, t.productId))} × ${t.qty}

        <span>
          ${dayLabel(t.date)}
          · مباع ${r2(d.soldQty)} من ${t.qty}
          ${d.paid > 0 ? ' · مسدد ' + fmt(d.paid) : ''}
        </span>
      </div>

      ${amountCell}
      <span class="chev">‹</span>
    </div>
  `;


  // إذا كانت تفاصيل الدين مغلقة، نكتفي بالصف الرئيسي.
  if (!isOpen) return h;


  // نموذج سداد هذا الدين.
  // لا نعرضه إذا كان الدين مسدداً بالكامل.
  const payBox = d.left > EPS
    ? `
      <div class="paybox">

        <div class="row">
          <label>
            المبلغ
            <input
              name="pa"
              type="number"
              step="any"
              inputmode="decimal"
              value="${r2(d.due > EPS ? d.due : d.left)}"
            >
          </label>

          <label>
            من محفظة
            <select name="pacc">
              ${accountOptions(state)}
            </select>
          </label>
        </div>

        <div class="exb">

          <!-- سداد المستحق عن الكمية المباعة -->
          <button
            type="button"
            class="btn sm"
            data-action="sup-pay"
            data-id="${t.id}"
          >
            ${d.due > EPS ? '💵 سدّد المستحق' : '💵 سداد'}
          </button>

          ${
            // إظهار زر سداد الدين كاملاً إذا كان المتبقي
            // أكبر من المستحق الحالي.
            d.due > EPS && d.left > d.due + EPS
              ? `
                <button
                  type="button"
                  class="btn sm alt"
                  data-action="sup-pay-all"
                  data-id="${t.id}"
                >
                  سداد المتبقي كله
                </button>
              `
              : ''
          }

        </div>
      </div>
    `
    : '';


  // عرض تفاصيل الدين وأرقام الشراء والبيع والسداد.
  return h + `
    <div class="ex">

      <div class="sumbox sm">

        <div class="stat">
          <span>سعر الوحدة من المورّد</span>
          <b>${fmt(d.unit)}</b>
        </div>

        <div class="stat">
          <span>المباع (${r2(d.soldQty)}) · ثمنه للمورّد</span>
          <b>${fmt(d.soldCost)}</b>
        </div>

        <div class="stat">
          <span>مسدد</span>
          <b class="pos">${fmt(d.paid)}</b>
        </div>

        <div class="stat">
          <span>مستحق الآن (عن المباع)</span>
          <b class="${d.due > EPS ? 'due' : ''}">
            ${fmt(d.due)}
          </b>
        </div>

        <div class="stat">
          <span>
            باقي بالمخزون (${r2(remaining)}) · لم يُدفع ثمنه بعد
          </span>
          <b>${fmt(Math.max(0, d.left - d.due))}</b>
        </div>

      </div>

      ${payBox}

      <!-- قسم تعديل بيانات الدين الأصلي -->
      <div class="sh2">تعديل الدين</div>

      <div class="row">
        <label>
          الكمية
          <input
            name="dq"
            type="number"
            step="any"
            inputmode="decimal"
            value="${t.qty}"
          >
        </label>

        <label>
          المبلغ الإجمالي
          <input
            name="da"
            type="number"
            step="any"
            inputmode="decimal"
            value="${t.amount}"
          >
        </label>
      </div>

      <!-- اسم المورّد مع اقتراح أسماء مسجلة سابقاً -->
      <label>
        اسم المورّد
        <input
          name="ds"
          list="sups"
          value="${esc(t.supplier || '')}"
          autocomplete="off"
        >

        <datalist id="sups">
          ${
            supplierNames(state)
              .map(n => `<option value="${esc(n)}">`)
              .join('')
          }
        </datalist>
      </label>

      <div class="exb">

        <button
          type="button"
          class="btn sm"
          data-action="sup-save-debt"
          data-id="${t.id}"
        >
          حفظ التعديل
        </button>

        <button
          type="button"
          class="btn sm dng"
          data-action="sup-del-debt"
          data-id="${t.id}"
        >
          حذف الدين
        </button>

      </div>
    </div>
  `;
}


/**
 * بناء صف دفعة سداد سابقة.
 *
 * x: عملية السداد.
 * ds: ديون المورّد الحالية.
 */
function paymentRow(state, ds, x) {

  // محاولة إيجاد الدين المرتبط بهذه الدفعة.
  const debt = ds.find(d => d.t.id === x.ref);

  // التحقق مما إذا كانت تفاصيل الدفعة مفتوحة.
  const isOpen = S.open === x.id;


  // صف الدفعة الذي يظهر في القائمة.
  let h = `
    <div
      class="row-i${isOpen ? ' open' : ''}"
      data-action="sup-toggle"
      data-id="${x.id}"
    >
      <span class="ic">💵</span>

      <div class="mid">
        ${esc(debt ? productName(state, debt.t.productId) : 'دين')}

        <span>
          ${dayLabel(x.date)}
          · ${esc(accountName(state, x.account))}
        </span>
      </div>

      <b>${fmt(x.amount)}</b>
      <span class="chev">‹</span>
    </div>
  `;


  // عند فتح الدفعة، نعرض نموذج تعديل مبلغها ومحفظتها.
  if (isOpen) {
    h += `
      <div class="ex">

        <div class="row">
          <label>
            المبلغ
            <input
              name="xa"
              type="number"
              step="any"
              inputmode="decimal"
              value="${x.amount}"
            >
          </label>

          <label>
            المحفظة
            <select name="xacc">
              ${opts(state.accounts.map(a => [a.id, a.name]), x.account)}
            </select>
          </label>
        </div>

        <div class="exb">

          <button
            type="button"
            class="btn sm"
            data-action="sup-save-pay"
            data-id="${x.id}"
          >
            حفظ
          </button>

          <button
            type="button"
            class="btn sm dng"
            data-action="sup-del-pay"
            data-id="${x.id}"
          >
            حذف السداد
          </button>

        </div>
      </div>
    `;
  }

  return h;
}


/**
 * بناء قسم سداد المستحق للمورّد.
 *
 * due: المبلغ المستحق حالياً.
 * left: إجمالي الدين المتبقي.
 */
function settleArea(state, due, left) {

  // إذا انتهى الدين بالكامل، نعرض رسالة نجاح.
  if (left <= EPS) {
    return '<div class="okbox">✅ ما في دين متبقي</div>';
  }

  // إذا بقي دين مؤجل عن بضاعة لم تُبع،
  // ولا يوجد مبلغ مستحق الآن، نوضح ذلك للمستخدم.
  if (due <= EPS) {
    return '<div class="okbox">لا يوجد مستحق الآن. كل ما بعت منه مسدد ✓</div>';
  }

  // إذا لم يطلب المستخدم فتح نموذج السداد الجماعي،
  // نعرض زر فتح النموذج فقط.
  if (!S.settle) {
    return `
      <button
        type="button"
        class="btn"
        data-action="sup-settle-toggle"
      >
        💵 سدّد المستحق · ${fmt(due)}
      </button>
    `;
  }

  // نموذج سداد المستحق لجميع ديون المورّد.
  return `
    <div class="paybox">

      <div class="sh2">
        سداد المستحق · بيتوزّع على الديون من الأقدم
      </div>

      <div class="row">
        <label>
          المبلغ
          <input
            name="sa"
            type="number"
            step="any"
            inputmode="decimal"
            value="${r2(due)}"
          >
        </label>

        <label>
          من محفظة
          <select name="sacc">
            ${accountOptions(state)}
          </select>
        </label>
      </div>

      <div class="exb">

        <button
          type="button"
          class="btn sm"
          data-action="sup-settle-go"
        >
          تأكيد السداد
        </button>

        <button
          type="button"
          class="btn sm alt"
          data-action="sup-settle-toggle"
        >
          إلغاء
        </button>

      </div>
    </div>
  `;
}


/**
 * إنشاء كامل محتوى نافذة المورّد.
 *
 * تتضمن النافذة:
 * - ملخص الدين.
 * - المبالغ المستحقة والمدفوعة.
 * - نموذج سداد المستحق.
 * - قائمة الديون.
 * - سجل دفعات السداد.
 */
function render(state) {

  // استخراج ديون المورّد المحدد.
  const ds = supplierDebts(state, S.key);


  // إجمالي المبالغ الأصلية للديون.
  const total = sum(ds, d => d.t.amount);

  // مجموع ما تم سداده حسب الحسابات التي يعيدها domain/debts.js.
  const paid = sum(ds, d => d.paid);

  // مجموع تكلفة البضاعة المباعة التي يحسبها النظام.
  const soldCost = sum(ds, d => d.soldCost);

  // إجمالي المتبقي من الديون، مع منع الأرصدة السالبة.
  const left = sum(ds, d => Math.max(0, d.left));

  // مجموع المستحق الحالي على البضاعة المباعة.
  const due = sum(ds, d => d.due);


  // استخراج عمليات سداد الديون المرتبطة بديون هذا المورّد.
  // نرتبها من الأحدث إلى الأقدم حسب التاريخ والمعرّف.
  const pays = state.tx
    .filter(x =>
      x.type === 'debtpay' &&
      ds.some(d => d.t.id === x.ref)
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.id.localeCompare(a.id)
    );


  // عرض الملخص المالي وقائمة الديون والدفعات.
  return `
    <div class="sumbox">

      <div class="stat">
        <span>إجمالي ما أخذته بالدين</span>
        <b>${fmt(total)}</b>
      </div>

      <div class="stat">
        <span>ثمن المباع منه</span>
        <b>${fmt(soldCost)}</b>
      </div>

      <div class="stat">
        <span>المسدد</span>
        <b class="pos">${fmt(paid)}</b>
      </div>

      <div class="stat sum">
        <span>مستحق الآن (عن المباع)</span>
        <b class="${due > EPS ? 'due' : 'pos'}">
          ${fmt(due)}
        </b>
      </div>

      <div class="stat">
        <span>بضاعة بالمخزون (لم تُدفع بعد)</span>
        <b>${fmt(Math.max(0, left - due))}</b>
      </div>

      <div class="note">
        ما انباع بتدفع ثمنه للمورّد، وربحك هو الفرق بين سعر بيعك وسعره.
        وما لم ينبع بعد بيضل دين مؤجل.
      </div>

    </div>

    <!-- نموذج تسديد المستحق على مستوى المورّد كله -->
    ${settleArea(state, due, left)}

    <div class="sh">
      الدفعات · اضغط على أي دفعة لتفاصيلها وتعديلها
    </div>

    <!-- عرض ديون المورّد -->
    <div class="list">
      ${ds.map(d => debtRow(state, d)).join('')}
    </div>

    ${
      // عرض سجل السدادات فقط إذا كانت هناك دفعات.
      pays.length
        ? `
          <div class="sh">
            السدادات · اضغط للتعديل أو الحذف
          </div>

          <div class="list">
            ${pays.map(x => paymentRow(state, ds, x)).join('')}
          </div>
        `
        : ''
    }
  `;
}


/**
 * تكوين عنوان النافذة من اسم المورّد.
 */
const title = () => '🤝 ' + (S.key || 'بدون مورّد');


/**
 * تحديث محتوى النافذة بعد الحفظ أو السداد أو الحذف.
 */
function redraw() {

  // إذا لم تعد هناك ديون لهذا المورّد، نغلق النافذة.
  if (!supplierDebts(store.state, S.key).length) {
    sheet.close();
    return;
  }

  // تحديث العنوان ثم إعادة رسم المحتوى بأحدث بيانات.
  sheet.setTitle(title());
  sheet.setBody(render(store.state));
}


/**
 * التعامل مع نتيجة أي خدمة مالية.
 *
 * res: النتيجة التي أعادتها الخدمة.
 * message: رسالة النجاح.
 */
function done(res, message) {

  // عند وجود خطأ، نظهره ونوقف بقية الخطوات.
  if (res.error) {
    return toast(res.error, true);
  }

  // إغلاق تفاصيل العنصر المفتوح وإخفاء نموذج السداد الجماعي.
  S.open = '';
  S.settle = false;

  // إظهار رسالة النجاح ثم تحديث بيانات النافذة.
  toast(message);
  redraw();
}


/**
 * فتح نافذة تفاصيل المورّد.
 */
onClick('sup-open', d => {

  // تحديد المورّد الذي ضغط المستخدم عليه.
  S.key = d.key;

  // البدء دون تفاصيل مفتوحة.
  S.open = '';

  // إخفاء نموذج السداد الجماعي.
  S.settle = false;

  // فتح النافذة وعرض تفاصيل المورّد.
  sheet.open({
    title: title(),
    html: render(store.state),

    // تنظيف حالة النافذة عند إغلاقها.
    onClose: () => {
      S.open = '';
      S.settle = false;
    }
  });
});


/**
 * فتح تفاصيل دين أو دفعة، أو إغلاقها إذا كانت مفتوحة.
 */
onClick('sup-toggle', d => {

  // إذا كان العنصر نفسه مفتوحاً، نغلقه.
  // وإلا نفتح العنصر الذي ضغط عليه المستخدم.
  S.open = S.open === d.id ? '' : d.id;

  // إعادة رسم النافذة لإظهار التفاصيل الجديدة.
  redraw();
});


/**
 * حفظ التعديلات على الدين.
 */
onClick('sup-save-debt', d => {

  // قراءة اسم المورّد وإزالة المسافات الزائدة من الطرفين.
  const name = v('ds').trim();

  // إرسال الكمية والمبلغ واسم المورّد إلى خدمة الحفظ.
  const res = saveDebt(d.id, {
    qty: v('dq'),
    amount: v('da'),
    supplier: name
  });

  // إذا تغير اسم المورّد بنجاح، نحدّث المفتاح المستخدم
  // لعرض بيانات المورّد الجديد.
  if (!res.error) S.key = name;

  done(res, 'تم التعديل ✓');
});


/**
 * حذف دين بعد تأكيد المستخدم.
 */
onClick('sup-del-debt', d => {

  // استخدام دالة الحذف المشتركة للتأكد من العملية
  // ومعالجة العلاقات التابعة للدين.
  if (
    deleteWithConfirm(
      d.id,
      'حذف هذا الدين؟ بيرجع المخزون كأنه ما انشترى.'
    )
  ) {
    // إذا نجح الحذف، نحدّث النافذة.
    done({}, 'تم حذف الدين');
  }
});


/**
 * سداد مبلغ محدد من دين واحد.
 */
onClick('sup-pay', d => {

  // قراءة المبلغ والمحفظة المختارة،
  // ثم إرسال البيانات إلى خدمة السداد.
  done(
    payDebt(d.id, {
      amount: v('pa'),
      account: v('pacc')
    }),
    'تم السداد ✓'
  );
});


/**
 * سداد كامل المبلغ المتبقي من دين واحد.
 */
onClick('sup-pay-all', d => {

  // تمرير all: true إلى الخدمة لطلب سداد المتبقي كله.
  // اختيار المحفظة يبقى حسب الحقل الموجود في النموذج.
  done(
    payDebt(d.id, {
      all: true,
      account: v('pacc')
    }),
    'تم السداد ✓'
  );
});


/**
 * تعديل دفعة سداد سابقة.
 */
onClick('sup-save-pay', d => {

  // إرسال معرّف الدفعة والمبلغ والمحفظة الجديدة.
  done(
    savePayment(d.id, {
      amount: v('xa'),
      account: v('xacc')
    }),
    'تم التعديل ✓'
  );
});


/**
 * حذف دفعة سداد سابقة.
 */
onClick('sup-del-pay', d => {

  // تنبيه المستخدم بأن حذف السداد سيزيد الدين المتبقي
  // ويعيد المبلغ إلى المحفظة، إذا كانت الخدمة تنفذ ذلك.
  if (
    confirm(
      'حذف هذا السداد؟ المبلغ بيرجع لمحفظتك والدين بيزيد.'
    )
  ) {
    done(deletePayment(d.id), 'تم حذف السداد');
  }
});


/**
 * إظهار نموذج سداد المستحق الجماعي أو إخفاؤه.
 */
onClick('sup-settle-toggle', () => {

  // تبديل حالة ظهور النموذج.
  S.settle = !S.settle;

  // إعادة الرسم لتحديث واجهة النافذة.
  redraw();
});


/**
 * تأكيد سداد المستحق عن ديون المورّد.
 */
onClick('sup-settle-go', () => {

  // إرسال اسم المورّد والمبلغ والمحفظة إلى الخدمة.
  // بحسب تصميم الخدمة، يتم توزيع السداد على الديون الأقدم.
  done(
    settleSupplier(S.key, {
      amount: v('sa'),
      account: v('sacc')
    }),
    'تم تسجيل السداد ✓'
  );
});
