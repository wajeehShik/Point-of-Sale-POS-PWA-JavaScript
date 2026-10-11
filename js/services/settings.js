import { store, newId } from '../data/store.js';

export const setCycleDay = day => store.transact(s => { s.cycleDay = +day; });

export function addAccount(name) {
  return store.transact(s => {
    const n = (name || '').trim();
    if (!n) return { error: 'اكتب اسم المحفظة' };
    s.accounts.push({ id: newId(), name: n });
  });
}

export const clearTransactions = () => store.transact(s => { s.tx = []; });
export const resetAll = () => store.reset();

export function importBackup(text) {
  try { return store.replace(JSON.parse(text)); }
  catch { return { error: 'الملف غير صالح' }; }
}