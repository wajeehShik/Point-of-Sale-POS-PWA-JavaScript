import { store } from '../data/store.js';
import { deleteTransaction, relatedPayments } from '../services/transactions.js';
import { fmt } from '../core/format.js';
import { toast } from './dom.js';

/** يسأل المستخدم ثم يحذف. إذا على الدين سدادات بينبّه إنها بتنحذف معه. يرجع true إذا انحذف */
export function deleteWithConfirm(id, message = 'حذف هذه العملية؟ ستتحدث الأرصدة والمخزون والأرباح تلقائياً.') {
  const pays = relatedPayments(store.state, id);
  const sum = pays.reduce((a, t) => a + t.amount, 0);
  const text = pays.length
    ? `على هذا الدين ${pays.length} سدادات (${fmt(sum)}). سيتم حذفها معه وإرجاع المبلغ لمحافظك. متأكد؟`
    : message;
  if (!confirm(text)) return false;
  const res = deleteTransaction(id);
  if (res.error) { toast(res.error, true); return false; }
  return true;
}