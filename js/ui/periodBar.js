import { prefs } from '../data/prefs.js';
import { store } from '../data/store.js';
import { cycleRange, monthsOf, resolve, label, effective } from '../domain/period.js';
import { monthName, shortDate } from '../core/dates.js';
import { today } from '../core/format.js';
import { onChange, onClick } from './actions.js';
import { resetLimits } from './state.js';
import { refresh } from './router.js';

const sel = { v: prefs.get('mali_per'), from: prefs.get('mali_pf'), to: prefs.get('mali_pt') };
const save = () => { prefs.set('mali_per', sel.v); prefs.set('mali_pf', sel.from); prefs.set('mali_pt', sel.to); };

export const currentPeriod = () => resolve(sel, store.state);
export const periodText = () => label(sel, store.state);

export function setPeriod(v) {
  sel.v = v;
  if (v === 'range' && (!sel.from || !sel.to)) {
    const cd = store.state.cycleDay || 1;
    sel.from = cd > 1 ? cycleRange(cd, 0).from : today().slice(0, 7) + '-01';
    sel.to = today();
  }
  save(); resetLimits(); refresh();
}

function setRange(key, value) {
  if (!value) return;
  sel[key] = value;
  if (sel.from > sel.to) [sel.from, sel.to] = [sel.to, sel.from];
  save(); resetLimits(); refresh();
}

export function periodBar(state) {
  const cd = state.cycleDay || 1, eff = effective(sel, state), thisMonth = today().slice(0, 7);
  const opt = (val, text) => `<option value="${val}"${eff === val ? ' selected' : ''}>${text}</option>`;
  let h = opt('', 'كل الفترات') + opt('today', 'اليوم');
  if (cd > 1) {
    const a = cycleRange(cd, 0), b = cycleRange(cd, 1);
    h += opt('c0', `الدورة الحالية (${shortDate(a.from)} – ${shortDate(a.to)})`)
       + opt('c1', `الدورة السابقة (${shortDate(b.from)} – ${shortDate(b.to)})`);
  }
  h += monthsOf(state).map(m => opt(m, monthName(m) + (m === thisMonth ? ' (هذا الشهر)' : ''))).join('');
  h += opt('range', 'نطاق مخصص…');
  const r = eff === 'range' ? resolve(sel, state) : null;
  const range = r ? `<div class="rng">
      <label>من<input type="date" value="${r.from}" data-change="range-set" data-key="from"></label>
      <label>إلى<input type="date" value="${r.to}" data-change="range-set" data-key="to"></label></div>` : '';
  return `<div class="fbar"><label>📅 الفترة<select data-change="period-set">${h}</select></label>${range}</div>`;
}

onChange('period-set', (d, el) => setPeriod(el.value));
onChange('range-set', (d, el) => setRange(d.key, el.value));
onClick('period-pick', d => setPeriod(d.per));