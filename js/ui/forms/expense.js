import { UNITS, EXPENSE_DEFAULTS } from '../../core/constants.js';
import { fmt } from '../../core/format.js';
import { lastUnitPrice } from '../../domain/analytics.js';
import { esc, $ } from '../dom.js';
import { onClick } from '../actions.js';
import { sheet } from '../sheet.js';
import { sectorField, numberField, accountField, val, setValue } from './fields.js';

function suggestions(state, ctx) {
  const base = ctx ? EXPENSE_DEFAULTS[ctx] : [...EXPENSE_DEFAULTS.home, ...EXPENSE_DEFAULTS.invest];
  const used = state.tx.filter(t => t.type === 'expense' && (!ctx || t.sector === ctx)).map(t => t.category);
  return [...new Set([...used, ...base])].map(c => `<option value="${esc(c)}">`).join('');
}

function setUnit(f, unit, manual) {
  const other = !!unit && !UNITS.includes(unit);
  f.elements.eunit.value = unit || '';
  document.querySelectorAll('#units .u').forEach(b =>
    b.classList.toggle('on', b.dataset.unit === unit || (b.dataset.unit === '__other' && other)));
  const eo = f.elements.eother;
  eo.style.display = other ? 'block' : 'none';
  if (other) eo.value = unit;
  if (manual) f.dataset.touched = '1';
}

onClick('unit-pick', d => {
  const f = sheet.form;
  if (d.unit === '__other') {
    setUnit(f, '', true);
    $('#units [data-unit="__other"]').classList.add('on');
    f.elements.eother.style.display = 'block';
    f.elements.eother.value = '';
    f.elements.eother.focus();
  } else {
    setUnit(f, f.elements.eunit.value === d.unit ? '' : d.unit, true);
  }
  f.dispatchEvent(new Event('input', { bubbles: true })); // لتحديث السعر المحسوب
});

export default {
  render(env) {
    const units = UNITS.map(u => `<button type="button" class="u" data-action="unit-pick" data-unit="${u}">${u}</button>`).join('')
      + '<button type="button" class="u" data-action="unit-pick" data-unit="__other">أخرى</button>';
    return sectorField(env)
      + `<label>الصنف<input name="category" list="items" placeholder="مثال: بطاطا" autocomplete="off"><datalist id="items">${suggestions(env.state, env.ctx)}</datalist></label>
      <div class="row">${numberField('eqty', 'الكمية (اختياري)', '5')}${numberField('amount', 'السعر الإجمالي', 'المبلغ')}</div>
      <div class="lbl">الوحدة</div>
      <div class="units" id="units">${units}</div>
      <input type="hidden" name="eunit">
      <input name="eother" placeholder="اكتب الوحدة" style="display:none;margin-top:-4px;margin-bottom:12px" autocomplete="off">
      <div class="total" id="uprice"></div>`
      + accountField(env.state, 'الحساب الذي دُفع منه');
  },

  input(f, e) { if (e.target.name === 'eother') f.dataset.touched = '1'; },

  sync(f, { state, editId }) {
    const eo = f.elements.eother;
    if (eo.style.display !== 'none') f.elements.eunit.value = eo.value.trim();
    const item = val(f, 'category').trim();

    /* نقترح وحدة الصنف من آخر مرة اشتريته فيها */
    if (!f.elements.eunit.value && !f.dataset.touched && item) {
      const last = lastUnitPrice(state, item, '', editId);
      if (last && last.eunit) setUnit(f, last.eunit);
    }
    const q = +val(f, 'eqty'), amount = +val(f, 'amount'), unit = val(f, 'eunit').trim();
    const lines = [];
    if (q > 0 && amount > 0) lines.push(`سعر ${unit || 'الوحدة'}: <b>${fmt(amount / q)}</b>`);
    const last = item ? lastUnitPrice(state, item, unit, editId) : null;
    if (last) lines.push(`آخر مرة: ${fmt(last.unitPrice)}${last.eunit ? ' / ' + esc(last.eunit) : ''} (${last.date})`);
    $('#uprice').innerHTML = lines.join('<br>');
  },

  fill(f, t) {
    setValue(f, 'sector', t.sector);
    setValue(f, 'category', t.category);
    setValue(f, 'eqty', t.eqty);
    setValue(f, 'amount', t.amount);
    setValue(f, 'account', t.account);
    f.dataset.touched = '1';
    setUnit(f, t.eunit || '');
  },

  read: f => ({
    sector: val(f, 'sector'), category: val(f, 'category'), amount: val(f, 'amount'),
    eqty: val(f, 'eqty'), eunit: val(f, 'eunit'), account: val(f, 'account'),
  }),
};