
/**
 * استيراد خدمة حفظ التفضيلات واسترجاعها.
 * تُستخدم لتذكر الفترة التي اختارها المستخدم.
 */
import { prefs } from '../data/prefs.js';

// الوصول إلى بيانات التطبيق، مثل العمليات ويوم بداية الدورة.
import { store } from '../data/store.js';

// دوال التعامل مع الفترات الزمنية:
// cycleRange: حساب حدود دورة مالية.
// monthsOf: استخراج الأشهر التي تحتوي على بيانات.
// resolve: تحديد بداية الفترة ونهايتها الفعليتين.
// label: إنشاء وصف نصي للفترة.
// effective: تحديد الخيار الفعلي المحدد حالياً.
import {
  cycleRange,
  monthsOf,
  resolve,
  label,
  effective
} from '../domain/period.js';

// تحويل الأشهر والتواريخ إلى نصوص مناسبة للعرض.
import { monthName, shortDate } from '../core/dates.js';

// إرجاع تاريخ اليوم بصيغة مناسبة للاستخدام في التطبيق.
import { today } from '../core/format.js';

// ربط أحداث تغيير القيم والضغط.
import { onChange, onClick } from './actions.js';

// إعادة تعيين حدود عرض القوائم بعد تغيير الفترة.
import { resetLimits } from './state.js';

// تحديث الواجهة بعد تغيير الفترة.
import { refresh } from './router.js';


/**
 * حالة اختيار الفترة الزمنية.
 *
 * v: نوع الفترة المحددة.
 * from: تاريخ البداية للنطاق المخصص.
 * to: تاريخ النهاية للنطاق المخصص.
 *
 * نسترجع القيم المحفوظة سابقاً، إن وُجدت.
 */
const sel = {
  v: prefs.get('mali_per'),
  from: prefs.get('mali_pf'),
  to: prefs.get('mali_pt')
};


/**
 * حفظ إعدادات الفترة الحالية في التخزين.
 * حتى تبقى اختيارات المستخدم بعد إعادة فتح التطبيق.
 */
const save = () => {
  prefs.set('mali_per', sel.v);
  prefs.set('mali_pf', sel.from);
  prefs.set('mali_pt', sel.to);
};


/**
 * إرجاع الفترة الزمنية الفعلية المستخدمة في التصفية.
 * تعتمد النتيجة على الاختيار الحالي وبيانات التطبيق.
 */
export const currentPeriod = () => resolve(sel, store.state);


/**
 * إرجاع وصف نصي للفترة المحددة.
 * يمكن استخدامه في عناوين التقارير أو الإحصائيات.
 */
export const periodText = () => label(sel, store.state);


/**
 * تغيير الفترة الزمنية المحددة.
 *
 * v: معرّف الفترة الجديدة، مثل today أو range أو اسم شهر.
 */
export function setPeriod(v) {
  // حفظ نوع الفترة الجديد.
  sel.v = v;

  // إذا اختار المستخدم نطاقاً مخصصاً ولم تكن تواريخه مكتملة،
  // ننشئ نطاقاً افتراضياً.
  if (v === 'range' && (!sel.from || !sel.to)) {

    // يوم بداية الدورة المالية، والافتراضي هو اليوم الأول.
    const cd = store.state.cycleDay || 1;

    // إذا كانت الدورة تبدأ بعد اليوم الأول من الشهر،
    // نستخدم بداية الدورة الحالية.
    // وإلا نبدأ من أول يوم في الشهر الحالي.
    sel.from = cd > 1
      ? cycleRange(cd, 0).from
      : today().slice(0, 7) + '-01';

    // نهاية النطاق الافتراضي هي تاريخ اليوم.
    sel.to = today();
  }

  // حفظ الاختيار الجديد.
  save();

  // إعادة تعيين حدود عرض العمليات حتى لا تبقى القائمة
  // مقيدة بحد قديم من الفترة السابقة.
  resetLimits();

  // إعادة تحديث الواجهة لعرض البيانات الجديدة.
  refresh();
}


/**
 * تعديل تاريخ البداية أو النهاية للنطاق المخصص.
 *
 * key: إما from أو to.
 * value: التاريخ الجديد.
 */
function setRange(key, value) {
  // تجاهل القيمة الفارغة حتى لا نستبدل التاريخ الحالي بها.
  if (!value) return;

  // تحديث التاريخ الذي تغيّر.
  sel[key] = value;

  // إذا أصبحت البداية بعد النهاية، نبدّل التاريخين.
  // الهدف هو إبقاء بداية النطاق قبل نهايته.
  if (sel.from > sel.to) {
    [sel.from, sel.to] = [sel.to, sel.from];
  }

  // حفظ النطاق الجديد.
  save();

  // إعادة تعيين حدود القوائم.
  resetLimits();

  // تحديث الواجهة بناءً على النطاق الجديد.
  refresh();
}


/**
 * إنشاء شريط اختيار الفترة الزمنية.
 *
 * state: بيانات التطبيق المستخدمة لاستخراج الأشهر والدورة.
 */
export function periodBar(state) {

  // يوم بداية الدورة المالية، والافتراضي هو اليوم الأول.
  const cd = state.cycleDay || 1;

  // معرفة الخيار الفعلي الذي يجب إظهاره كمحدد.
  const eff = effective(sel, state);

  // استخراج الشهر الحالي بصيغة YYYY-MM.
  const thisMonth = today().slice(0, 7);


  /**
   * إنشاء خيار داخل قائمة HTML.
   *
   * val: القيمة التي سيعيدها عنصر select.
   * text: النص الذي يظهر للمستخدم.
   *
   * نضيف selected إذا كان هذا هو الخيار الفعلي.
   */
  const opt = (val, text) =>
    `<option value="${val}"${eff === val ? ' selected' : ''}>${text}</option>`;


  // إضافة الخيارات الأساسية:
  // كل الفترات، ثم اليوم.
  let h =
    opt('', 'كل الفترات') +
    opt('today', 'اليوم');


  // إذا كانت الدورة تبدأ في يوم مختلف عن أول الشهر،
  // نعرض الدورة الحالية والدورة السابقة.
  if (cd > 1) {

    // حساب حدود الدورة الحالية والدورة السابقة.
    const a = cycleRange(cd, 0);
    const b = cycleRange(cd, 1);

    // إضافة الدورة الحالية مع تاريخ البداية والنهاية.
    h += opt(
      'c0',
      `الدورة الحالية (${shortDate(a.from)} – ${shortDate(a.to)})`
    );

    // إضافة الدورة السابقة مع تاريخ البداية والنهاية.
    h += opt(
      'c1',
      `الدورة السابقة (${shortDate(b.from)} – ${shortDate(b.to)})`
    );
  }


  // إضافة الأشهر التي تحتوي على بيانات في التطبيق.
  // نضيف عبارة توضيحية بجانب الشهر الحالي.
  h += monthsOf(state)
    .map(m => opt(
      m,
      monthName(m) + (m === thisMonth ? ' (هذا الشهر)' : '')
    ))
    .join('');


  // إضافة خيار تحديد نطاق زمني مخصص.
  h += opt('range', 'نطاق مخصص…');


  // إذا كان الخيار الفعلي هو النطاق المخصص،
  // نستخرج تاريخ البداية والنهاية لعرض حقلي التاريخ.
  const r = eff === 'range' ? resolve(sel, state) : null;


  // إنشاء حقلي البداية والنهاية عند اختيار نطاق مخصص.
  const range = r
    ? `<div class="rng">
        <label>
          من
          <input
            type="date"
            value="${r.from}"
            data-change="range-set"
            data-key="from"
          >
        </label>

        <label>
          إلى
          <input
            type="date"
            value="${r.to}"
            data-change="range-set"
            data-key="to"
          >
        </label>
      </div>`
    : '';


  // إرجاع شريط الفترة كاملاً:
  // قائمة اختيار الفترة، وحقلا التاريخ عند الحاجة.
  return `
    <div class="fbar">
      <label>
        📅 الفترة
        <select data-change="period-set">
          ${h}
        </select>
      </label>

      ${range}
    </div>
  `;
}


/**
 * عند تغيير القائمة الرئيسية للفترة،
 * نأخذ القيمة المحددة ونحدّث الفترة.
 */
onChange('period-set', (d, el) => {
  setPeriod(el.value);
});


/**
 * عند تغيير تاريخ البداية أو النهاية،
 * نقرأ اسم الحقل من data-key والقيمة من عنصر التاريخ.
 */
onChange('range-set', (d, el) => {
  setRange(d.key, el.value);
});


/**
 * معالجة أي زر آخر يستخدم data-action="period-pick".
 * يمكن أن يختار فترة محددة مباشرة دون استخدام القائمة.
 */
onClick('period-pick', d => {
  setPeriod(d.per);
});
