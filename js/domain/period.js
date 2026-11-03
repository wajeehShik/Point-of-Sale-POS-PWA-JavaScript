import {
  ymd,
  monthName,
  shortDate,
  dayLabel
} from '../core/dates.js';

import { today } from '../core/format.js';


/**
 * حساب نطاق الدورة المالية.
 */
export function cycleRange(
  cycleDay,
  offset = 0,
  now = new Date()
) {
  let m = now.getMonth();

  if (now.getDate() < cycleDay) {
    m--;
  }

  m -= offset;

  return {
    from: ymd(
      now.getFullYear(),
      m,
      cycleDay
    ),

    to: ymd(
      now.getFullYear(),
      m + 1,
      cycleDay - 1
    ),
  };
}


/**
 * استخراج الأشهر التي تحتوي على عمليات.
 */
export function monthsOf(state) {
  const s = new Set(
    state.tx.map(t => t.date.slice(0, 7))
  );

  s.add(today().slice(0, 7));

  return [...s]
    .sort()
    .reverse();
}


/**
 * تحديد الاختيار الفعلي للفترة.
 */
export function effective(sel, state) {
  const v = sel.v;
  const cd = state.cycleDay || 1;

  if (!v) {
    return '';
  }

  if (
    v === 'today' ||
    v === 'day' ||
    v === 'range'
  ) {
    return v;
  }

  if (v === 'c0' || v === 'c1') {
    return cd > 1 ? v : '';
  }

  return monthsOf(state).includes(v)
    ? v
    : '';
}


/**
 * تحويل الاختيار إلى قيمة تستخدمها الحسابات.
 *
 * ''             = كل الفترات
 * 'YYYY-MM-DD'   = يوم محدد
 * 'YYYY-MM'      = شهر محدد
 * { from, to }   = نطاق بين تاريخين
 */
export function resolve(sel, state) {
  const v = effective(sel, state);
  const cd = state.cycleDay || 1;

  if (!v) {
    return '';
  }

  if (v === 'today') {
    return today();
  }

  if (v === 'day') {
    return sel.day || today();
  }

  if (v === 'c0') {
    return cycleRange(cd, 0);
  }

  if (v === 'c1') {
    return cycleRange(cd, 1);
  }

  if (v === 'range') {
    return {
      from: sel.from || today(),
      to: sel.to || today(),
    };
  }

  return v;
}


/**
 * تحويل الاختيار إلى عنوان مفهوم للمستخدم.
 */
export function label(sel, state) {
  const v = effective(sel, state);

  if (!v) {
    return 'كل الفترات';
  }

  if (v === 'today') {
    return 'اليوم';
  }

  if (v === 'day') {
    return dayLabel(
      resolve(sel, state)
    );
  }

  if (v === 'c0' || v === 'c1') {
    const r = resolve(sel, state);

    return `${
      v === 'c0'
        ? 'الدورة الحالية'
        : 'الدورة السابقة'
    } (${shortDate(r.from)} – ${shortDate(r.to)})`;
  }

  if (v === 'range') {
    const r = resolve(sel, state);

    return `${shortDate(r.from)} – ${shortDate(r.to)}`;
  }

  return monthName(v);
}
