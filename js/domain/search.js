import { TX_TYPES } from './txTypes.js';
import { accountName, productName, findTx } from './lookup.js';
import { sectorLabel } from '../core/constants.js';
import { dayLabel } from '../core/dates.js';

export const norm = s => String(s).toLowerCase()
  .replace(/[\u064B-\u0652]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

function haystack(s, t) {
  const paid = t.type === 'debtpay' ? findTx(s, t.ref) : null;
  return norm([
    TX_TYPES[t.type].label, t.category,
    t.productId && productName(s, t.productId),
    paid && productName(s, paid.productId), paid && paid.supplier,
    t.supplier, t.note, t.qtyText,
    accountName(s, t.account), t.toAccount && accountName(s, t.toAccount),
    sectorLabel(t.sector), t.credit && 'بالدين دين',
    String(t.amount), t.date, dayLabel(t.date),
  ].filter(Boolean).join(' '));
}

export function searchTx(state, list, query) {
  const words = norm(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter(t => { const h = haystack(state, t); return words.every(w => h.includes(w)); });
}