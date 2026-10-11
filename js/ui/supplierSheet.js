import { store } from '../data/store.js';
import { sheet } from './sheet.js';
import { supplierDebts } from '../domain/debts.js';
import { productName, accountName, supplierNames } from '../domain/lookup.js';
import { saveDebt, payDebt, savePayment, deletePayment, settleSupplier } from '../services/debts.js';
import { deleteWithConfirm } from './deleteFlow.js';
import { opts, accountOptions } from './forms/fields.js';
import { fmt, r2 } from '../core/format.js';
import { dayLabel } from '../core/dates.js';
import { EPS } from '../core/constants.js';
import { esc, toast } from './dom.js';
import { onClick } from './actions.js';

/** نافذة المورّد: كل التفاصيل والتعديل والسداد داخلها بدون نوافذ إضافية */
const S = { key: '', open: '', settle: false };
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const v = name => sheet.form.elements[name].value;

function debtRow(state, d) {
  const t = d.t, isOpen = S.open === t.id, remaining = Math.max(0, t.qty - d.soldQty);
  const amountCell = d.left > EPS
    ? (d.due > EPS ? `<b class="due">${fmt(d.due)}</b>` : `<b class="neg">${fmt(d.left)}</b>`)
    : '<b class="pos">مسدد ✓</b>';
  let h = `<div class="row-i${isOpen ? ' open' : ''}" data-action="sup-toggle" data-id="${t.id}"><span class="ic">📦</span>
    <div class="mid">${esc(productName(state, t.productId))} × ${t.qty}<span>${dayLabel(t.date)} · مباع ${r2(d.soldQty)} من ${t.qty}${d.paid > 0 ? ' · مسدد ' + fmt(d.paid) : ''}</span></div>
    ${amountCell}<span class="chev">‹</span></div>`;
  if (!isOpen) return h;

  const payBox = d.left > EPS ? `<div class="paybox">
      <div class="row"><label>المبلغ<input name="pa" type="number" step="any" inputmode="decimal" value="${r2(d.due > EPS ? d.due : d.left)}"></label>
        <label>من محفظة<select name="pacc">${accountOptions(state)}</select></label></div>
      <div class="exb"><button type="button" class="btn sm" data-action="sup-pay" data-id="${t.id}">${d.due > EPS ? '💵 سدّد المستحق' : '💵 سداد'}</button>
        ${d.due > EPS && d.left > d.due + EPS ? `<button type="button" class="btn sm alt" data-action="sup-pay-all" data-id="${t.id}">سداد المتبقي كله</button>` : ''}</div></div>` : '';

  return h + `<div class="ex">
    <div class="sumbox sm">
      <div class="stat"><span>سعر الوحدة من المورّد</span><b>${fmt(d.unit)}</b></div>
      <div class="stat"><span>المباع (${r2(d.soldQty)}) · ثمنه للمورّد</span><b>${fmt(d.soldCost)}</b></div>
      <div class="stat"><span>مسدد</span><b class="pos">${fmt(d.paid)}</b></div>
      <div class="stat"><span>مستحق الآن (عن المباع)</span><b class="${d.due > EPS ? 'due' : ''}">${fmt(d.due)}</b></div>
      <div class="stat"><span>باقي بالمخزون (${r2(remaining)}) · لم يُدفع ثمنه بعد</span><b>${fmt(Math.max(0, d.left - d.due))}</b></div>
    </div>
    ${payBox}
    <div class="sh2">تعديل الدين</div>
    <div class="row"><label>الكمية<input name="dq" type="number" step="any" inputmode="decimal" value="${t.qty}"></label>
      <label>المبلغ الإجمالي<input name="da" type="number" step="any" inputmode="decimal" value="${t.amount}"></label></div>
    <label>اسم المورّد<input name="ds" list="sups" value="${esc(t.supplier || '')}" autocomplete="off"><datalist id="sups">${supplierNames(state).map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
    <div class="exb"><button type="button" class="btn sm" data-action="sup-save-debt" data-id="${t.id}">حفظ التعديل</button>
      <button type="button" class="btn sm dng" data-action="sup-del-debt" data-id="${t.id}">حذف الدين</button></div>
  </div>`;
}

function paymentRow(state, ds, x) {
  const debt = ds.find(d => d.t.id === x.ref), isOpen = S.open === x.id;
  let h = `<div class="row-i${isOpen ? ' open' : ''}" data-action="sup-toggle" data-id="${x.id}"><span class="ic">💵</span>
    <div class="mid">${esc(debt ? productName(state, debt.t.productId) : 'دين')}<span>${dayLabel(x.date)} · ${esc(accountName(state, x.account))}</span></div>
    <b>${fmt(x.amount)}</b><span class="chev">‹</span></div>`;
  if (isOpen) h += `<div class="ex"><div class="row">
      <label>المبلغ<input name="xa" type="number" step="any" inputmode="decimal" value="${x.amount}"></label>
      <label>المحفظة<select name="xacc">${opts(state.accounts.map(a => [a.id, a.name]), x.account)}</select></label></div>
    <div class="exb"><button type="button" class="btn sm" data-action="sup-save-pay" data-id="${x.id}">حفظ</button>
      <button type="button" class="btn sm dng" data-action="sup-del-pay" data-id="${x.id}">حذف السداد</button></div></div>`;
  return h;
}

function settleArea(state, due, left) {
  if (left <= EPS) return '<div class="okbox">✅ ما في دين متبقي</div>';
  if (due <= EPS) return '<div class="okbox">لا يوجد مستحق الآن. كل ما بعت منه مسدد ✓</div>';
  if (!S.settle) return `<button type="button" class="btn" data-action="sup-settle-toggle">💵 سدّد المستحق · ${fmt(due)}</button>`;
  return `<div class="paybox"><div class="sh2">سداد المستحق · بيتوزّع على الديون من الأقدم</div>
    <div class="row"><label>المبلغ<input name="sa" type="number" step="any" inputmode="decimal" value="${r2(due)}"></label>
      <label>من محفظة<select name="sacc">${accountOptions(state)}</select></label></div>
    <div class="exb"><button type="button" class="btn sm" data-action="sup-settle-go">تأكيد السداد</button>
      <button type="button" class="btn sm alt" data-action="sup-settle-toggle">إلغاء</button></div></div>`;
}

function render(state) {
  const ds = supplierDebts(state, S.key);
  const total = sum(ds, d => d.t.amount), paid = sum(ds, d => d.paid), soldCost = sum(ds, d => d.soldCost);
  const left = sum(ds, d => Math.max(0, d.left)), due = sum(ds, d => d.due);
  const pays = state.tx.filter(x => x.type === 'debtpay' && ds.some(d => d.t.id === x.ref))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return `<div class="sumbox">
    <div class="stat"><span>إجمالي ما أخذته بالدين</span><b>${fmt(total)}</b></div>
    <div class="stat"><span>ثمن المباع منه</span><b>${fmt(soldCost)}</b></div>
    <div class="stat"><span>المسدد</span><b class="pos">${fmt(paid)}</b></div>
    <div class="stat sum"><span>مستحق الآن (عن المباع)</span><b class="${due > EPS ? 'due' : 'pos'}">${fmt(due)}</b></div>
    <div class="stat"><span>بضاعة بالمخزون (لم تُدفع بعد)</span><b>${fmt(Math.max(0, left - due))}</b></div>
    <div class="note">ما انباع بتدفع ثمنه للمورّد، وربحك هو الفرق بين سعر بيعك وسعره. وما لم ينبع بعد بيضل دين مؤجل.</div>
  </div>
  ${settleArea(state, due, left)}
  <div class="sh">الدفعات · اضغط على أي دفعة لتفاصيلها وتعديلها</div>
  <div class="list">${ds.map(d => debtRow(state, d)).join('')}</div>
  ${pays.length ? `<div class="sh">السدادات · اضغط للتعديل أو الحذف</div><div class="list">${pays.map(x => paymentRow(state, ds, x)).join('')}</div>` : ''}`;
}

const title = () => '🤝 ' + (S.key || 'بدون مورّد');

function redraw() {
  if (!supplierDebts(store.state, S.key).length) { sheet.close(); return; }
  sheet.setTitle(title());
  sheet.setBody(render(store.state));
}

function done(res, message) {
  if (res.error) return toast(res.error, true);
  S.open = ''; S.settle = false;
  toast(message); redraw();
}

onClick('sup-open', d => {
  S.key = d.key; S.open = ''; S.settle = false;
  sheet.open({ title: title(), html: render(store.state), onClose: () => { S.open = ''; S.settle = false; } });
});
onClick('sup-toggle', d => { S.open = S.open === d.id ? '' : d.id; redraw(); });

onClick('sup-save-debt', d => {
  const name = v('ds').trim();
  const res = saveDebt(d.id, { qty: v('dq'), amount: v('da'), supplier: name });
  if (!res.error) S.key = name; // لو غيّر اسم المورّد نتبعه
  done(res, 'تم التعديل ✓');
});
onClick('sup-del-debt', d => {
  if (deleteWithConfirm(d.id, 'حذف هذا الدين؟ بيرجع المخزون كأنه ما انشترى.')) done({}, 'تم حذف الدين');
});
onClick('sup-pay', d => done(payDebt(d.id, { amount: v('pa'), account: v('pacc') }), 'تم السداد ✓'));
onClick('sup-pay-all', d => done(payDebt(d.id, { all: true, account: v('pacc') }), 'تم السداد ✓'));

onClick('sup-save-pay', d => done(savePayment(d.id, { amount: v('xa'), account: v('xacc') }), 'تم التعديل ✓'));
onClick('sup-del-pay', d => {
  if (confirm('حذف هذا السداد؟ المبلغ بيرجع لمحفظتك والدين بيزيد.')) done(deletePayment(d.id), 'تم حذف السداد');
});

onClick('sup-settle-toggle', () => { S.settle = !S.settle; redraw(); });
onClick('sup-settle-go', () => done(settleSupplier(S.key, { amount: v('sa'), account: v('sacc') }), 'تم تسجيل السداد ✓'));