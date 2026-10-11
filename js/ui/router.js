import { $ } from './dom.js';
import { store } from '../data/store.js';

const pages = new Map();
let last = null;

export const register = (name, page) => pages.set(name, page);

export const currentName = () => {
  const n = location.hash.replace('#/', '');
  return pages.has(n) ? n : 'dashboard';
};
export const currentPage = () => pages.get(currentName());

export function refresh() {
  const name = currentName(), page = pages.get(name);
  const y = scrollY, samePage = last === name;
  last = name;
  document.body.dataset.page = name;
  $('#title').textContent = page.title;
  $('#view').innerHTML = page.render(store.state);
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === name));
  scrollTo(0, samePage ? y : 0); // ما نقفز لفوق إذا نفس الصفحة
}

export function startRouter() {
  addEventListener('hashchange', refresh);
  store.subscribe(refresh); // أي تغيير بالبيانات = إعادة رسم تلقائية
  refresh();
}