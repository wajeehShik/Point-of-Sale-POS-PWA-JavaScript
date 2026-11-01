import { store } from '../data/store.js';

const DB_NAME = 'mali-backups';
const DB_VERSION = 1;
const STORE_NAME = 'backups';
const PROMPT_KEY = 'mali-backup-prompted-date';
const MAX_DAILY_BACKUPS = 90;
const MAX_SAFETY_BACKUPS = 20;

export function localDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('المتصفح لا يدعم التخزين الداخلي للنسخ'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => {
      reject(request.error || new Error('تعذر فتح قاعدة النسخ'));
    };

    request.onblocked = () => {
      reject(new Error('قاعدة النسخ مشغولة؛ أغلق تبويبات التطبيق الأخرى وحاول مجددًا'));
    };
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error || new Error('فشلت عملية النسخ'));
    };
  });
}

async function withStore(mode, action) {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(STORE_NAME, mode);
    const objectStore = transaction.objectStore(STORE_NAME);
    const result = action(objectStore);

    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => {
        reject(transaction.error || new Error('فشلت عملية قاعدة البيانات'));
      };
      transaction.onabort = () => {
        reject(transaction.error || new Error('أُلغيت عملية قاعدة البيانات'));
      };
    });

    return await result;
  } finally {
    db.close();
  }
}

export function getBackup(id) {
  return withStore('readonly', objectStore =>
    requestResult(objectStore.get(id))
  );
}

export async function listBackups() {
  const backups = await withStore('readonly', objectStore =>
    requestResult(objectStore.getAll())
  );

  return (backups || []).sort((a, b) =>
    b.id.localeCompare(a.id)
  );
}

export async function hasBackupForDate(date = localDate()) {
  return !!(await getBackup(`daily-${date}`));
}

export function wasPromptedToday(date = localDate()) {
  try {
    return localStorage.getItem(PROMPT_KEY) === date;
  } catch {
    return false;
  }
}

export function markPromptedToday(date = localDate()) {
  try {
    localStorage.setItem(PROMPT_KEY, date);
  } catch {
    // قد تعود النافذة إذا تعذر حفظ هذا الإعداد في المتصفح.
  }
}

async function putBackup(backup) {
  return withStore('readwrite', objectStore =>
    requestResult(objectStore.put(backup))
  );
}

async function pruneBackups() {
  const backups = await listBackups();

  const daily = backups
    .filter(backup => backup.type === 'daily')
    .sort((a, b) => b.date.localeCompare(a.date));

  const safety = backups
    .filter(backup => backup.type === 'safety')
    .sort((a, b) => b.id.localeCompare(a.id));

  const keepIds = new Set([
    ...daily
      .slice(0, MAX_DAILY_BACKUPS)
      .map(backup => backup.id),

    ...safety
      .slice(0, MAX_SAFETY_BACKUPS)
      .map(backup => backup.id)
  ]);

  const removeIds = backups
    .filter(backup => !keepIds.has(backup.id))
    .map(backup => backup.id);

  if (!removeIds.length) return;

  await withStore('readwrite', objectStore => {
    removeIds.forEach(id => objectStore.delete(id));
    return Promise.resolve();
  });
}

export async function saveDailyBackup(state = store.state, date = localDate()) {
  const backup = {
    id: `daily-${date}`,
    date,
    label: `نسخة يوم ${date}`,
    type: 'daily',
    createdAt: new Date().toISOString(),
    data: structuredClone(state)
  };

  await putBackup(backup);
  await pruneBackups();

  return backup;
}

export async function restoreBackup(id) {
  const selected = await getBackup(id);

  if (!selected || !selected.data) {
    return { error: 'النسخة المحددة غير موجودة أو تالفة' };
  }

  if (
    !Array.isArray(selected.data.tx) ||
    !Array.isArray(selected.data.accounts)
  ) {
    return { error: 'بيانات النسخة غير صالحة' };
  }

  const now = new Date();
  const date = localDate();
  const time =
    `${String(now.getHours()).padStart(2, '0')}:` +
    `${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    await putBackup({
      id: `safety-${now.getTime()}`,
      date,
      label: `نسخة أمان قبل الاستعادة — ${date} ${time}`,
      type: 'safety',
      createdAt: now.toISOString(),
      data: structuredClone(store.state)
    });

    await pruneBackups();
  } catch (error) {
    return {
      error: `لم يتم تغيير البيانات؛ تعذر حفظ نسخة الأمان. ${error.message || ''}`.trim()
    };
  }

  return store.replace(selected.data);
}
