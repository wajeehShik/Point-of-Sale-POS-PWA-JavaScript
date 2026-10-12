// استيراد الوحدات المعتمدة في التطبيق والاقتراحات الافتراضية للمصروفات
import { UNITS, EXPENSE_DEFAULTS } from '../../core/constants.js';

// استيراد دالة تنسيق المبالغ المالية
import { fmt } from '../../core/format.js';

// استيراد دالة جلب آخر سعر وحدة مسجل لصنف معين
import { lastUnitPrice } from '../../domain/analytics.js';

// استيراد أدوات التعامل مع عناصر الصفحة وحماية النصوص عند عرضها
import { esc, $ } from '../dom.js';

// استيراد نظام التعامل مع النقر على الأزرار
import { onClick } from '../actions.js';

// استيراد نافذة النموذج التي تحتوي على نموذج المصروف
import { sheet } from '../sheet.js';

// استيراد دوال إنشاء الحقول وقراءة قيمها وتعبئتها
import {
  sectorField,
  numberField,
  accountField,
  val,
  setValue
} from './fields.js';

/**
 * إنشاء اقتراحات لأسماء أصناف المصروفات.
 *
 * state: بيانات التطبيق.
 * ctx: القسم الحالي، مثل home أو invest.
 */
function suggestions(state, ctx) {
  // إذا كان القسم محدداً، نستخدم اقتراحاته الافتراضية فقط.
  // إذا لم يكن محدداً، نجمع اقتراحات قسمي المنزل والاستثمار.
  const base = ctx
    ? EXPENSE_DEFAULTS[ctx]
    : [...EXPENSE_DEFAULTS.home, ...EXPENSE_DEFAULTS.invest];

  // استخراج أسماء الأصناف المستخدمة سابقاً في عمليات المصروفات.
  // إذا كان هناك قسم محدد، نعرض أصناف ذلك القسم فقط.
  const used = state.tx
    .filter(t => t.type === 'expense' && (!ctx || t.sector === ctx))
    .map(t => t.category);

  // دمج الأصناف السابقة والافتراضية، مع إزالة الأسماء المكررة.
  // ثم تحويل كل صنف إلى خيار داخل قائمة الاقتراحات.
  return [...new Set([...used, ...base])]
    .map(c => `<option value="${esc(c)}">`)
    .join('');
}

/**
 * تحديد وحدة قياس المصروف وتحديث شكل أزرار الوحدات.
 *
 * f: نموذج المصروف.
 * unit: الوحدة المراد اختيارها.
 * manual: هل اختار المستخدم الوحدة بنفسه؟
 */
function setUnit(f, unit, manual) {
  // إذا كانت الوحدة موجودة وليست ضمن الوحدات الافتراضية،
  // نعتبرها وحدة مخصصة أدخلها المستخدم.
  const other = !!unit && !UNITS.includes(unit);

  // حفظ الوحدة المختارة في الحقل المخفي داخل النموذج.
  f.elements.eunit.value = unit || '';

  // تحديث شكل أزرار الوحدات:
  // الزر المختار يحصل على الفئة on.
  // وإذا كانت الوحدة مخصصة، يتم تفعيل زر "أخرى".
  document.querySelectorAll('#units .u').forEach(b =>
    b.classList.toggle(
      'on',
      b.dataset.unit === unit ||
      (b.dataset.unit === '__other' && other)
    )
  );

  // الوصول إلى حقل كتابة الوحدة المخصصة.
  const eo = f.elements.eother;

  // إظهار حقل الوحدة المخصصة فقط عند اختيار وحدة غير افتراضية.
  eo.style.display = other ? 'block' : 'none';

  // إذا كانت الوحدة مخصصة، نضع اسمها في حقل الكتابة.
  if (other) eo.value = unit;

  // تسجيل أن المستخدم غيّر الوحدة بنفسه، إذا كان manual يساوي true.
  // يساعد ذلك على منع اقتراح وحدة تلقائياً فوق اختياره.
  if (manual) f.dataset.touched = '1';
}

/**
 * التعامل مع الضغط على أزرار اختيار الوحدة.
 *
 * هذا المستمع يعمل عند الضغط على زر يحمل data-action="unit-pick".
 */
onClick('unit-pick', d => {
  // الحصول على النموذج المفتوح حالياً داخل النافذة.
  const f = sheet.form;

  // إذا اختار المستخدم "أخرى"، نفتح حقل كتابة الوحدة.
  if (d.unit === '__other') {
    // مسح الوحدة المخفية وتسجيل التغيير اليدوي.
    setUnit(f, '', true);

    // تفعيل زر "أخرى" بصرياً.
    $('#units [data-unit="__other"]').classList.add('on');

    // إظهار حقل كتابة الوحدة المخصصة.
    f.elements.eother.style.display = 'block';

    // تفريغ الحقل ليكتب المستخدم الوحدة المطلوبة.
    f.elements.eother.value = '';

    // وضع مؤشر الكتابة داخل الحقل مباشرة.
    f.elements.eother.focus();

  } else {
    // إذا ضغط المستخدم على الوحدة المختارة نفسها،
    // نلغي اختيارها؛ وإلا نختار الوحدة الجديدة.
    setUnit(
      f,
      f.elements.eunit.value === d.unit ? '' : d.unit,
      true
    );
  }

  // إطلاق حدث input لتحديث الحسابات التي تعتمد على قيم النموذج،
  // مثل سعر الوحدة المعروض أسفل الحقول.
  f.dispatchEvent(new Event('input', { bubbles: true }));
});

/**
 * إعداد نموذج إضافة المصروف أو تعديله.
 */
export default {

  /**
   * إنشاء HTML الخاص بنموذج المصروف.
   *
   * env يحتوي على بيانات الصفحة، ومنها state وctx.
   */
  render(env) {
    // إنشاء زر لكل وحدة افتراضية.
    // عند الضغط عليه، يرسل الزر اسم الوحدة إلى نظام actions.
    const units = UNITS
      .map(u =>
        `<button
          type="button"
          class="u"
          data-action="unit-pick"
          data-unit="${u}"
        >${u}</button>`
      )
      .join('')

      // إضافة زر لاختيار وحدة غير موجودة في القائمة.
      + '<button type="button" class="u" data-action="unit-pick" data-unit="__other">أخرى</button>';

    // إرجاع حقول النموذج بالترتيب.
    return sectorField(env)

      // حقل اسم الصنف مع اقتراحات الأصناف السابقة والافتراضية.
      + `<label>
          الصنف
          <input
            name="category"
            list="items"
            placeholder="مثال: بطاطا"
            autocomplete="off"
          >
          <datalist id="items">
            ${suggestions(env.state, env.ctx)}
          </datalist>
        </label>

        <!-- صف يحتوي على حقل الكمية وحقل السعر الإجمالي -->
        <div class="row">
          ${numberField('eqty', 'الكمية (اختياري)', '5')}
          ${numberField('amount', 'السعر الإجمالي', 'المبلغ')}
        </div>

        <!-- عنوان قسم اختيار وحدة القياس -->
        <div class="lbl">الوحدة</div>

        <!-- أزرار الوحدات المتاحة -->
        <div class="units" id="units">${units}</div>

        <!-- حقل مخفي لحفظ الوحدة المختارة -->
        <input type="hidden" name="eunit">

        <!-- حقل يظهر عند اختيار "أخرى" لكتابة وحدة مخصصة -->
        <input
          name="eother"
          placeholder="اكتب الوحدة"
          style="display:none;margin-top:-4px;margin-bottom:12px"
          autocomplete="off"
        >

        <!-- مكان عرض سعر الوحدة وآخر سعر مسجل للصنف -->
        <div class="total" id="uprice"></div>`

      // إضافة حقل اختيار الحساب الذي دُفع منه المصروف.
      + accountField(env.state, 'الحساب الذي دُفع منه');
  },

  /**
   * التعامل مع الكتابة داخل النموذج.
   *
   * f: النموذج.
   * e: الحدث الذي وقع.
   */
  input(f, e) {
    // إذا كتب المستخدم في حقل الوحدة المخصصة،
    // نسجل أن الوحدة تم تعديلها يدوياً.
    if (e.target.name === 'eother') {
      f.dataset.touched = '1';
    }
  },

  /**
   * تحديث المعلومات المحسوبة أسفل حقول المصروف.
   *
   * يتم استدعاؤها عند تحديث النموذج بحسب نظام التطبيق.
   */
  sync(f, { state, editId }) {
    // الوصول إلى حقل الوحدة المخصصة.
    const eo = f.elements.eother;

    // إذا كان حقل الوحدة المخصصة ظاهراً،
    // ننقل قيمته إلى الحقل المخفي بعد إزالة المسافات الزائدة.
    if (eo.style.display !== 'none') {
      f.elements.eunit.value = eo.value.trim();
    }

    // قراءة اسم الصنف وإزالة المسافات الزائدة.
    const item = val(f, 'category').trim();

    // إذا لم يحدد المستخدم وحدة، ولم يغيّرها يدوياً،
    // وكان اسم الصنف موجوداً، نحاول اقتراح آخر وحدة استُخدمت له.
    if (!f.elements.eunit.value && !f.dataset.touched && item) {
      // البحث عن آخر سعر ووحدة مسجلين لهذا الصنف.
      // تمرير editId يساعد على استثناء العملية الجاري تعديلها،
      // إذا كانت الدالة lastUnitPrice تدعم ذلك.
      const last = lastUnitPrice(state, item, '', editId);

      // إذا وُجدت وحدة في العملية السابقة، نختارها تلقائياً.
      if (last && last.eunit) {
        setUnit(f, last.eunit);
      }
    }

    // قراءة الكمية والسعر الإجمالي والوحدة الحالية.
    const q = +val(f, 'eqty');
    const amount = +val(f, 'amount');
    const unit = val(f, 'eunit').trim();

    // مصفوفة ستحتوي على الأسطر التي ستظهر للمستخدم.
    const lines = [];

    // إذا كانت الكمية والمبلغ أكبر من صفر،
    // نحسب سعر الوحدة الواحدة ونعرضه.
    if (q > 0 && amount > 0) {
      lines.push(
        `سعر ${unit || 'الوحدة'}: <b>${fmt(amount / q)}</b>`
      );
    }

    // البحث عن آخر سعر مسجل لهذا الصنف والوحدة الحالية.
    const last = item
      ? lastUnitPrice(state, item, unit, editId)
      : null;

    // إذا وُجد سعر سابق، نعرضه مع الوحدة والتاريخ.
    if (last) {
      lines.push(
        `آخر مرة: ${fmt(last.unitPrice)}` +
        `${last.eunit ? ' / ' + esc(last.eunit) : ''}` +
        ` (${last.date})`
      );
    }

    // تحديث عنصر عرض المعلومات بالسطرين المحسوبين.
    // يتم استخدام innerHTML لأن السطور تحتوي على وسوم HTML.
    $('#uprice').innerHTML = lines.join('<br>');
  },

  /**
   * تعبئة النموذج عند تعديل مصروف موجود.
   *
   * f: النموذج.
   * t: بيانات المصروف القديم.
   */
  fill(f, t) {
    // تعبئة القسم الذي ينتمي إليه المصروف.
    setValue(f, 'sector', t.sector);

    // تعبئة اسم الصنف.
    setValue(f, 'category', t.category);

    // تعبئة الكمية إذا كانت محفوظة.
    setValue(f, 'eqty', t.eqty);

    // تعبئة السعر الإجمالي.
    setValue(f, 'amount', t.amount);

    // تحديد الحساب الذي دُفع منه المصروف.
    setValue(f, 'account', t.account);

    // تسجيل أن النموذج يحتوي على اختيار سابق،
    // لمنع تغيير الوحدة تلقائياً عند التعديل.
    f.dataset.touched = '1';

    // اختيار وحدة المصروف القديمة وتحديث شكل الأزرار.
    setUnit(f, t.eunit || '');
  },

  /**
   * قراءة القيم النهائية من النموذج قبل الحفظ.
   *
   * val() مسؤولة عن قراءة قيمة الحقل المحدد.
   */
  read: f => ({
    sector: val(f, 'sector'),     // القسم
    category: val(f, 'category'), // اسم الصنف
    amount: val(f, 'amount'),     // السعر الإجمالي
    eqty: val(f, 'eqty'),         // الكمية
    eunit: val(f, 'eunit'),       // وحدة القياس
    account: val(f, 'account'),   // الحساب الذي دُفع منه
  }),
};