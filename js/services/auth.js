
import { prefs } from '../data/prefs.js';
// استيراد دوال حفظ وقراءة الإعدادات، مثل مدة القفل التلقائي

// المفتاح الذي تُحفظ تحته بيانات تسجيل الدخول في localStorage
const KEY = 'mali_auth_v1';

// قراءة بيانات المستخدم المحفوظة، وتحويلها من JSON إلى كائن JavaScript
// إذا لم توجد بيانات أو حدث خطأ أثناء القراءة، نرجع null
const readCred = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};


// تحويل كلمة المرور إلى بصمة رقمية (Hash) بدل حفظها كنص عادي
async function hash(s) {
  // إضافة بادئة ثابتة قبل إنشاء البصمة
  const str = 'mali|' + s;

  // إذا كان المتصفح يدعم Web Crypto، نستخدم خوارزمية SHA-256
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(str)
    );

    // تحويل البصمة إلى سلسلة نصية مكوّنة من أرقام وحروف
    return [...new Uint8Array(b)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }

  // بديل عند عدم توفر Web Crypto
  // ملاحظة: هذا ترميز وليس تشفيرًا آمنًا لكلمات المرور
  return 'x' + btoa(unescape(encodeURIComponent(str)));
}


// كائن مسؤول عن تسجيل الدخول والخروج وإعدادات القفل
export const auth = {
  // التحقق مما إذا كانت بيانات الدخول الافتراضية ما زالت مستخدمة
  // إذا لم توجد بيانات محفوظة، فهذا يعني أن بيانات الدخول لم تُغيّر
  isDefault: () => !readCred(),

  // إرجاع اسم المستخدم المحفوظ، أو 123 عند عدم وجود حساب مخصص
  user: () => (readCred() ? readCred().user : '123'),


  // التحقق من اسم المستخدم وكلمة المرور
  async check(user, password) {
    const c = readCred(); // قراءة بيانات تسجيل الدخول المحفوظة

    user = (user || '').trim(); // إزالة المسافات من بداية اسم المستخدم ونهايته

    // إذا لم يتم إعداد بيانات مخصصة، نستخدم بيانات الدخول الافتراضية
    if (!c) return user === '123' && password === '123';

    // مقارنة اسم المستخدم وبصمة كلمة المرور بالبصمة المحفوظة
    return user === c.user && (await hash(password)) === c.ph;
  },


  // حفظ بيانات الدخول الجديدة
  async saveCredentials(user, password) {
    localStorage.setItem(KEY, JSON.stringify({
      user: user.trim(), // حفظ اسم المستخدم بعد إزالة المسافات
      ph: await hash(password), // حفظ بصمة كلمة المرور بدل النص الأصلي
    }));
  },


  // إدارة جلسة تسجيل الدخول
  // الجلسة تبقى مرتبطة بعمر علامة التبويب أو نافذة التطبيق
  /* الجلسة تعيش فقط ما دام التطبيق مفتوحاً */

  isLoggedIn() {
    // حذف أي جلسة قديمة محفوظة في localStorage
    localStorage.removeItem('mali_sess');

    // التحقق من وجود جلسة تسجيل دخول في sessionStorage
    return sessionStorage.getItem('mali_sess') === '1';
  },

  // تسجيل الدخول عن طريق إنشاء علامة تدل على أن المستخدم مسجّل
  login() {
    sessionStorage.setItem('mali_sess', '1');
  },

  // تسجيل الخروج عن طريق حذف علامة الجلسة
  logout() {
    sessionStorage.removeItem('mali_sess');
  },


  // قراءة مدة القفل التلقائي بالدقائق
  /*
   * 0       = القفل عند العودة مباشرة بعد مغادرة التطبيق
   * 1 أو 5   = القفل إذا استمر الغياب دقيقة أو خمس دقائق
   * -1      = عدم القفل التلقائي بسبب الغياب
   *
   * إذا لم يكن هناك إعداد محفوظ، تكون القيمة الافتراضية 0
   */
  lockMinutes() {
    const v = prefs.get('mali_lock');

    return v === ''
      ? 0 // لا يوجد إعداد محفوظ، لذا القفل فوري عند العودة
      : v === 'never'
        ? -1 // عدم القفل التلقائي
        : +v; // تحويل القيمة النصية إلى رقم
  },

  // حفظ مدة القفل التلقائي التي يختارها المستخدم
  setLockMinutes(v) {
    prefs.set('mali_lock', v);
  },


  // مراقبة مغادرة التطبيق والعودة إليه لتطبيق القفل التلقائي
  watchAway(onLock) {
    let hiddenAt = 0; // وقت إخفاء التطبيق أو الانتقال إلى تبويب آخر

    // الاستماع إلى تغيّر حالة ظهور الصفحة
    document.addEventListener('visibilitychange', () => {

      // عندما تصبح الصفحة مخفية، نسجل وقت المغادرة
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }

      // إذا لم نسجل وقت مغادرة أو لم يعد المستخدم مسجّل الدخول، نتوقف
      if (!hiddenAt || !this.isLoggedIn()) return;

      // حساب مدة الغياب بالمللي ثانية
      const away = Date.now() - hiddenAt;

      // قراءة مدة القفل المحددة في الإعدادات
      const min = this.lockMinutes();

      // إعادة ضبط وقت المغادرة حتى لا يُستخدم مرة أخرى
      hiddenAt = 0;

      // إذا كان القفل التلقائي مفعّلًا وانتهت المدة المحددة:
      // نسجّل الخروج ثم نستدعي الدالة التي تعرض شاشة القفل
      if (min >= 0 && away >= min * 60000) {
        this.logout();
        onLock();
      }
    });
  },
};
