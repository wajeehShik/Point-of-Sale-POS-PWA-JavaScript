
/**
 * استيراد خدمة التثبيت:
 * install: تعرف حالة التثبيت وتنفذ طلب التثبيت.
 * onInstallChange: تستدعي دالة عند تغيّر حالة التثبيت.
 */
import {
  install,
  onInstallChange
} from '../services/install.js';

// ربط أزرار HTML بالدوال المسؤولة عن تنفيذها.
import { onClick } from './actions.js';

// البحث عن عناصر HTML باستخدام محدد CSS.
import { $ } from './dom.js';


/**
 * عرض أو إخفاء بطاقة اقتراح تثبيت التطبيق.
 */
export function renderInstall() {
  // إذا كانت الخدمة ترى أن البطاقة يجب أن تظهر،
  // ننشئ HTML للبطاقة، وإلا نترك المحتوى فارغاً.
  const html = install.shouldShow()
    ? `<div class="inst">
        <span class="ii">📲</span>

        <div class="it">
          <b>ثبّت التطبيق على جوالك</b>
          <span>بيفتح مثل أي تطبيق وبشتغل بدون إنترنت</span>
        </div>

        <!--
          إذا كان حدث التثبيت متاحاً، يظهر زر "تثبيت".
          وإلا يظهر زر "كيف؟" لشرح التثبيت اليدوي.
        -->
        <button class="ib" data-action="install-go">
          ${install.event ? 'تثبيت' : 'كيف؟'}
        </button>

        <!-- زر إخفاء بطاقة اقتراح التثبيت -->
        <button
          class="ix"
          data-action="install-dismiss"
          aria-label="إغلاق"
        >✕</button>
      </div>`
    : '';

  // تحديث جميع الأماكن المخصصة لعرض بطاقة التثبيت.
  // استخدام querySelectorAll يسمح بوجود أكثر من مكان للبطاقة.
  document.querySelectorAll('.instbox').forEach(el => {
    el.innerHTML = html;
  });
}


/**
 * عرض نافذة تشرح للمستخدم طريقة تثبيت التطبيق يدوياً.
 */
function showHelp() {
  // البحث عن نافذة شرح التثبيت.
  let m = $('#ihelp');

  // إذا لم تكن موجودة، ننشئها ونضيفها إلى الصفحة.
  if (!m) {
    m = document.createElement('div');
    m.id = 'ihelp';
    document.body.appendChild(m);
  }

  // تحديد خطوات التثبيت حسب نوع الجهاز.
  // iOS يستخدم عادةً Safari لإضافة التطبيق للشاشة الرئيسية.
  const steps = install.isIOS
    ? [
        'افتح الموقع من متصفح <b>Safari</b>',
        'اضغط زر <b>المشاركة</b> ⬆️ أسفل الشاشة',
        'اختر <b>«إضافة إلى الشاشة الرئيسية»</b>',
        'اضغط <b>«إضافة»</b> وبيطلع التطبيق عندك'
      ]
    : [
        'اضغط على <b>⋮</b> أعلى المتصفح',
        'اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>',
        'اضغط <b>«تثبيت»</b> وبيطلع التطبيق عندك'
      ];

  // بناء نافذة الشرح:
  // - خلفية يمكن الضغط عليها للإغلاق.
  // - عنوان النافذة.
  // - قائمة خطوات التثبيت.
  // - زر إغلاق بعنوان "تمام".
  m.innerHTML = `
    <div class="back" data-action="install-help-close"></div>

    <div class="ipanel">
      <h3>📲 كيف أثبّت التطبيق؟</h3>

      <ol>
        ${steps.map(s => `<li>${s}</li>`).join('')}
      </ol>

      <button class="btn" data-action="install-help-close">
        تمام
      </button>
    </div>
  `;

  // إضافة كلاس open لإظهار النافذة حسب تنسيقات CSS.
  m.className = 'open';
}


/**
 * تنفيذ محاولة تثبيت التطبيق.
 */
export async function installGo() {
  // طلب التثبيت من خدمة install.
  // قد تكون النتيجة "manual" إذا تعذر عرض نافذة التثبيت
  // وكان المطلوب توجيه المستخدم للتثبيت اليدوي.
  if ((await install.prompt()) === 'manual') {
    showHelp();
  }

  // تحديث بطاقة التثبيت بعد انتهاء المحاولة.
  renderInstall();
}


// عند الضغط على زر التثبيت أو المساعدة:
// ننفذ دالة installGo.
onClick('install-go', installGo);


// عند الضغط على زر إخفاء البطاقة:
// نحفظ قرار الإخفاء عبر خدمة التثبيت ثم نحدّث الواجهة.
onClick('install-dismiss', () => {
  install.dismiss();
  renderInstall();
});


// عند الضغط على الخلفية أو زر "تمام":
// نزيل كلاس open لإخفاء نافذة الشرح.
onClick('install-help-close', () => {
  const m = $('#ihelp');

  if (m) {
    m.className = '';
  }
});


// إعادة رسم بطاقة التثبيت عند تغيّر حالة التثبيت.
onInstallChange(renderInstall);


// توفير دالة تهيئة يمكن استدعاؤها عند بدء التطبيق.
// حالياً هي اسم بديل للدالة renderInstall نفسها.
export const initInstall = renderInstall;
