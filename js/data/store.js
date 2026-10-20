
import { STORAGE_KEY } from '../core/constants.js';

// إنشاء بيانات افتراضية جديدة للتطبيق
const defaults = () => ({
  // الحسابات المالية الافتراضية
  accounts: [
    { id: 'a1', name: 'جوال Pay' },
    { id: 'a2', name: 'PalPay' },
    { id: 'a3', name: 'بنك فلسطين' },
    { id: 'a4', name: 'كاش' },
    { id: 'a5', name: 'دين' },
  ],

  products: [], // قائمة المنتجات
  tx: [],       // سجل العمليات المالية
  cycleDay: 1,  // يوم بداية الدورة المالية
});

// تحميل البيانات المحفوظة من المتصفح
function load() {
  try {
    // قراءة البيانات من localStorage وتحويلها إلى كائن
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));

    // التأكد من وجود البيانات وأن العمليات والحسابات عبارة عن قوائم
    // إذا كانت البيانات مقبولة، ندمجها مع البيانات الافتراضية
    // البيانات المحفوظة لها الأولوية عند تكرار الخصائص
    return s && Array.isArray(s.tx) && Array.isArray(s.accounts)
      ? { ...defaults(), ...s }
      : defaults();

  } catch {
    // إذا لم توجد بيانات أو حدث خطأ في قراءتها، نبدأ بالافتراضيات
    return defaults();
  }
}

// تحميل البيانات مرة واحدة عند تشغيل هذا الملف
let state = load();

// مجموعة لتخزين الدوال التي تريد معرفة وقت تغيّر البيانات
const listeners = new Set();

// حفظ الحالة الحالية في localStorage بصيغة JSON
const persist = () =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

// إبلاغ جميع المشتركين بأن البيانات تغيّرت
const notify = () =>
  listeners.forEach(fn => fn(state));

// إنشاء معرّف جديد باستخدام الوقت الحالي وجزء عشوائي
export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const store = {
  // إرجاع البيانات الحالية للتطبيق
  get state() {
    return state;
  },

  // تسجيل دالة تستجيب عند تغيّر البيانات
  // نعيد دالة أخرى لإلغاء الاشتراك عند الحاجة
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /**
   * تعديل البيانات بطريقة منظمة:
   * 1. إنشاء نسخة من البيانات الحالية.
   * 2. تنفيذ التعديل على النسخة.
   * 3. إذا ظهر خطأ، نرفض التعديل.
   * 4. إذا نجح، نعتمد النسخة ونحفظها ونُبلغ المشتركين.
   */
  transact(mutator) {
    // إنشاء نسخة مستقلة حتى لا نعدّل البيانات الأصلية مباشرة
    const draft = structuredClone(state);

    // تمرير النسخة إلى دالة التعديل
    // إذا لم تُرجع الدالة نتيجة، نستخدم كائنًا فارغًا
    const result = mutator(draft) || {};

    // إذا أعادت دالة التعديل خطأ، نرفض اعتماد النسخة
    if (result.error) return result;

    // اعتماد البيانات المعدّلة
    state = draft;

    // حفظ البيانات الجديدة في المتصفح
    persist();

    // إبلاغ الأجزاء المشتركة بأن البيانات تغيّرت
    notify();

    // إرجاع نتيجة تدل على نجاح العملية مع أي تفاصيل إضافية
    return { ok: true, ...result };
  },

  // استبدال بيانات التطبيق ببيانات جديدة، مثل نسخة احتياطية
  replace(next) {
    // التحقق الأساسي من وجود قائمة العمليات والحسابات
    if (!next || !Array.isArray(next.tx) || !Array.isArray(next.accounts)) {
      return { error: 'الملف غير صالح' };
    }

    // دمج البيانات الجديدة مع الافتراضيات
    state = { ...defaults(), ...next };

    // حفظ البيانات الجديدة وإبلاغ المشتركين
    persist();
    notify();

    return { ok: true };
  },

  // إعادة التطبيق إلى البيانات الافتراضية
  reset() {
    // حذف البيانات المالية المحفوظة تحت هذا المفتاح
    localStorage.removeItem(STORAGE_KEY);

    // إنشاء حالة جديدة فارغة بالبيانات الافتراضية
    state = defaults();

    // إبلاغ المشتركين بإعادة ضبط البيانات
    notify();
  },
};
