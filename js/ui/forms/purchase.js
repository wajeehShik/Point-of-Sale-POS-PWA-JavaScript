import { fmt } from '../../core/format.js';
import { supplierNames } from '../../domain/lookup.js';
import { esc, $ } from '../dom.js';
import {
  opts,
  numberField,
  accountField,
  val,
  setValue
} from './fields.js';

export default {
  render({ state }) {
    const names = supplierNames(state)
      .map(name => `<option value="${esc(name)}">`)
      .join('');

    return `
      <label>
        المنتج
        <select name="product">
          ${opts(state.products.map(p => [p.id, p.name]))}
          <option value="__new">＋ منتج جديد</option>
        </select>
      </label>

      <label id="newp" style="display:none">
        اسم المنتج الجديد
        <input name="newname">
      </label>

      <label>
        طريقة إدخال السعر
        <select name="priceMode">
          <option value="total">إدخال المبلغ الإجمالي</option>
          <option value="unit">إدخال سعر القطعة الواحدة</option>
        </select>
      </label>

      <div class="row">
        ${numberField('qty', 'الكمية', 'مثال: 5', '1')}

        <div id="total-price-field">
          ${numberField('amount', 'المبلغ الإجمالي', 'مثال: 50')}
        </div>

        <div id="unit-price-field" style="display:none">
          ${numberField('unitPrice', 'سعر القطعة الواحدة', 'مثال: 10')}
        </div>
      </div>

      <div class="total">
        المبلغ الإجمالي المحسوب:
        <b id="purchase-total">—</b>
      </div>

      <div class="total">
        تكلفة القطعة الواحدة:
        <b id="tot">—</b>
      </div>

      <label class="chk">
        <input type="checkbox" name="credit">
        <span>اشتريتها بالدين (لم أدفع بعد)</span>
      </label>

      <label id="supl" style="display:none">
        اسم المورّد (اختياري)
        <input name="supplier" list="sups" autocomplete="off">
        <datalist id="sups">
          ${names}
        </datalist>
      </label>

      <div id="accl">
        ${accountField(state, 'الحساب الذي دُفع منه')}
      </div>
    `;
  },

  sync(f) {
    const qty = +val(f, 'qty') || 0;
    const mode = val(f, 'priceMode');
    const amountField = $('#total-price-field');
    const unitField = $('#unit-price-field');

    amountField.style.display = mode === 'total' ? 'block' : 'none';
    unitField.style.display = mode === 'unit' ? 'block' : 'none';

    let amount = 0;
    let unitPrice = 0;

    if (mode === 'unit') {
      unitPrice = +val(f, 'unitPrice') || 0;
      amount = qty * unitPrice;

      // حدّث الإجمالي المحفوظ بالنموذج تلقائيًا.
      f.elements.amount.value =
        amount > 0 ? amount.toFixed(2) : '';
    } else {
      amount = +val(f, 'amount') || 0;
      unitPrice = qty > 0 ? amount / qty : 0;

      // حدّث سعر القطعة المحسوب تلقائيًا.
      f.elements.unitPrice.value =
        unitPrice > 0 ? unitPrice.toFixed(2) : '';
    }

    $('#purchase-total').textContent =
      amount > 0 ? fmt(amount) : '—';

    $('#tot').textContent =
      unitPrice > 0 ? fmt(unitPrice) : '—';

    const isNewProduct = val(f, 'product') === '__new';
    $('#newp').style.display = isNewProduct ? 'block' : 'none';

    const credit = f.elements.credit.checked;
    $('#supl').style.display = credit ? 'block' : 'none';
    $('#accl').style.display = credit ? 'none' : 'block';
  },

  fill(f, t) {
    setValue(f, 'product', t.productId);
    setValue(f, 'qty', t.qty);
    setValue(f, 'amount', t.amount);

    const qty = +t.qty || 0;
    const unitPrice = qty > 0 ? (+t.amount || 0) / qty : 0;
    setValue(f, 'unitPrice', unitPrice.toFixed(2));
    setValue(f, 'priceMode', 'total');

    f.elements.credit.checked = !!t.credit;
    setValue(f, 'supplier', t.supplier);
    setValue(f, 'account', t.account);
  },

  read: f => {
    const qty = +val(f, 'qty') || 0;
    const mode = val(f, 'priceMode');

    const amount = mode === 'unit'
      ? qty * (+val(f, 'unitPrice') || 0)
      : (+val(f, 'amount') || 0);

    return {
      productId: val(f, 'product'),
      newName: val(f, 'newname'),
      qty: val(f, 'qty'),
      amount: amount.toFixed(2),
      credit: f.elements.credit.checked,
      supplier: val(f, 'supplier'),
      account: val(f, 'account')
    };
  }
};
