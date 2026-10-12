// استيراد وحدة الإعدادات لحفظ حالة إخفاء رسالة تثبيت التطبيق
import { prefs } from '../data/prefs.js';

// حفظ معلومات المتصفح والجهاز لمعرفة نوع الجهاز الذي يستخدم التطبيق
const ua = navigator.userAgent;

// مجموعة لتخزين الدوال التي تريد معرفة أي تغيير في حالة التثبيت
const listeners = new Set();

// تنفيذ جميع الدوال المسجلة لإبلاغها بحدوث تغيير
const emit = () => listeners.forEach(fn => fn());

export const install = {
  // حدث تثبيت التطبيق، إذا كان المتصفح قد وفره مسبقاً
  event: window.__bip || null,

  // التحقق مما إذا كان الجهاز من أجهزة Apple التي تعمل بنظام iOS
  // يشمل ذلك بعض أجهزة iPad التي تظهر كأنها أجهزة Mac
  isIOS:
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),

  // التحقق بشكل تقريبي مما إذا كان المستخدم يستعمل هاتفاً أو جهازاً محمولاً
  isMobile: /android|iphone|ipad|ipod|mobile/i.test(ua),

  // التحقق مما إذا كان التطبيق مثبتاً ويعمل في نافذة مستقلة
  // أي دون واجهة المتصفح المعتادة
  standalone: () =>
    matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true,

  // التحقق مما إذا كان المستخدم قد أخفى رسالة التثبيت خلال آخر 3 أيام
  // 3 * 864e5 تعني 3 أيام بالمللي ثانية
  dismissed: () => Date.now() - (+prefs.get('mali_inst', 0)) < 3 * 864e5,

  // تحديد ما إذا كان ينبغي إظهار رسالة تثبيت التطبيق
  shouldShow() {
    return (
      !this.standalone() && // لا تعرض الرسالة إذا كان التطبيق مثبتاً ويعمل مستقلاً
      (!!this.event || this.isMobile || this.isIOS) && // الجهاز مناسب أو توجد نافذة تثبيت جاهزة
      !this.dismissed() // المستخدم لم يخفِ الرسالة خلال آخر 3 أيام
    );
  },

  // إخفاء رسالة التثبيت لمدة 3 أيام عن طريق حفظ الوقت الحالي
  dismiss() {
    prefs.set('mali_inst', Date.now());
  },

  /**
   * محاولة فتح نافذة التثبيت الأصلية في المتصفح.
   * إذا لم تكن متاحة، نرجع 'manual' لعرض خطوات التثبيت اليدوية.
   */
  async prompt() {
    // لا يوجد حدث تثبيت جاهز؛ يجب إرشاد المستخدم إلى التثبيت يدوياً
    if (!this.event) return 'manual';

    // إظهار نافذة التثبيت الأصلية التي يوفرها المتصفح
    this.event.prompt();

    // انتظار اختيار المستخدم، سواء وافق على التثبيت أم رفضه
    try {
      await this.event.userChoice;
    } catch {
      // تجاهل الخطأ إذا تعذر الحصول على نتيجة اختيار المستخدم
    }

    // إزالة الحدث لأنه لا يمكن الاعتماد عليه لإعادة عرض النافذة نفسها
    this.event = null;

    // إبلاغ الواجهات المسجلة بأن حالة التثبيت تغيرت
    emit();

    // إرجاع نتيجة تعني أننا حاولنا استخدام نافذة التثبيت الأصلية
    return 'native';
  },
};

// تسجيل دالة تريد أن يتم إبلاغها عند حدوث تغيير في حالة التثبيت
// تعيد هذه الدالة كائن Set، ويمكن استخدامه لإزالة الدالة لاحقاً
export const onInstallChange = fn => listeners.add(fn);

// الاستماع لحدث مخصص اسمه mali:bip
// عند حدوثه، نحدّث حدث التثبيت ثم نبلغ الواجهات بالتغيير
addEventListener('mali:bip', () => {
  install.event = window.__bip;
  emit();
});

// الاستماع إلى حدث نجاح تثبيت التطبيق
// بعد التثبيت، نزيل حدث التثبيت ونبلغ الواجهات بالتغيير
addEventListener('appinstalled', () => {
  install.event = null;
  emit();
});