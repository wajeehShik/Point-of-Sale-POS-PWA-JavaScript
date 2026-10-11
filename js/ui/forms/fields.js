import { esc } from '../dom.js';
import { SECTORS } from '../../core/constants.js';
import { today } from '../../core/format.js';

export const opts = (arr, sel) =>
  arr.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');

export const accountOptions = (state, sel) => opts(state.accounts.map(a => [a.id, a.name]), sel);
export const sectorOptions = (sel, order = Object.keys(SECTORS)) =>
  opts(order.map(k => [k, `${SECTORS[k].icon} ${SECTORS[k].label}`]), sel);

export const numberField = (name, label, placeholder = '', value = '') =>
  `<label>${label}<input name="${name}" type="number" step="any" min="0" inputmode="decimal" placeholder="${placeholder}" value="${value}"></label>`;

export const accountField = (state, label) =>
  `<label>${label}<select name="account">${accountOptions(state)}</select></label>`;

/** حقل القسم: مخفي إذا النافذة مفتوحة من صفحة محددة */
export const sectorField = ({ ctx, editId }) => (ctx && !editId)
  ? `<input type="hidden" name="sector" value="${ctx}">`
  : `<label>القسم<select name="sector">${sectorOptions()}</select></label>`;

export const commonFields = () => `
  <div class="daterow" id="dt"><span>📅 التاريخ: اليوم</span><button type="button" class="link" data-action="entry-date">تغيير</button></div>
  <label id="datel" style="display:none">التاريخ<input type="date" name="date" value="${today()}"></label>
  <label>ملاحظة<input name="note" placeholder="اختياري"></label>`;

export const val = (f, name) => (f.elements[name] ? f.elements[name].value : '');

export function setValue(f, name, v) {
  const el = f.elements[name];
  if (!el || v === undefined || v === null) return;
  if (el.tagName === 'SELECT') {
    if (v === '') return;
    if (![...el.options].some(o => o.value === String(v))) el.add(new Option(v, v));
  }
  el.value = v;
}