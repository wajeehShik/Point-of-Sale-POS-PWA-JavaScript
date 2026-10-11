import { ymd, monthName, shortDate } from '../core/dates.js';
import { today } from '../core/format.js';

/** الدورة المالية: تبدأ من يوم cycleDay وتنتهي قبل نفس اليوم بالشهر الجاي */
export function cycleRange(cycleDay, offset = 0, now = new Date()) {
  let m = now.getMonth();
  if (now.getDate() < cycleDay) m--;
  m -= offset;
  return { from: ymd(now.getFullYear(), m, cycleDay), to: ymd(now.getFullYear(), m + 1, cycleDay - 1) };
}

export function monthsOf(state) {
  const s = new Set(state.tx.map(t => t.date.slice(0, 7)));
  s.add(today().slice(0, 7));
  return [...s].sort().reverse();
}

/** القيمة الفعلية للاختيار (إذا الشهر غير موجود أو الدورة معطّلة يرجع '' = الكل) */
export function effective(sel, state) {
  const v = sel.v, cd = state.cycleDay || 1;
  if (!v) return '';
  if (v === 'today' || v === 'range') return v;
  if (v === 'c0' || v === 'c1') return cd > 1 ? v : '';
  return monthsOf(state).includes(v) ? v : '';
}

/** يحوّل الاختيار إلى '' | 'YYYY-MM[-DD]' | {from,to} للاستخدام بالحسابات */
export function resolve(sel, state) {
  const v = effective(sel, state), cd = state.cycleDay || 1;
  if (!v) return '';
  if (v === 'today') return today();
  if (v === 'c0') return cycleRange(cd, 0);
  if (v === 'c1') return cycleRange(cd, 1);
  if (v === 'range') return { from: sel.from || today(), to: sel.to || today() };
  return v;
}

export function label(sel, state) {
  const v = effective(sel, state);
  if (!v) return 'كل الفترات';
  if (v === 'today') return 'اليوم';
  if (v === 'c0' || v === 'c1') {
    const r = resolve(sel, state);
    return `${v === 'c0' ? 'الدورة الحالية' : 'الدورة السابقة'} (${shortDate(r.from)} – ${shortDate(r.to)})`;
  }
  if (v === 'range') { const r = resolve(sel, state); return `${shortDate(r.from)} – ${shortDate(r.to)}`; }
  return monthName(v);
}