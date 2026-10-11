import { STORAGE_KEY } from '../core/constants.js';

const defaults = () => ({
  accounts: [
    { id: 'a1', name: 'جوال Pay' }, { id: 'a2', name: 'PalPay' },
    { id: 'a3', name: 'بنك فلسطين' }, { id: 'a4', name: 'كاش' },
  ],
  products: [],
  tx: [],
  cycleDay: 1,
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return s && Array.isArray(s.tx) && Array.isArray(s.accounts) ? { ...defaults(), ...s } : defaults();
  } catch { return defaults(); }
}

let state = load();
const listeners = new Set();
const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const notify = () => listeners.forEach(fn => fn(state));

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /**
   * المكان الوحيد لتعديل البيانات.
   * يشتغل على نسخة: إذا رجّع المُعدِّل {error} ما بيتغير أي شي. وإلا بيتحفظ ويُرسل إشعار.
   */
  transact(mutator) {
    const draft = structuredClone(state);
    const result = mutator(draft) || {};
    if (result.error) return result;
    state = draft; persist(); notify();
    return { ok: true, ...result };
  },

  replace(next) {
    if (!next || !Array.isArray(next.tx) || !Array.isArray(next.accounts)) return { error: 'الملف غير صالح' };
    state = { ...defaults(), ...next }; persist(); notify();
    return { ok: true };
  },

  reset() { localStorage.removeItem(STORAGE_KEY); state = defaults(); notify(); },
};