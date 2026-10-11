import { ui } from '../state.js';
import { store } from '../../data/store.js';
import { stockMap } from '../../domain/inventory.js';
import { fmt } from '../../core/format.js';
import { esc } from '../dom.js';
import { onClick, onInput } from '../actions.js';
import { refresh } from '../router.js';

const LIMIT = 6;

export function productsList(state) {
  const q = ui.productQuery.trim().toLowerCase(), map = stockMap(state);
  const low = x => x.qty <= (x.p.min || 0);
  let items = state.products.map(p => ({ p, qty: map[p.id] }));
  items.sort((a, b) => (low(a) === low(b) ? a.p.name.localeCompare(b.p.name, 'ar') : low(a) ? -1 : 1));
  if (q) items = items.filter(x => x.p.name.toLowerCase().includes(q));
  if (!items.length)
    return `<div class="list"><div class="empty">${state.products.length ? 'ما في منتج بهذا الاسم' : 'أضف منتجاً من خلال ＋ ثم شراء.'}</div></div>`;

  const limit = ui.showAllProducts || q ? items.length : LIMIT;
  const rows = items.slice(0, limit).map(x => `<div class="row-i" data-action="product-open" data-id="${x.p.id}">
    <span class="ic">🏷️</span>
    <div class="mid">${esc(x.p.name)}${x.qty <= 0 ? '<em class="bdg">نفد</em>' : ''}<span>تكلفة ${fmt(x.p.cost)} · بيع ${fmt(x.p.price)} · ربح ${fmt(x.p.price - x.p.cost)}</span></div>
    <b class="${low(x) ? 'warn' : ''}">${x.qty}</b><span class="chev">‹</span></div>`).join('');

  let btn = '';
  if (items.length > limit) btn = `<button class="btn alt" data-action="products-toggle">عرض كل المنتجات (${items.length})</button>`;
  else if (ui.showAllProducts && !q && items.length > LIMIT) btn = '<button class="btn alt" data-action="products-toggle">عرض أقل</button>';
  return `<div class="list">${rows}</div>${btn}`;
}

export function productsSection(state) {
  const n = state.products.length, map = stockMap(state);
  const lowCount = state.products.filter(p => map[p.id] <= (p.min || 0)).length;
  const search = n > LIMIT
    ? `<input class="search" type="search" placeholder="🔍 ابحث عن منتج" value="${esc(ui.productQuery)}" data-input="product-search">` : '';
  return `<h3>المنتجات · ${n}${lowCount ? ` · <span class="warn">${lowCount} منخفض أو نافد</span>` : ''}</h3>${search}<div id="plist">${productsList(state)}</div>`;
}

onInput('product-search', (d, el) => {
  ui.productQuery = el.value;
  document.getElementById('plist').innerHTML = productsList(store.state);
});
onClick('products-toggle', () => { ui.showAllProducts = !ui.showAllProducts; refresh(); });