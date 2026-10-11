import { debts } from '../../domain/debts.js';
import { productName } from '../../domain/lookup.js';
import { fmt, r2 } from '../../core/format.js';
import { esc } from '../dom.js';
import { accountField, val, setValue } from './fields.js';

/* تعديل سداد موجود (السداد الجديد يتم من نافذة المورّد) */
export default {
  render({ state, ref, editId }) {
    const d = debts(state).find(x => x.t.id === ref);
    if (!d) return '<div class="empty">هذا الدين غير موجود</div>';
    return `<div class="sumbox">
      <div class="stat"><span>${esc(productName(state, d.t.productId))} × ${d.t.qty}${d.t.supplier ? ' · ' + esc(d.t.supplier) : ''}</span><b>${fmt(d.t.amount)}</b></div>
      <div class="stat"><span>المسدد</span><b>${fmt(d.paid)}</b></div>
      <div class="stat"><span>المتبقي</span><b class="neg">${fmt(d.left)}</b></div></div>
    <label>مبلغ السداد<input name="amount" type="number" step="any" min="0" inputmode="decimal" value="${editId ? '' : r2(Math.max(0, d.left))}"></label>`
    + accountField(state, 'الحساب الذي دُفع منه');
  },

  fill(f, t) { setValue(f, 'amount', t.amount); setValue(f, 'account', t.account); },
  read: f => ({ amount: val(f, 'amount'), account: val(f, 'account') }),
};