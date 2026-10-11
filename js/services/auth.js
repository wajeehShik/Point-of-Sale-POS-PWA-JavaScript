import { prefs } from '../data/prefs.js';

const KEY = 'mali_auth_v1';
const readCred = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

async function hash(s) {
  const str = 'mali|' + s;
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return 'x' + btoa(unescape(encodeURIComponent(str)));
}

export const auth = {
  isDefault: () => !readCred(),
  user: () => (readCred() ? readCred().user : '123'),

  async check(user, password) {
    const c = readCred();
    user = (user || '').trim();
    if (!c) return user === '123' && password === '123';
    return user === c.user && (await hash(password)) === c.ph;
  },
  async saveCredentials(user, password) {
    localStorage.setItem(KEY, JSON.stringify({ user: user.trim(), ph: await hash(password) }));
  },

  /* الجلسة تعيش فقط ما دام التطبيق مفتوحاً */
  isLoggedIn() { localStorage.removeItem('mali_sess'); return sessionStorage.getItem('mali_sess') === '1'; },
  login() { sessionStorage.setItem('mali_sess', '1'); },
  logout() { sessionStorage.removeItem('mali_sess'); },

  /* القفل التلقائي: 0 فوراً، 1 أو 5 دقائق، -1 فقط عند فتح التطبيق من جديد */
  lockMinutes() { const v = prefs.get('mali_lock'); return v === '' ? 0 : v === 'never' ? -1 : +v; },
  setLockMinutes(v) { prefs.set('mali_lock', v); },

  watchAway(onLock) {
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (!hiddenAt || !this.isLoggedIn()) return;
      const away = Date.now() - hiddenAt, min = this.lockMinutes();
      hiddenAt = 0;
      if (min >= 0 && away >= min * 60000) { this.logout(); onLock(); }
    });
  },
};