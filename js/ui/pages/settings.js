
/**
 * الوصول إلى بيانات التطبيق الحالية.
 * تُستخدم هنا لتصدير نسخة احتياطية من البيانات.
 */
import { store } from '../../data/store.js';

/**
 * إدارة المصادقة:
 * التحقق من كلمة السر، وتعديل بيانات الدخول،
 * والتحكم في القفل وتسجيل الخروج.
 */
import { auth } from '../../services/auth.js';

/**
 * معرفة حالة تثبيت التطبيق.
 */
import { install } from '../../services/install.js';

/**
 * وظائف إدارة إعدادات التطبيق:
 * setCycleDay: تحديد يوم بداية الشهر المالي.
 * addAccount: إضافة محفظة جديدة.
 * clearTransactions: حذف العمليات فقط.
 * resetAll: حذف جميع البيانات.
 * importBackup: استعادة نسخة احتياطية.
 */
import {
  setCycleDay,
  addAccount,
  clearTransactions,
  resetAll,
  importBackup
} from '../../services/settings.js';

/**
 * تجهيز ملف النسخة الاحتياطية.
 */
import { backupFile } from '../../services/export.js';

/**
 * تغيير الفترة المالية المعروضة في التطبيق.
 */
import { setPeriod } from '../periodBar.js';

/**
 * تنفيذ خطوات تثبيت التطبيق.
 */
import { installGo } from '../install.js';

/**
 * تحديث الصفحة بعد تغيير بعض الإعدادات.
 */
import { refresh } from '../router.js';

/**
 * ربط أحداث النقر والتغيير بعناصر الواجهة.
 */
import {
  onClick,
  onChange
} from '../actions.js';

/**
 * أدوات الواجهة:
 * esc: حماية النصوص داخل HTML.
 * $: الوصول إلى عنصر باستخدام المحدد.
 * toast: عرض رسالة للمستخدم.
 * download: تنزيل ملف.
 */
import {
  esc,
  $,
  toast,
  download
} from '../dom.js';

/**
 * إنشاء صندوق لعرض قائمة المحافظ.
 */
import { listBox } from '../components.js';

/**
 * خيارات المدة التي ينتظرها التطبيق قبل طلب تسجيل الدخول
 * بعد مغادرة التطبيق.
 *
 * 0: القفل فورًا.
 * 1: القفل بعد دقيقة.
 * 5: القفل بعد خمس دقائق.
 * never: عدم القفل عند الخروج، مع بقاء طلب الدخول
 * عند فتح التطبيق مجددًا حسب النص المعروض.
 */
const LOCK_OPTIONS = [
  ['0', 'فوراً عند الخروج من التطبيق'],
  ['1', 'بعد دقيقة من الخروج'],
  ['5', 'بعد 5 دقائق من الخروج'],
  ['never', 'فقط عند فتح التطبيق من جديد']
];

/**
 * إنشاء قائمة اختيار HTML.
 *
 * options: الخيارات بالشكل [القيمة، النص].
 * selected: القيمة المحددة حاليًا.
 * change: اسم الحدث الذي سيعالجه نظام onChange.
 */
const select = (options, selected, change) =>
  `<select data-change="${change}">
    ${options.map(([v, l]) => `
      <option
        value="${v}"
        ${String(selected) === v ? 'selected' : ''}
      >${l}</option>
    `).join('')}
  </select>`;

export default {
  // عنوان صفحة الإعدادات.
  title: 'الإعدادات',

  // الصفحة عامة ولا ترتبط بقسم البيت أو الاستثمار.
  ctx: null,

  /**
   * إنشاء واجهة الإعدادات.
   *
   * state: حالة التطبيق الحالية، ومنها المحافظ والعمليات
   * ويوم بداية الشهر المالي.
   */
  render(state) {

    // تحويل قيمة القفل إلى إحدى قيم خيارات القائمة.
    // القيمة السالبة تعني اختيار never.
    const lock =
      auth.lockMinutes() < 0
        ? 'never'
        : String(auth.lockMinutes());

    // إنشاء خيارات أيام بداية الشهر من 1 إلى 28.
    // نستخدم 28 يومًا لتجنب الأيام التي لا توجد في بعض الأشهر.
    const days = Array.from(
      { length: 28 },
      (_, i) => [
        String(i + 1),
        i === 0
          ? '1 (الشهر العادي)'
          : String(i + 1)
      ]
    );

    return `

      <!-- تحذير إذا كانت بيانات الدخول ما زالت افتراضية -->
      ${
        auth.isDefault()
          ? '<div class="warnbox">⚠️ ما زلت تستخدم بيانات الدخول الافتراضية (123). يفضّل تغييرها.</div>'
          : ''
      }

      <!-- إعدادات القفل التلقائي -->
      <h3>🔒 قفل التطبيق</h3>

      <div class="card">

        <label>
          اطلب تسجيل الدخول مجدداً
          ${select(LOCK_OPTIONS, lock, 'set-lock')}
        </label>

        <div style="font-size:12px;color:var(--t2)">
          في كل الحالات التطبيق بيطلب الدخول كل ما تفتحه من جديد.
        </div>

      </div>

      <!-- إعداد يوم بداية الدورة المالية -->
      <h3>🗓️ بداية الشهر المالي</h3>

      <div class="card">

        <label>
          يوم بداية الشهر
          ${select(days, state.cycleDay || 1, 'set-cycle')}
        </label>

        <div style="font-size:12px;color:var(--t2)">
          إذا بتستلم راتبك يوم 20 اختر 20،
          وبيظهر بفلتر الفترة «الدورة الحالية»
          (من 20 لـ19 من الشهر الجاي).
        </div>

      </div>

      <!-- تعديل بيانات تسجيل الدخول -->
      <h3>🔐 بيانات الدخول</h3>

      <div class="card">

        <!-- اسم المستخدم الحالي -->
        <label>
          اسم المستخدم
          <input
            id="cu"
            value="${esc(auth.user())}"
            autocomplete="off"
            autocapitalize="off"
          >
        </label>

        <!-- يجب إدخال كلمة السر الحالية للتحقق من هوية المستخدم -->
        <label>
          كلمة السر الحالية
          <input
            id="cp"
            type="password"
            autocomplete="current-password"
          >
        </label>

        <!-- كلمة السر الجديدة اختيارية -->
        <label>
          كلمة سر جديدة (اتركها فاضية إذا ما بدك تغيّرها)
          <input
            id="np"
            type="password"
            autocomplete="new-password"
          >
        </label>

        <!-- حفظ بيانات الدخول الجديدة -->
        <button class="btn" data-action="save-cred">
          حفظ التغييرات
        </button>

        <!-- تسجيل الخروج من التطبيق -->
        <button class="btn alt" data-action="logout">
          تسجيل الخروج
        </button>

      </div>

      <!-- قسم تثبيت التطبيق -->
      <h3>📲 التطبيق</h3>

      ${
        install.standalone()
          // إذا كان التطبيق يعمل في وضع التطبيق المثبت.
          ? '<div class="okbox">✅ التطبيق مثبّت على جهازك</div>'

          // إذا لم يكن يعمل في وضع التطبيق المثبت، نظهر زر التثبيت.
          : '<button class="btn" data-action="install-go">تثبيت التطبيق على الجوال</button>'
      }

      <!-- عرض المحافظ المسجلة -->
      <h3>المحافظ</h3>

      ${listBox(
        state.accounts
          .map(a => `
            <div class="stat">
              <span>${esc(a.name)}</span>
            </div>
          `)
          .join('')
      )}

      <!-- بدء إضافة محفظة جديدة -->
      <button class="btn alt" data-action="add-account">
        ＋ إضافة محفظة
      </button>

      <!-- النسخ الاحتياطي واستعادة البيانات -->
      <h3>النسخ الاحتياطي</h3>

      <div
        class="card"
        style="font-size:13px;color:var(--t2);margin-bottom:8px"
      >
        بياناتك محفوظة على هذا الجهاز وهذا المتصفح فقط.
        لنقلها لجهاز ثاني: صدّر نسخة من هنا ثم استعدها هناك.
      </div>

      <!-- تنزيل نسخة JSON من بيانات التطبيق -->
      <button class="btn" data-action="export-data">
        تصدير نسخة JSON
      </button>

      <!-- اختيار نسخة احتياطية سابقة لاستعادتها -->
      <button class="btn alt" data-action="import-pick">
        استعادة نسخة
      </button>

      <!-- حقل ملف مخفي لاختيار ملف النسخة الاحتياطية -->
      <input
        type="file"
        id="imp"
        accept=".json"
        hidden
        data-change="import-file"
      >

      <!-- حذف العمليات أو حذف جميع البيانات -->
      <h3>تفريغ البيانات</h3>

      <!-- حذف العمليات مع الإبقاء على المحافظ والمنتجات -->
      <button class="btn alt" data-action="clear-tx">
        حذف العمليات فقط (${state.tx.length})
      </button>

      <!-- حذف كامل بيانات التطبيق -->
      <button
        class="btn danger"
        style="margin-top:8px"
        data-action="reset-all"
      >
        حذف كل شيء
      </button>
    `;
  },
};

/**
 * عند تغيير مدة القفل:
 * 1. نحفظ المدة المختارة.
 * 2. نعرض رسالة نجاح.
 */
onChange('set-lock', (d, el) => {
  auth.setLockMinutes(el.value);
  toast('تم حفظ إعداد القفل ✓');
});

/**
 * عند تغيير يوم بداية الشهر المالي:
 * 1. نحول القيمة إلى رقم.
 * 2. نحفظ اليوم الجديد.
 * 3. نختار الفترة المناسبة في شريط الفترات.
 * 4. نعرض رسالة نجاح.
 */
onChange('set-cycle', (d, el) => {
  const day = +el.value;

  // حفظ يوم بداية الدورة المالية.
  setCycleDay(day);

  // اليوم 1 يعني الشهر الميلادي العادي.
  // الأيام الأخرى تستخدم الدورة المالية الحالية c0.
  setPeriod(day === 1 ? '' : 'c0');

  toast('تم حفظ بداية الشهر المالي ✓');
});

/**
 * حفظ بيانات تسجيل الدخول.
 */
onClick('save-cred', async () => {

  // قراءة اسم المستخدم وكلمة السر الحالية والجديدة.
  const user = $('#cu').value.trim();
  const current = $('#cp').value;
  const next = $('#np').value;

  // التحقق من كلمة السر الحالية قبل السماح بالتعديل.
  if (!(await auth.check(auth.user(), current))) {
    return toast('كلمة السر الحالية غير صحيحة', true);
  }

  // رفض اسم المستخدم الفارغ.
  if (!user) {
    return toast('اكتب اسم المستخدم', true);
  }

  // إذا أدخل المستخدم كلمة سر جديدة، يجب ألا تقل عن 3 أحرف.
  if (next && next.length < 3) {
    return toast(
      'كلمة السر الجديدة قصيرة (3 أحرف على الأقل)',
      true
    );
  }

  // حفظ اسم المستخدم الجديد وكلمة السر.
  // إذا ترك المستخدم كلمة السر الجديدة فارغة،
  // نستخدم كلمة السر الحالية بدلًا منها.
  await auth.saveCredentials(user, next || current);

  // تحديث الصفحة لتظهر بيانات الدخول الجديدة.
  refresh();

  toast('تم حفظ بيانات الدخول ✓');
});

/**
 * تسجيل الخروج ثم إعادة تحميل التطبيق.
 */
onClick('logout', () => {
  auth.logout();
  location.reload();
});

/**
 * بدء عملية تثبيت التطبيق.
 */
onClick('install-go', installGo);

/**
 * إضافة محفظة جديدة.
 */
onClick('add-account', () => {

  // طلب اسم المحفظة من المستخدم.
  // إذا ألغى المستخدم النافذة، نمرر نصًا فارغًا.
  const res = addAccount(
    prompt('اسم المحفظة') || ''
  );

  // عرض رسالة نجاح أو رسالة الخطأ التي أعادتها الدالة.
  toast(
    res.error || 'تمت إضافة المحفظة ✓',
    !!res.error
  );
});

/**
 * تصدير نسخة احتياطية كاملة من بيانات التطبيق.
 */
onClick('export-data', () => {

  // إنشاء ملف النسخة الاحتياطية.
  const f = backupFile(store.state);

  // تنزيل الملف باستخدام اسمه ومحتواه ونوعه.
  download(
    f.name,
    f.content,
    f.mime
  );
});

/**
 * فتح نافذة اختيار ملف النسخة الاحتياطية.
 */
onClick('import-pick', () => {
  $('#imp').click();
});

/**
 * استعادة البيانات من ملف JSON يختاره المستخدم.
 */
onChange('import-file', (d, el) => {

  // الحصول على أول ملف اختاره المستخدم.
  const file = el.files[0];

  // إذا لم يختر المستخدم ملفًا، نتوقف.
  if (!file) return;

  // قراءة محتويات الملف كنص.
  const reader = new FileReader();

  // بعد الانتهاء من القراءة، نحاول استعادة البيانات.
  reader.onload = () => {

    // تمرير محتوى الملف إلى دالة الاستعادة.
    const res = importBackup(reader.result);

    // عرض نتيجة الاستعادة.
    toast(
      res.error || 'تمت الاستعادة ✓',
      !!res.error
    );
  };

  // بدء قراءة الملف كنص.
  reader.readAsText(file);
});

/**
 * حذف العمليات فقط مع الإبقاء على المحافظ والمنتجات.
 */
onClick('clear-tx', () => {

  // طلب تأكيد المستخدم قبل الحذف.
  if (!confirm(
    'سيتم حذف كل العمليات، وتبقى المحافظ والمنتجات (المخزون يصير 0). يفضّل تصدير نسخة قبلها. متأكد؟'
  )) {
    return;
  }

  // حذف جميع العمليات.
  clearTransactions();

  toast('تم حذف العمليات');
});

/**
 * حذف جميع بيانات التطبيق.
 */
onClick('reset-all', () => {

  // طلب تأكيد صريح لأن العملية تحذف جميع البيانات.
  if (!confirm(
    'سيتم حذف كل البيانات نهائياً (عمليات ومحافظ ومنتجات). متأكد؟'
  )) {
    return;
  }

  // تنفيذ إعادة ضبط البيانات.
  resetAll();

  toast('تم حذف كل البيانات');
});
