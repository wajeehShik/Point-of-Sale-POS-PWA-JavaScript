import {
  getMinutes,
  setMinutes,
  backupNow,
  listBackups,
  restoreBackup,
} from '../services/autobackup.js';

// خيارات المدة: [الدقائق، النص]
const OPTIONS = [
  [0, 'إيقاف'],
  [5, 'كل 5 دقائق'],
  [60, 'كل ساعة'],
  [1440, 'كل يوم'],
  [2880, 'كل يومين'],
];

// تنسيق التاريخ والوقت
const when = ts =>
  new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// حجم النسخة بالكيلوبايت
const kb = s => Math.max(1, Math.round(s.length / 1024)) + ' KB';

// هيكل البطاقة (القائمة تُملأ لاحقاً لأن القراءة غير متزامنة)
const cardHTML = () => `
  <section id="abcard" class="abcard">
    <h3>🗄️ النسخ الاحتياطي التلقائي</h3>
    <p class="abnote">تُحفظ النسخ داخل التطبيق ولا تُحفظ إلا إذا تغيّرت البيانات.</p>

    <label for="abmin">تكرار النسخ</label>
    <select id="abmin">
      ${OPTIONS.map(([v, l]) =>
        `<option value="${v}"${getMinutes() === v ? ' selected' : ''}>${l}</option>`
      ).join('')}
    </select>

    <button type="button" class="btn" data-ab="now">حفظ نسخة الآن</button>

    <h4>النسخ المحفوظة</h4>
    <div id="ablist" class="ablist">جارٍ التحميل…</div>
  </section>`;

// ملء قائمة النسخ
async function fillList() {
  const box = document.getElementById('ablist');
  if (!box) return;

  const all = await listBackups();

  // قد تكون الصفحة أُعيد رسمها أثناء الانتظار
  if (!document.getElementById('ablist')) return;

  box.innerHTML = all.length
    ? all.map(b => `
        <div class="abrow">
          <span>${when(b.at)} · ${kb(b.data)}</span>
          <button type="button" class="abbtn" data-ab="restore" data-at="${+b.at}">استعادة</button>
        </div>`).join('')
    : 'لا توجد نسخ بعد';
}

// إضافة البطاقة إلى صفحة الإعدادات إذا لم تكن موجودة
function mount() {
  if (document.body.dataset.page !== 'settings') return;

  const view = document.getElementById('view');
  if (!view || view.querySelector('#abcard')) return;

  view.insertAdjacentHTML('beforeend', cardHTML());
  fillList();
}

export function initBackupSettings() {
  // الراوتر يعيد كتابة #view عند كل تحديث، فنراقبه ونعيد إضافة البطاقة
  const view = document.getElementById('view');
  new MutationObserver(mount).observe(view, { childList: true });

  // الأحداث على document: تبقى تعمل حتى لو أُعيد رسم الصفحة
  document.addEventListener('change', e => {
    if (e.target.id === 'abmin') setMinutes(+e.target.value);
  });

  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-ab]');
    if (!btn) return;

    if (btn.dataset.ab === 'now') {
      btn.disabled = true;
      const ok = await backupNow();
      btn.disabled = false;
      alert(ok ? 'تم حفظ النسخة ✅' : 'تعذر حفظ النسخة');
      fillList();
    }

    if (btn.dataset.ab === 'restore') {
      if (!confirm('سيتم استبدال بياناتك الحالية بهذه النسخة. (تُحفظ نسخة من حالتك الحالية أولاً). متابعة؟')) return;
      const r = await restoreBackup(+btn.dataset.at);
      if (r && r.error) alert(r.error);
    }
  });

  mount();
}