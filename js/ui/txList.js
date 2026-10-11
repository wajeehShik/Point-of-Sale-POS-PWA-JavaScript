import { TX_TYPES, signed } from '../domain/txTypes.js';
import { accountName, productName, findTx } from '../domain/lookup.js';
import { sectorLabel } from '../core/constants.js';
import { dayLabel } from '../core/dates.js';
import { fmt } from '../core/format.js';
import { esc } from './dom.js';
import { emptyBox } from './components.js';

function rowLabel(s, t) {
  const type = TX_TYPES[t.type].label;
  switch (t.type) {
    case 'sale': case 'purchase': return `${type} ${productName(s, t.productId)} × ${t.qty}`;
    case 'debtpay': {
      const p = findTx(s, t.ref);
      return 'سداد دين' + (p ? ' · ' + productName(s, p.productId) : '') + (p && p.supplier ? ' · ' + p.supplier : '');
    }
    case 'transfer': return `${sectorLabel(t.sector)} ← ${sectorLabel(t.toSector)}`;
    case 'expense': {
      const q = t.eqty ? `${t.eqty} ${t.eunit || ''}`.trim() : (t.qtyText || '');
      return t.category + (q ? ' · ' + q : '');
    }
    default: return t.category;
  }
}

function rowMeta(s, t, scoped) {
  if (t.type === 'transfer') return `${accountName(s, t.account)} ← ${accountName(s, t.toAccount)}`;
  const prefix = scoped ? '' : sectorLabel(t.sector) + ' · ';
  let meta = t.credit ? `${prefix}بالدين${t.supplier ? ' · ' + t.supplier : ''}` : `${prefix}${accountName(s, t.account)}`;
  if (t.type === 'sale') meta += ` · ربح ${fmt(t.amount - (t.cogs || 0))}`;
  if (t.type === 'expense' && t.unitPrice && t.eunit) meta += ` · ${fmt(t.unitPrice)}/${t.eunit}`;
  return meta;
}

function row(s, t, scoped) {
  const v = signed(t), plain = t.type === 'transfer' || t.credit;
  const cls = t.credit ? 'warn' : plain ? '' : v > 0 ? 'pos' : 'neg';
  const sign = plain ? '' : v > 0 ? '+' : '-';
  return `<div class="row-i" data-action="tx-edit" data-id="${t.id}">
    <span class="ic">${TX_TYPES[t.type].icon}</span>
    <div class="mid">${esc(rowLabel(s, t))}<span>${esc(rowMeta(s, t, scoped))}</span></div>
    <b class="${cls}">${sign}${fmt(t.amount)}</b><span class="chev">‹</span></div>`;
}

const dayHeader = (day, v) =>
  `<div class="dh"><span>${dayLabel(day)}</span><b class="${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${v ? (v > 0 ? '+' : '-') + fmt(Math.abs(v)) : ''}</b></div>`;

/** عمليات مجمّعة حسب اليوم مع مجموع كل يوم. page: 'home' | 'invest' | 'all' */
export function txList(state, list, limit, page = '') {
  const scoped = !!page && page !== 'all';
  const rows = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (!rows.length) return emptyBox(state.tx.length ? 'ما في عمليات بهذا الفلتر.' : 'ما في عمليات بعد. اضغط ＋ لإضافة أول عملية.');

  const net = {};
  rows.forEach(t => { net[t.date] = (net[t.date] || 0) + signed(t); });

  let html = '<div class="list">', day = '';
  for (const t of rows.slice(0, limit)) {
    if (t.date !== day) { day = t.date; html += dayHeader(day, net[day] || 0); }
    html += row(state, t, scoped);
  }
  html += '</div>';
  if (page && rows.length > limit)
    html += `<button class="btn alt" data-action="ops-more" data-page="${page}">عرض المزيد (${rows.length - limit})</button>`;
  return html;
}