
import { TX_TYPES } from './txTypes.js';
// أنواع العمليات المالية، مثل الدخل والمصروف والبيع والشراء

import { accountName, productName, findTx } from './lookup.js';
// دوال للبحث عن أسماء الحسابات والمنتجات والعمليات

import { sectorLabel } from '../core/constants.js';
// تحويل رمز القطاع إلى اسم مفهوم للمستخدم

import { dayLabel } from '../core/dates.js';
// تحويل التاريخ إلى وصف لليوم


// توحيد النصوص العربية والإنجليزية لتسهيل البحث
export const norm = s => String(s)
  .toLowerCase() // تحويل الأحرف الإنجليزية إلى أحرف صغيرة
  .replace(/[\u064B-\u0652]/g, '') // إزالة التشكيل العربي
  .replace(/[أإآ]/g, 'ا') // توحيد أشكال الألف
  .replace(/ة/g, 'ه') // تحويل التاء المربوطة إلى هاء
  .replace(/ى/g, 'ي'); // تحويل الألف المقصورة إلى ياء


// تجهيز نص شامل يحتوي على المعلومات التي يمكن البحث عنها في العملية
function haystack(s, t) {
  // إذا كانت العملية تسديد دين، نحاول العثور على العملية الأصلية المرتبطة بها
  const paid = t.type === 'debtpay' ? findTx(s, t.ref) : null;

  // جمع بيانات العملية في نص واحد ليسهل البحث فيها
  return norm([
    TX_TYPES[t.type].label, // اسم نوع العملية
    t.category, // تصنيف العملية

    t.productId && productName(s, t.productId), // اسم المنتج المرتبط بالعملية

    paid && productName(s, paid.productId), // اسم المنتج في العملية الأصلية للدين
    paid && paid.supplier, // اسم المورد في العملية الأصلية للدين

    t.supplier, // اسم المورد في العملية الحالية
    t.note, // الملاحظات
    t.qtyText, // وصف الكمية

    accountName(s, t.account), // اسم الحساب المستخدم
    t.toAccount && accountName(s, t.toAccount), // اسم الحساب المستهدف في التحويل

    sectorLabel(t.sector), // اسم القطاع، مثل البيت أو الاستثمار
    t.credit && 'بالدين دين', // إضافة كلمات تساعد في العثور على عمليات البيع بالدين

    String(t.amount), // قيمة المبلغ كنص حتى يمكن البحث عنه
    t.date, // التاريخ بصيغته الأصلية
    dayLabel(t.date), // وصف اليوم، مثل اليوم أو اسم اليوم حسب الدالة
  ]
    .filter(Boolean) // حذف القيم الفارغة أو غير الموجودة
    .join(' ') // دمج البيانات في نص واحد
  );
}


// البحث في قائمة العمليات المالية باستخدام نص البحث
export function searchTx(state, list, query) {
  // تقسيم عبارة البحث إلى كلمات بعد توحيد النص وإزالة المسافات الزائدة
  const words = norm(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean); // حذف الكلمات الفارغة

  // إذا لم يكتب المستخدم شيئًا، نعيد القائمة كما هي دون فلترة
  if (!words.length) return list;

  // الاحتفاظ بالعمليات التي تحتوي على جميع كلمات البحث
  return list.filter(t => {
    const h = haystack(state, t); // جمع بيانات العملية في نص قابل للبحث

    // يجب أن تكون كل كلمة من كلمات البحث موجودة في بيانات العملية
    return words.every(w => h.includes(w));
  });
}
