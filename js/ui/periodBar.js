import { prefs } from '../data/prefs.js';
import { store } from '../data/store.js';

import {
  cycleRange,
  monthsOf,
  resolve,
  label,
  effective
} from '../domain/period.js';

import {
  monthName,
  shortDate
} from '../core/dates.js';

import { today } from '../core/format.js';

import {
  onChange,
  onClick
} from './actions.js';

import { resetLimits } from './state.js';
import { refresh } from './router.js';


/**
 * حالة اختيار الفترة.
 */
const sel = {
  v: prefs.get('mali_per'),
  from: prefs.get('mali_pf'),
  to: prefs.get('mali_pt'),
  day: prefs.get('mali_pd')
};


/**
 * حفظ إعدادات الفترة.
 */
const save = () => {
  prefs.set('mali_per', sel.v);
  prefs.set('mali_pf', sel.from);
  prefs.set('mali_pt', sel.to);
  prefs.set('mali_pd', sel.day);
};


/**
 * إرجاع الفترة الحالية المستخدمة في الحسابات.
 */
export const currentPeriod = () =>
  resolve(sel, store.state);


/**
 * إرجاع اسم الفترة الحالية.
 */
export const periodText = () =>
  label(sel, store.state);


/**
 * تغيير نوع الفترة.
 */
export function setPeriod(v) {
  sel.v = v;

  /*
   * عند اختيار نطاق مخصص
   * نضع تاريخًا ابتدائيًا تلقائيًا.
   */
  if (
    v === 'range' &&
    (!sel.from || !sel.to)
  ) {
    const cd =
      store.state.cycleDay || 1;

    sel.from = cd > 1
      ? cycleRange(cd, 0).from
      : today().slice(0, 7) + '-01';

    sel.to = today();
  }

  /*
   * عند اختيار يوم محدد
   * نستخدم تاريخ اليوم كبداية.
   */
  if (v === 'day' && !sel.day) {
    sel.day = today();
  }

  save();
  resetLimits();
  refresh();
}


/**
 * تعديل بداية أو نهاية النطاق.
 */
function setRange(key, value) {
  if (!value) {
    return;
  }

  sel[key] = value;

  /*
   * إذا كانت البداية بعد النهاية،
   * نقوم بتبديل التاريخين.
   */
  if (sel.from > sel.to) {
    [
      sel.from,
      sel.to
    ] = [
      sel.to,
      sel.from
    ];
  }

  save();
  resetLimits();
  refresh();
}


/**
 * تعديل اليوم المحدد.
 */
function setDay(value) {
  if (!value) {
    return;
  }

  sel.day = value;

  save();
  resetLimits();
  refresh();
}


/**
 * إنشاء شريط اختيار الفترة.
 */
export function periodBar(state) {
  const cd = state.cycleDay || 1;
  const eff = effective(sel, state);
  const thisMonth = today().slice(0, 7);

  const opt = (val, text) =>
    `<option value="${val}"${
      eff === val ? ' selected' : ''
    }>${text}</option>`;

  /*
   * الخيارات الأساسية.
   */
  let h =
    opt('', 'كل الفترات') +
    opt('today', 'اليوم');

  /*
   * خيارات الدورة الحالية والسابقة.
   */
  if (cd > 1) {
    const current =
      cycleRange(cd, 0);

    const previous =
      cycleRange(cd, 1);

    h += opt(
      'c0',
      `الدورة الحالية (${shortDate(
        current.from
      )} – ${shortDate(current.to)})`
    );

    h += opt(
      'c1',
      `الدورة السابقة (${shortDate(
        previous.from
      )} – ${shortDate(previous.to)})`
    );
  }

  /*
   * إضافة الأشهر الموجودة.
   */
  h += monthsOf(state)
    .map(month =>
      opt(
        month,
        month +
          (month === thisMonth
            ? ' (هذا الشهر)'
            : '')
      )
    )
    .join('');

  /*
   * إضافة البحث عن يوم واحد
   * والنطاق بين تاريخين.
   */
  h += opt(
    'day',
    'يوم محدد…'
  );

  h += opt(
    'range',
    'نطاق مخصص…'
  );

  /*
   * حقل اليوم المحدد.
   */
  const day = eff === 'day'
    ? `
      <div class="rng single-date">
        <label>
          اليوم

          <input
            type="date"
            value="${sel.day || today()}"
            data-change="day-set"
          >
        </label>
      </div>
    `
    : '';

  /*
   * بيانات النطاق المخصص.
   */
  const r = eff === 'range'
    ? resolve(sel, state)
    : null;

  /*
   * حقلا بداية ونهاية النطاق.
   */
  const range = r
    ? `
      <div class="rng">
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
      </div>
    `
    : '';

  return `
    <div class="fbar">
      <label>
        📅 الفترة

        <select data-change="period-set">
          ${h}
        </select>
      </label>

      ${range}
      ${day}
    </div>
  `;
}


/**
 * تغيير نوع الفترة.
 */
onChange(
  'period-set',
  (d, el) => {
    setPeriod(el.value);
  }
);


/**
 * تغيير بداية أو نهاية النطاق.
 */
onChange(
  'range-set',
  (d, el) => {
    setRange(
      d.key,
      el.value
    );
  }
);


/**
 * تغيير اليوم المحدد.
 */
onChange(
  'day-set',
  (d, el) => {
    setDay(el.value);
  }
);


/**
 * اختيار شهر من جدول التقارير.
 */
onClick(
  'period-pick',
  d => {
    setPeriod(d.per);
  }
);
