import { store } from '../../data/store.js';
import { auth } from '../../services/auth.js';
import { install } from '../../services/install.js';
import { setCycleDay, addAccount, clearTransactions, resetAll, importBackup } from '../../services/settings.js';
import { backupFile } from '../../services/export.js';
import { setPeriod } from '../periodBar.js';
import { installGo } from '../install.js';
import { refresh } from '../router.js';
import { onClick, onChange } from '../actions.js';
import { esc, $, toast, download } from '../dom.js';
import { listBox } from '../components.js';

const LOCK_OPTIONS = [['0', 'فوراً عند الخروج من التطبيق'], ['1', 'بعد دقيقة من الخروج'], ['5', 'بعد 5 دقائق من الخروج'], ['never', 'فقط عند فتح التطبيق من جديد']];

const select = (options, selected, change) =>
  `<select data-change="${change}">${options.map(([v, l]) => `<option value="${v}"${String(selected) === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;

export default {
  title: 'الإعدادات',
  ctx: null,
  render(state) {
    const lock = auth.lockMinutes() < 0 ? 'never' : String(auth.lockMinutes());
    const days = Array.from({ length: 28 }, (_, i) => [String(i + 1), i === 0 ? '1 (الشهر العادي)' : String(i + 1)]);
    return `
    ${auth.isDefault() ? '<div class="warnbox">⚠️ ما زلت تستخدم بيانات الدخول الافتراضية (123). يفضّل تغييرها.</div>' : ''}

    <h3>🔒 قفل التطبيق</h3>
    <div class="card"><label>اطلب تسجيل الدخول مجدداً${select(LOCK_OPTIONS, lock, 'set-lock')}</label>
      <div style="font-size:12px;color:var(--t2)">في كل الحالات التطبيق بيطلب الدخول كل ما تفتحه من جديد.</div></div>

    <h3>🗓️ بداية الشهر المالي</h3>
    <div class="card"><label>يوم بداية الشهر${select(days, state.cycleDay || 1, 'set-cycle')}</label>
      <div style="font-size:12px;color:var(--t2)">إذا بتستلم راتبك يوم 20 اختر 20، وبيظهر بفلتر الفترة «الدورة الحالية» (من 20 لـ19 من الشهر الجاي).</div></div>

    <h3>🔐 بيانات الدخول</h3>
    <div class="card">
      <label>اسم المستخدم<input id="cu" value="${esc(auth.user())}" autocomplete="off" autocapitalize="off"></label>
      <label>كلمة السر الحالية<input id="cp" type="password" autocomplete="current-password"></label>
      <label>كلمة سر جديدة (اتركها فاضية إذا ما بدك تغيّرها)<input id="np" type="password" autocomplete="new-password"></label>
      <button class="btn" data-action="save-cred">حفظ التغييرات</button>
      <button class="btn alt" data-action="logout">تسجيل الخروج</button></div>

    <h3>📲 التطبيق</h3>
    ${install.standalone() ? '<div class="okbox">✅ التطبيق مثبّت على جهازك</div>' : '<button class="btn" data-action="install-go">تثبيت التطبيق على الجوال</button>'}

    <h3>المحافظ</h3>
    ${listBox(state.accounts.map(a => `<div class="stat"><span>${esc(a.name)}</span></div>`).join(''))}
    <button class="btn alt" data-action="add-account">＋ إضافة محفظة</button>

    <h3>النسخ الاحتياطي</h3>
    <div class="card" style="font-size:13px;color:var(--t2);margin-bottom:8px">بياناتك محفوظة على هذا الجهاز وهذا المتصفح فقط. لنقلها لجهاز ثاني: صدّر نسخة من هنا ثم استعدها هناك.</div>
    <button class="btn" data-action="export-data">تصدير نسخة JSON</button>
    <button class="btn alt" data-action="import-pick">استعادة نسخة</button>
    <input type="file" id="imp" accept=".json" hidden data-change="import-file">

    <h3>تفريغ البيانات</h3>
    <button class="btn alt" data-action="clear-tx">حذف العمليات فقط (${state.tx.length})</button>
    <button class="btn danger" style="margin-top:8px" data-action="reset-all">حذف كل شيء</button>`;
  },
};

onChange('set-lock', (d, el) => { auth.setLockMinutes(el.value); toast('تم حفظ إعداد القفل ✓'); });
onChange('set-cycle', (d, el) => {
  const day = +el.value;
  setCycleDay(day);
  setPeriod(day === 1 ? '' : 'c0');
  toast('تم حفظ بداية الشهر المالي ✓');
});

onClick('save-cred', async () => {
  const user = $('#cu').value.trim(), current = $('#cp').value, next = $('#np').value;
  if (!(await auth.check(auth.user(), current))) return toast('كلمة السر الحالية غير صحيحة', true);
  if (!user) return toast('اكتب اسم المستخدم', true);
  if (next && next.length < 3) return toast('كلمة السر الجديدة قصيرة (3 أحرف على الأقل)', true);
  await auth.saveCredentials(user, next || current);
  refresh(); toast('تم حفظ بيانات الدخول ✓');
});
onClick('logout', () => { auth.logout(); location.reload(); });
onClick('install-go', installGo);

onClick('add-account', () => {
  const res = addAccount(prompt('اسم المحفظة') || '');
  toast(res.error || 'تمت إضافة المحفظة ✓', !!res.error);
});

onClick('export-data', () => { const f = backupFile(store.state); download(f.name, f.content, f.mime); });
onClick('import-pick', () => $('#imp').click());
onChange('import-file', (d, el) => {
  const file = el.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { const res = importBackup(reader.result); toast(res.error || 'تمت الاستعادة ✓', !!res.error); };
  reader.readAsText(file);
});

onClick('clear-tx', () => {
  if (!confirm('سيتم حذف كل العمليات، وتبقى المحافظ والمنتجات (المخزون يصير 0). يفضّل تصدير نسخة قبلها. متأكد؟')) return;
  clearTransactions(); toast('تم حذف العمليات');
});
onClick('reset-all', () => {
  if (!confirm('سيتم حذف كل البيانات نهائياً (عمليات ومحافظ ومنتجات). متأكد؟')) return;
  resetAll(); toast('تم حذف كل البيانات');
});