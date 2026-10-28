import { fmt } from '../../core/format.js';
import { supplierNames } from '../../domain/lookup.js';
import { esc, $ } from '../dom.js';
import {
  numberField,
  accountField,
  val,
  setValue
} from './fields.js';

export default {
  render({ state }) {
    const products = state.products || [];

    const productOptions = products
      .map(product => `<option value="${esc(product.name)}"></option>`)
      .join('');

    const supplierOptions = supplierNames(state)
      .map(name => `<option value="${esc(name)}">`)
      .join('');

    return `
     <label>
  المنتج
  <div class="product-search">
    <input
      name="productName"
      list="product-options"
      autocomplete="off"
      placeholder="ابحث باسم المنتج..."
    >
    <button
      type="button"
      class="clear-product"
      data-action="clear-product-name"
      aria-label="مسح اسم المنتج"
      title="مسح"
    >×</button>
  </div>

  <datalist id="product-options">
    ${state.products.map(product => `
      <option value="${esc(product.name)}"></option>
    `).join('')}
  </datalist>
</label>

      <div id="new-product-fields" style="display:none">
        <div class="note">
          هذا المنتج غير موجود. سيُضاف تلقائيًا عند حفظ عملية الشراء.
        </div>
      </div>

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
          ${supplierOptions}
        </datalist>
      </label>

      <div id="accl">
        ${accountField(state, 'الحساب الذي دُفع منه')}
      </div>
    `;
  },

  input(f, e, { state }) {
    if (e.target.name !== 'productName') return;

    const enteredName = (e.target.value || '')
      .trim()
      .toLocaleLowerCase();

    const existingProduct = (state.products || []).find(product =>
      product.name.trim().toLocaleLowerCase() === enteredName
    );

    const newProductFields = $('#new-product-fields');

    if (newProductFields) {
      newProductFields.style.display =
        enteredName && !existingProduct ? 'block' : 'none';
    }
  },

  click(f, e) {
    const clearButton = e.target.closest(
      '[data-action="clear-product-name"]'
    );

    if (!clearButton) return;

    f.elements.productName.value = '';
    f.elements.productName.focus();

    const newProductFields = $('#new-product-fields');
    if (newProductFields) {
      newProductFields.style.display = 'none';
    }

    this.sync(f);
  },

  sync(f) {
    const qty = +val(f, 'qty') || 0;
    const mode = val(f, 'priceMode');

    const totalPriceField = $('#total-price-field');
    const unitPriceField = $('#unit-price-field');

    if (totalPriceField) {
      totalPriceField.style.display =
        mode === 'total' ? 'block' : 'none';
    }

    if (unitPriceField) {
      unitPriceField.style.display =
        mode === 'unit' ? 'block' : 'none';
    }

    let amount = 0;
    let unitPrice = 0;

    if (mode === 'unit') {
      unitPrice = +val(f, 'unitPrice') || 0;
      amount = qty * unitPrice;

      f.elements.amount.value =
        amount > 0 ? amount.toFixed(2) : '';
    } else {
      amount = +val(f, 'amount') || 0;
      unitPrice = qty > 0 ? amount / qty : 0;

      f.elements.unitPrice.value =
        unitPrice > 0 ? unitPrice.toFixed(2) : '';
    }

    const totalElement = $('#purchase-total');
    if (totalElement) {
      totalElement.textContent =
        amount > 0 ? fmt(amount) : '—';
    }

    const unitElement = $('#tot');
    if (unitElement) {
      unitElement.textContent =
        unitPrice > 0 ? fmt(unitPrice) : '—';
    }

    const isCredit = f.elements.credit.checked;

    $('#supl').style.display = isCredit ? 'block' : 'none';
    $('#accl').style.display = isCredit ? 'none' : 'block';
  },

  fill(f, t, { state }) {
    const product = (state.products || []).find(
      item => item.id === t.productId
    );

    setValue(f, 'productName', product ? product.name : '');
    setValue(f, 'qty', t.qty);
    setValue(f, 'amount', t.amount);

    const qty = +t.qty || 0;
    const unitPrice = qty > 0
      ? (+t.amount || 0) / qty
      : 0;

    setValue(f, 'unitPrice', unitPrice.toFixed(2));
    setValue(f, 'priceMode', 'total');

    f.elements.credit.checked = !!t.credit;

    setValue(f, 'supplier', t.supplier);
    setValue(f, 'account', t.account);

    const newProductFields = $('#new-product-fields');
    if (newProductFields) {
      newProductFields.style.display = 'none';
    }
  },

  read(f) {
    const qty = +val(f, 'qty') || 0;
    const mode = val(f, 'priceMode');

    const amount = mode === 'unit'
      ? qty * (+val(f, 'unitPrice') || 0)
      : (+val(f, 'amount') || 0);

    const productName = val(f, 'productName').trim();

    return {
      productName,
      newName: productName,
      productId: '',
      qty: val(f, 'qty'),
      amount: amount.toFixed(2),
      credit: f.elements.credit.checked,
      supplier: val(f, 'supplier'),
      account: val(f, 'account')
    };
  }
};
