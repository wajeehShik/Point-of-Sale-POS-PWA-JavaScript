import { INCOME_SOURCES } from '../../core/constants.js';
import { opts, sectorField, numberField, accountField, val, setValue } from './fields.js';

/* نعيد بناء المصادر فقط لما يتغير القسم حتى ما يضيع اختيار المستخدم */
function syncSource(f) {
  const c = f.elements.category, sector = f.elements.sector.value;
  if (c.dataset.sec === sector) return;
  c.innerHTML = opts(INCOME_SOURCES[sector].map(x => [x, x]));
  c.dataset.sec = sector;
}

export default {
  render: env => sectorField(env)
    + '<label>مصدر الدخل<select name="category"></select></label>'
    + numberField('amount', 'المبلغ', 'المبلغ')
    + accountField(env.state, 'الحساب الذي دخلت إليه'),

  sync: syncSource,

  fill(f, t) {
    setValue(f, 'sector', t.sector); syncSource(f);
    setValue(f, 'category', t.category);
    setValue(f, 'amount', t.amount);
    setValue(f, 'account', t.account);
  },

  read: f => ({ sector: val(f, 'sector'), category: val(f, 'category'), amount: val(f, 'amount'), account: val(f, 'account') }),
};