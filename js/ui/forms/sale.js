import { fmt } from '../../core/format.js';
import { findProduct } from '../../domain/lookup.js';
import { stock } from '../../domain/inventory.js';
import { $ } from '../dom.js';
import {
  numberField,
  accountField,
  val,
  setValue
} from './fields.js';

export default {
  render({ state }) {
    const products = state.products || [];

    return `
      <label>
        ابحث عن المنتج أو اكتب اسم منتج جديد
        <input
          name="productName"
          list="sale-products-list"
          autocomplete="off"
          placeholder="اكتب اسم المنتج..."
          required
        >
        <datalist id="sale-products-list">
          ${products.map(p => `
            <option value="${String(p.name)
              .replaceAll('&', '&amp;')
              .replaceAll('"', '&quot;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')}"></option>
          `).join('')}
        </datalist>
      </label>

      <div id="new-product-fields" style="display:none">
        <div class="note">
          هذا المنتج غير موجود. أدخل تكلفته ومخزونه الحالي لإضافته.
        </div>
        <div class="row">
          ${numberField('newCost', 'تكلفة الوحدة', '', '0')}
          ${numberField('newStock', 'المخزون الموجود', '', '1')}
        </div>
      </div>

      <div class="row">
        ${numberField('qty', 'الكمية', '', '1')}
        ${numberField('amount', 'إجمالي البيع', 'الإجمالي')}
      </div>

      <div class="sumbox">
        <div class="stat">
          <span>سعر الوحدة</span>
          <b id="tot">—</b>
        </div>
        <div class="stat">
          <span>تكلفة الوحدة</span>
          <b id="cst">—</b>
        </div>
        <div class="stat">
          <span>الربح</span>
          <b id="prf">—</b>
        </div>
        <div class="note" id="stk"></div>
      </div>
    ` + accountField(state, 'الحساب الذي استلم المال');
  },

  input(f, e, { state }) {
    if (e.target.name === 'amount') {
      f.dataset.amtT = '1';
    }

    if (e.target.name === 'productName') {
      const name = val(f, 'productName').trim().toLocaleLowerCase();
      const product = (state.products || []).find(
        p => p.name.trim().toLocaleLowerCase() === name
      );

      const newFields = $('#new-product-fields');
      if (newFields) {
        newFields.style.display = name && !product ? 'block' : 'none';
      }

      if (!product) {
        f.dataset.amtT = '';
      }
    }
  },

  change(f, e) {
    if (e.target.name === 'productName') {
      f.dataset.amtT = '';
    }
  },

  sync(f, { state }) {
    const name = val(f, 'productName').trim().toLocaleLowerCase();
    const p = (state.products || []).find(
      item => item.name.trim().toLocaleLowerCase() === name
    );

    const q = +val(f, 'qty') || 0;

    if (!f.dataset.amtT && p && p.price > 0 && q > 0) {
      f.elements.amount.value = +(q * p.price).toFixed(2);
    }

    const amount = +val(f, 'amount') || 0;
    const cost = p ? (+p.cost || 0) : (+val(f, 'newCost') || 0);
    const profit = amount - cost * q;

    $('#tot').textContent =
      q > 0 && amount > 0 ? fmt(amount / q) : '—';

    $('#cst').textContent =
      name ? fmt(cost) : '—';

    const profitElement = $('#prf');
    if (q > 0 && amount > 0) {
      profitElement.textContent =
        (profit >= 0 ? '+' : '') + fmt(profit);
      profitElement.className = profit >= 0 ? 'pos' : 'neg';
    } else {
      profitElement.textContent = '—';
      profitElement.className = '';
    }

    const newFields = $('#new-product-fields');
    if (newFields) {
      newFields.style.display = name && !p ? 'block' : 'none';
    }

    $('#stk').textContent = p
      ? `المتوفر في المخزون: ${stock(state, p.id)}`
      : (name
          ? `مخزون المنتج الجديد: ${+val(f, 'newStock') || 0}`
          : '');
  },

  fill(f, t, { state }) {
    const product = findProduct(state, t.productId);
    setValue(f, 'productName', product ? product.name : '');
    setValue(f, 'qty', t.qty);
    setValue(f, 'amount', t.amount);
    setValue(f, 'account', t.account);
  },

  read: f => ({
    productName: val(f, 'productName').trim(),
    qty: val(f, 'qty'),
    amount: val(f, 'amount'),
    account: val(f, 'account'),
    newCost: val(f, 'newCost'),
    newStock: val(f, 'newStock')
  })
};
