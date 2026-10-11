import { fmt, } from '../../core/format.js';
import { supplierNames } from '../../domain/lookup.js';
import { esc, $ } from '../dom.js';
import { opts, numberField, accountField, val, setValue } from './fields.js';

export default {
  render({ state }) {
    const names = supplierNames(state).map(n => `<option value="${esc(n)}">`).join('');
    return `<label>المنتج<select name="product">${opts(state.products.map(p => [p.id, p.name]))}<option value="__new">＋ منتج جديد</option></select></label>
    <label id="newp" style="display:none">اسم المنتج الجديد<input name="newname"></label>
    <div class="row">${numberField('qty', 'الكمية', 'الكمية')}${numberField('amount', 'المبلغ الإجمالي', 'الإجمالي')}</div>
    <div class="total">تكلفة الوحدة: <b id="tot">—</b></div>
    <label class="chk"><input type="checkbox" name="credit"><span>اشتريتها بالدين (لم أدفع بعد)</span></label>
    <label id="supl" style="display:none">اسم المورّد (اختياري)<input name="supplier" list="sups" autocomplete="off"><datalist id="sups">${names}</datalist></label>
    <div id="accl">${accountField(state, 'الحساب الذي دُفع منه')}</div>`;
  },

  sync(f) {
    const q = +val(f, 'qty'), a = +val(f, 'amount'), credit = f.elements.credit.checked;
    $('#tot').textContent = q > 0 && a > 0 ? fmt(a / q) : '—';
    $('#newp').style.display = val(f, 'product') === '__new' ? 'block' : 'none';
    $('#supl').style.display = credit ? 'block' : 'none';
    $('#accl').style.display = credit ? 'none' : 'block';
  },

  fill(f, t) {
    setValue(f, 'product', t.productId); setValue(f, 'qty', t.qty); setValue(f, 'amount', t.amount);
    f.elements.credit.checked = !!t.credit;
    setValue(f, 'supplier', t.supplier); setValue(f, 'account', t.account);
  },

  read: f => ({
    productId: val(f, 'product'), newName: val(f, 'newname'), qty: val(f, 'qty'), amount: val(f, 'amount'),
    credit: f.elements.credit.checked, supplier: val(f, 'supplier'), account: val(f, 'account'),
  }),
};