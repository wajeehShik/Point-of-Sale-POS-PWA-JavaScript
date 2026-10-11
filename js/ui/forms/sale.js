import { fmt } from '../../core/format.js';
import { findProduct } from '../../domain/lookup.js';
import { stock } from '../../domain/inventory.js';
import { $ } from '../dom.js';
import { opts, numberField, accountField, val, setValue } from './fields.js';

export default {
  render({ state }) {
    return `<label>المنتج<select name="product">${opts(state.products.map(p => [p.id, p.name]))}</select></label>
    <div class="row">${numberField('qty', 'الكمية', '', '1')}${numberField('amount', 'إجمالي البيع', 'الإجمالي')}</div>
    <div class="sumbox">
      <div class="stat"><span>سعر الوحدة</span><b id="tot">—</b></div>
      <div class="stat"><span>تكلفة الوحدة</span><b id="cst">—</b></div>
      <div class="stat"><span>الربح</span><b id="prf">—</b></div>
      <div class="note" id="stk"></div>
    </div>`
    + accountField(state, 'الحساب الذي استلم المال');
  },

  /* amtT: المستخدم كتب الإجمالي بنفسه، فلا نكتب فوقه */
  input(f, e) { if (e.target.name === 'amount') f.dataset.amtT = '1'; },
  change(f, e, { editId }) { if (e.target.name === 'product' && !editId) f.dataset.amtT = ''; },

  sync(f, { state }) {
    const p = findProduct(state, val(f, 'product')), q = +val(f, 'qty') || 0;
    if (!f.dataset.amtT && p && p.price > 0 && q > 0) f.elements.amount.value = +(q * p.price).toFixed(2);
    const a = +val(f, 'amount') || 0, cost = p ? p.cost : 0, profit = a - cost * q;
    $('#tot').textContent = q > 0 && a > 0 ? fmt(a / q) : '—';
    $('#cst').textContent = p ? fmt(cost) : '—';
    const out = $('#prf');
    if (q > 0 && a > 0) { out.textContent = (profit >= 0 ? '+' : '') + fmt(profit); out.className = profit >= 0 ? 'pos' : 'neg'; }
    else { out.textContent = '—'; out.className = ''; }
    $('#stk').textContent = p ? `المتوفر في المخزون: ${stock(state, p.id)}` : '';
  },

  fill(f, t) {
    setValue(f, 'product', t.productId); setValue(f, 'qty', t.qty);
    setValue(f, 'amount', t.amount); setValue(f, 'account', t.account);
  },

  read: f => ({ productId: val(f, 'product'), qty: val(f, 'qty'), amount: val(f, 'amount'), account: val(f, 'account') }),
};