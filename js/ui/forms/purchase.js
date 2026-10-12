
/**
 * استيراد دالة تنسيق الأرقام والمبالغ المالية.
 * مثال: عرض تكلفة الوحدة بطريقة مناسبة للمستخدم.
 */
import { fmt } from '../../core/format.js';

/**
 * جلب أسماء المورّدين السابقين من بيانات التطبيق،
 * حتى تظهر اقتراحات عند كتابة اسم المورّد.
 */
import { supplierNames } from '../../domain/lookup.js';

/**
 * esc: حماية النصوص عند إدخالها داخل HTML.
 * $: الوصول إلى عنصر في الصفحة باستخدام المحدد.
 */
import { esc, $ } from '../dom.js';

/**
 * أدوات مشتركة لبناء حقول النموذج وقراءة قيمها وتعديلها.
 */
import {
  opts,
  numberField,
  accountField,
  val,
  setValue
} from './fields.js';

export default {
  /**
   * إنشاء واجهة نموذج شراء المنتجات.
   * يستقبل state، وهي حالة التطبيق الحالية،
   * وتحتوي على المنتجات والحسابات وغيرها.
   */
  render({ state }) {
    // تجهيز أسماء المورّدين السابقين لتظهر كاقتراحات.
    // esc تمنع إدخال نص غير آمن داخل HTML.
    const names = supplierNames(state)
      .map(n => `<option value="${esc(n)}">`)
      .join('');

    return `
      <!-- اختيار منتج موجود أو إضافة منتج جديد -->
      <label>
        المنتج
        <select name="product">
          ${opts(state.products.map(p => [p.id, p.name]))}
          <option value="__new">＋ منتج جديد</option>
        </select>
      </label>

      <!-- يظهر هذا الحقل فقط عند اختيار منتج جديد -->
      <label id="newp" style="display:none">
        اسم المنتج الجديد
        <input name="newname">
      </label>

      <!-- إدخال الكمية والمبلغ الإجمالي للشراء -->
      <div class="row">
        ${numberField('qty', 'الكمية', 'الكمية')}
        ${numberField('amount', 'المبلغ الإجمالي', 'الإجمالي')}
      </div>

      <!-- عرض تكلفة شراء الوحدة الواحدة تلقائيًا -->
      <div class="total">
        تكلفة الوحدة:
        <b id="tot">—</b>
      </div>

      <!-- تحديد ما إذا كان الشراء بالدين -->
      <label class="chk">
        <input type="checkbox" name="credit">
        <span>اشتريتها بالدين (لم أدفع بعد)</span>
      </label>

      <!-- اسم المورّد اختياري، ويظهر عند اختيار الشراء بالدين -->
      <label id="supl" style="display:none">
        اسم المورّد (اختياري)
        <input name="supplier" list="sups" autocomplete="off">

        <!-- اقتراح أسماء المورّدين السابقين -->
        <datalist id="sups">
          ${names}
        </datalist>
      </label>

      <!-- اختيار الحساب الذي خرج منه المبلغ.
           يُخفى عند الشراء بالدين لأن الدفع لم يحدث بعد. -->
      <div id="accl">
        ${accountField(state, 'الحساب الذي دُفع منه')}
      </div>
    `;
  },

  /**
   * تحديث واجهة النموذج عند تغيير الكمية أو المبلغ
   * أو اختيار المنتج أو تغيير حالة الشراء بالدين.
   */
  sync(f) {
    // تحويل الكمية والمبلغ إلى أرقام.
    const q = +val(f, 'qty');
    const a = +val(f, 'amount');

    // معرفة ما إذا كان الشراء بالدين.
    const credit = f.elements.credit.checked;

    // حساب تكلفة الوحدة = المبلغ الإجمالي ÷ الكمية.
    // لا نحسب إذا كانت الكمية أو القيمة غير موجبة.
    $('#tot').textContent =
      q > 0 && a > 0
        ? fmt(a / q)
        : '—';

    // إظهار حقل اسم المنتج الجديد عند اختياره.
    $('#newp').style.display =
      val(f, 'product') === '__new'
        ? 'block'
        : 'none';

    // إظهار اسم المورّد عند الشراء بالدين.
    $('#supl').style.display =
      credit
        ? 'block'
        : 'none';

    // إخفاء اختيار الحساب عند الشراء بالدين،
    // لأن المبلغ لم يُدفع بعد.
    $('#accl').style.display =
      credit
        ? 'none'
        : 'block';
  },

  /**
   * تعبئة النموذج ببيانات عملية شراء سابقة،
   * مثلاً عندما يريد المستخدم تعديل العملية.
   */
  fill(f, t) {
    // تحديد المنتج والكمية والمبلغ الإجمالي.
    setValue(f, 'product', t.productId);
    setValue(f, 'qty', t.qty);
    setValue(f, 'amount', t.amount);

    // استعادة حالة الشراء بالدين.
    // !! تحول القيمة إلى true أو false.
    f.elements.credit.checked = !!t.credit;

    // استعادة اسم المورّد والحساب.
    setValue(f, 'supplier', t.supplier);
    setValue(f, 'account', t.account);
  },

  /**
   * قراءة بيانات النموذج وتجهيزها للحفظ.
   * لا تحفظ هذه الدالة البيانات بنفسها؛
   * بل تعيد القيم للجزء المسؤول عن حفظ العملية.
   */
  read: f => ({
    // معرّف المنتج المختار، أو "__new" إذا كان منتجًا جديدًا.
    productId: val(f, 'product'),

    // اسم المنتج الجديد إذا أدخله المستخدم.
    newName: val(f, 'newname'),

    // كمية المنتجات المشتراة.
    qty: val(f, 'qty'),

    // المبلغ الإجمالي للشراء.
    amount: val(f, 'amount'),

    // هل تم الشراء بالدين؟
    credit: f.elements.credit.checked,

    // اسم المورّد، إن وُجد.
    supplier: val(f, 'supplier'),

    // الحساب الذي دُفع منه المبلغ عند الشراء النقدي.
    account: val(f, 'account'),
  }),
};
