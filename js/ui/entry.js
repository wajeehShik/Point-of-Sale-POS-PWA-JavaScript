import { store } from '../data/store.js';
import { sheet } from './sheet.js';
import { FORMS } from './forms/index.js';
import { commonFields, setValue } from './forms/fields.js';
import { TX_TYPES } from '../domain/txTypes.js';
import { findTx } from '../domain/lookup.js';
import { saveTransaction } from '../services/transactions.js';
import { deleteWithConfirm } from './deleteFlow.js';
import { currentPage } from './router.js';
import { onClick } from './actions.js';
import { $, toast } from './dom.js';

/** نافذة إضافة/تعديل عملية. كل نوع له نموذج بملف مستقل ضمن forms/ */
const CTX_TYPES = { home: ['income', 'expense'], invest: ['sale', 'purchase', 'expense'] };
const ALL_TYPES = ['income', 'expense', 'sale', 'purchase', 'transfer'];
const TITLES = { home: 'عملية على البيت', invest: 'عملية على الاستثمار' };

let st = null; // { type, ctx, editId, ref }
const env = () => ({ state: store.state, ctx: st.ctx, editId: st.editId, ref: st.ref });
const form = () => FORMS[st.type];

function chips() {
  if (st.editId || st.type === 'debtpay') return '';
  const types = CTX_TYPES[st.ctx] || ALL_TYPES;
  const items = types.map(k => `<button type="button" class="chip${k === st.type ? ' on' : ''}" data-action="entry-type" data-type="${k}"><span>${TX_TYPES[k].icon}</span>${TX_TYPES[k].label}</button>`).join('');
  return `<div class="chips" style="grid-template-columns:repeat(${types.length},1fr)">${items}</div>`;
}

const savebar = () => `<div class="savebar"><button class="btn">حفظ</button>${
  st.editId ? '<button type="button" class="btn alt" style="color:var(--danger);margin-top:8px" data-action="entry-delete">حذف العملية</button>' : ''}</div>`;

function draw() {
  sheet.setBody(chips() + form().render(env()) + commonFields() + savebar());
  const f = sheet.form;
  f.dataset.touched = ''; f.dataset.amtT = '';
  form().sync?.(f, env());
}

function openSheet(title) {
  sheet.open({
    title,
    onSubmit: submit,
    onInput: e => { if (!st) return; form().input?.(sheet.form, e, env()); form().sync?.(sheet.form, env()); },
    onChange: e => { if (!st) return; form().change?.(sheet.form, e, env()); form().sync?.(sheet.form, env()); },
    onClose: () => { st = null; },
  });
}

export function openNew(ctx) {
  st = { type: (CTX_TYPES[ctx] || ALL_TYPES)[0], ctx, editId: null, ref: null };
  openSheet(TITLES[ctx] || 'عملية جديدة');
  draw();
}

export function openEdit(id) {
  const t = findTx(store.state, id);
  if (!t) return;
  st = { type: t.type, ctx: null, editId: id, ref: t.type === 'debtpay' ? t.ref : null };
  openSheet('تعديل عملية');
  draw();
  const f = sheet.form;
  form().fill?.(f, t, env());
  setValue(f, 'note', t.note);
  setValue(f, 'date', t.date);
  f.dataset.amtT = '1';
  $('#dt').style.display = 'none'; $('#datel').style.display = 'block';
  form().sync?.(f, env());
}

function submit() {
  const f = sheet.form;
  const draft = { ...form().read(f), type: st.type, date: f.elements.date.value, note: f.elements.note.value };
  if (st.type === 'debtpay') draft.ref = st.ref;
  const res = saveTransaction(draft, st.editId);
  if (res.error) return toast(res.error, true);
  const wasEdit = !!st.editId;
  sheet.close();
  toast(wasEdit ? 'تم تعديل العملية ✓' : 'تم الحفظ ✓');
}

onClick('fab', () => openNew(currentPage().ctx ?? null));
onClick('tx-edit', d => openEdit(d.id));
onClick('entry-type', d => { st.type = d.type; draw(); });
onClick('entry-date', () => { $('#dt').style.display = 'none'; $('#datel').style.display = 'block'; });
onClick('entry-delete', () => { if (deleteWithConfirm(st.editId)) { sheet.close(); toast('تم حذف العملية'); } });