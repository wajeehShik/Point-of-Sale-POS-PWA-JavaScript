import { store } from '../data/store.js';
import { prefs } from '../data/prefs.js';

const DB = 'mali_backups';
const ST = 'snaps';
const KEEP = 10; // عدد النسخ المحفوظة

let dirty = false; // هل تغيّرت البيانات منذ آخر نسخة؟

// فتح قاعدة النسخ
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'at' });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

// تنفيذ عملية على القاعدة وإرجاع نتيجتها
async function run(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(ST, mode);
    const req = fn(t.objectStore(ST));
    t.oncomplete = () => { db.close(); res(req && req.result); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}

// المدة بالدقائق: 5 / 60 / 1440 (يوم) / 2880 (يومين) / 0 = إيقاف
export const getMinutes = () => +prefs.get('mali_ab_min', '5');
export const setMinutes = m => prefs.set('mali_ab_min', String(m));

// قائمة النسخ من الأحدث للأقدم
export const listBackups = () =>
  run('readonly', s => s.getAll())
    .then(a => (a || []).sort((x, y) => y.at - x.at))
    .catch(() => []);

// حفظ نسخة الآن
export async function backupNow() {
  try {
    await run('readwrite', s => s.put({
      at: Date.now(),
      data: JSON.stringify(store.state),
    }));

    // حذف الأقدم والإبقاء على آخر KEEP نسخة
    const all = await listBackups();
    if (all.length > KEEP) {
      await run('readwrite', s => { all.slice(KEEP).forEach(b => s.delete(b.at)); });
    }

    prefs.set('mali_ab_last', Date.now());
    dirty = false;
    return true;
  } catch {
    return false;
  }
}

// استعادة نسخة (مع حفظ الحالة الحالية قبلها للأمان)
export async function restoreBackup(at) {
  const b = (await listBackups()).find(x => x.at === at);
  if (!b) return { error: 'النسخة غير موجودة' };
  await backupNow();
  return store.replace(JSON.parse(b.data));
}

// تشغيل النظام (يُستدعى مرة واحدة عند بدء التطبيق)
export function initAutoBackup() {
  store.subscribe(() => { dirty = true; });

  const check = () => {
    const min = getMinutes();
    if (!min || !dirty) return;
    const last = +prefs.get('mali_ab_last', 0);
    if (Date.now() - last >= min * 60000) backupNow();
  };

  setInterval(check, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) check();
  });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
}