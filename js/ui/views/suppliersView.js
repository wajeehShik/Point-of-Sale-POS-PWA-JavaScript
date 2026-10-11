import { ui } from '../state.js';
import { supplierGroups } from '../../domain/debts.js';
import { EPS } from '../../core/constants.js';
import { shortDate } from '../../core/dates.js';
import { fmt } from '../../core/format.js';
import { esc } from '../dom.js';
import { card, grid } from '../components.js';
import { onClick } from '../actions.js';
import { refresh } from '../router.js';

const LIMIT = 3;

export function suppliersSection(state) {
  const groups = supplierGroups(state);
  if (!groups.length) return '';
  const total = groups.reduce((a, g) => a + g.left, 0), due = groups.reduce((a, g) => a + g.due, 0);
  const limit = ui.showAllSuppliers || groups.length <= LIMIT + 1 ? groups.length : LIMIT;

  const rows = groups.slice(0, limit).map(g => `<div class="row-i" data-action="sup-open" data-key="${esc(g.key)}">
    <span class="ic">🤝</span>
    <div class="mid">${esc(g.key || 'بدون مورّد')}<span>${g.count} ${g.count === 1 ? 'دفعة' : 'دفعات'} · إجمالي الدين ${fmt(g.left)} · منذ ${shortDate(g.first)}</span></div>
    ${g.due > EPS ? `<div class="dcol"><small>مستحق الآن</small><b class="due">${fmt(g.due)}</b></div>` : '<b class="pos">لا مستحق</b>'}
    <span class="chev">‹</span></div>`).join('');

  let btn = '';
  if (groups.length > limit) btn = `<button class="btn alt" data-action="suppliers-toggle">عرض كل الموردين (${groups.length})</button>`;
  else if (ui.showAllSuppliers && groups.length > LIMIT + 1) btn = '<button class="btn alt" data-action="suppliers-toggle">عرض أقل</button>';

  return `<h3>🤝 ديون الموردين</h3>
    ${grid(card('مستحق الآن (عن المباع)', fmt(due), due > EPS ? 'due' : '') + card('إجمالي الديون', fmt(total), 'neg'), 'margin:0 0 10px')}
    <div class="list">${rows}</div>${btn}`;
}

onClick('suppliers-toggle', () => { ui.showAllSuppliers = !ui.showAllSuppliers; refresh(); });