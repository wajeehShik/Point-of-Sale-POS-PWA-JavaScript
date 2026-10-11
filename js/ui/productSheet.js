import { store } from '../data/store.js';
import { sheet } from './sheet.js';
import { findProduct } from '../domain/lookup.js';
import { stock, productStats } from '../domain/inventory.js';
import { debts } from '../domain/debts.js';
import { saveProduct, deleteProduct } from '../services/products.js';
import { numberField } from './forms/fields.js';
import { fmt } from '../core/format.js';
import { esc, $, toast } from './dom.js';
import { onClick } from './actions.js';

let currentId = null;
const signCls = n => (n >= 0 ? 'pos' : 'neg');

function body(s, p) {
  const { sold, profit } = productStats(s, p.id);
  const ds = debts(s).filter(d => d.t.productId === p.id);
  const debt = ds.reduce((a, d) => a + Math.max(0, d.left), 0), due = ds.reduce((a, d) => a + d.due, 0);
  return `<label>اسم المنتج<input name="pname" value="${esc(p.name)}"></label>
  <div class="row">${numberField('cost', 'سعر التكلفة (للوحدة)', '', p.cost)}${numberField('price', 'سعر البيع (للوحدة)', '', p.price)}</div>
  <div class="row">${numberField('stock', 'الكمية المتوفرة', '', stock(s, p.id))}${numberField('min', 'الحد الأدنى للتنبيه', '', p.min || 0)}</div>
  <div class="sumbox">
    <div class="stat"><span>ربح الوحدة</span><b id="pu">—</b></div>
    <div class="stat"><span>هامش الربح</span><b id="pm">—</b></div>
    <div class="stat"><span>ربح متوقع من المتبقي</span><b id="pe">—</b></div>
    <div class="stat"><span>الربح المتحقق (بيع ${sold})</span><b class="${signCls(profit)}">${profit > 0 ? '+' : ''}${fmt(profit)}</b></div>
    ${debt > 0.005 ? `<div class="stat"><span>دين عليك لهذا المنتج</span><b class="neg">${fmt(debt)}</b></div>
      <div class="stat"><span>منه مستحق الآن (عن المباع)</span><b class="due">${fmt(due)}</b></div>` : ''}
    <div class="note">تعديل الكمية = جرد وتصحيح للمخزون. وتغيير السعر لا يغيّر أرباح المبيعات السابقة.</div>
  </div>
  <div class="savebar"><button class="btn">حفظ</button>
    <button type="button" class="btn alt" style="color:var(--danger);margin-top:8px" data-action="product-delete">حذف المنتج</button></div>`;
}

/* ربح الوحدة والهامش يتحدثون وإنت بتعدّل الأسعار */
function live() {
  const f = sheet.form, c = +f.elements.cost.value || 0, pr = +f.elements.price.value || 0, st = +f.elements.stock.value || 0;
  const unit = pr - c, set = (id, text) => { const el = $(id); el.textContent = text; el.className = signCls(unit); };
  set('#pu', (unit > 0 ? '+' : '') + fmt(unit));
  set('#pm', pr > 0 ? Math.round((unit / pr) * 100) + '%' : '—');
  set('#pe', (unit * st > 0 ? '+' : '') + fmt(unit * st));
}

export function openProduct(id) {
  const p = findProduct(store.state, id);
  if (!p) return;
  currentId = id;
  sheet.open({ title: 'تعديل منتج', html: body(store.state, p), onSubmit: save, onInput: live, onClose: () => { currentId = null; } });
  live();
}

function save() {
  const f = sheet.form, v = n => f.elements[n].value;
  const res = saveProduct(currentId, { name: v('pname'), cost: v('cost'), price: v('price'), stock: v('stock'), min: v('min') });
  if (res.error) return toast(res.error, true);
  sheet.close(); toast('تم حفظ المنتج ✓');
}

onClick('product-open', d => openProduct(d.id));
onClick('product-delete', () => {
  if (!confirm('حذف هذا المنتج؟')) return;
  const res = deleteProduct(currentId);
  if (res.error) return toast(res.error, true);
  sheet.close(); toast('تم حذف المنتج');
});