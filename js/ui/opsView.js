import { ui } from './state.js';
import { store } from '../data/store.js';
import { inPeriod } from '../domain/ledger.js';
import { searchTx } from '../domain/search.js';
import { currentPeriod } from './periodBar.js';
import { txList } from './txList.js';
import { onClick, onInput } from './actions.js';
import { refresh } from './router.js';
import { fmt } from '../core/format.js';
import { esc } from './dom.js';

const TABS = {
  home: [['all', 'الكل', null], ['income', 'إيراد', ['income']], ['expense', 'مصروف', ['expense']], ['transfer', 'تحويل', ['transfer']]],
  invest: [['all', 'الكل', null], ['sale', 'بيع', ['sale']], ['purchase', 'شراء', ['purchase']],
    ['expense', 'مصاريف', ['expense']], ['other', 'أخرى', ['income', 'transfer', 'debtpay']]],
};
const PLACEHOLDER = '🔍 ابحث (صنف، منتج، مورّد، ملاحظة، مبلغ، يوم...)';
const activeTab = page => TABS[page].find(t => t[0] === ui.tab[page]) || TABS[page][0];

export const searchBox = page =>
  `<input class="search" type="search" placeholder="${PLACEHOLDER}" value="${esc(ui.query[page])}" data-input="ops-search" data-page="${page}">`;

function pageList(state, page) {
  const types = activeTab(page)[2], q = ui.query[page].trim(), period = currentPeriod();
  let list = state.tx.filter(t =>
    (t.sector === page || t.toSector === page) && (!types || types.includes(t.type)) && (q || inPeriod(t.date, period)));
  if (q) list = searchTx(state, list, q);

  const single = types && types.length === 1 && types[0] !== 'transfer';
  const total = list.reduce((s, t) => s + t.amount, 0);
  let head = '';
  if (q) head = `<div class="tsum"><span>${list.length} نتيجة · كل الفترات</span>${single ? `<b>${fmt(total)}</b>` : ''}</div>`;
  else if (single) head = `<div class="tsum"><span>${list.length} عملية</span><b>${fmt(total)}</b></div>`;
  return head + txList(state, list, ui.limit[page], page);
}

export function allOpsList(state) {
  const q = ui.query.all.trim();
  const list = q ? searchTx(state, state.tx, q) : state.tx.filter(t => inPeriod(t.date, currentPeriod()));
  const head = q ? `<div class="tsum"><span>${list.length} نتيجة · كل الفترات</span></div>` : '';
  return head + txList(state, list, ui.limit.all, 'all');
}

export function opsBlock(state, page) {
  const active = activeTab(page)[0];
  const tabs = TABS[page].map(([k, l]) =>
    `<button class="tab${k === active ? ' on' : ''}" data-action="ops-tab" data-page="${page}" data-tab="${k}">${l}</button>`).join('');
  return `<div class="tabs">${tabs}</div>${searchBox(page)}<div id="ops-${page}">${pageList(state, page)}</div>`;
}

onInput('ops-search', (d, el) => {
  ui.query[d.page] = el.value;
  ui.limit[d.page] = d.page === 'all' ? (el.value.trim() ? 30 : 10) : 30;
  const slot = document.getElementById('ops-' + d.page);
  if (slot) slot.innerHTML = d.page === 'all' ? allOpsList(store.state) : pageList(store.state, d.page);
});
onClick('ops-tab', d => { ui.tab[d.page] = d.tab; ui.limit[d.page] = 30; refresh(); });
onClick('ops-more', d => { ui.limit[d.page] += 30; refresh(); });