
import { ymd, monthName, shortDate } from '../core/dates.js';
// ymd: إنشاء تاريخ، monthName: اسم الشهر، shortDate: عرض التاريخ بشكل مختصر

import { today } from '../core/format.js'; // إرجاع تاريخ اليوم

/**
 * حساب نطاق الدورة المالية.
 * تبدأ الدورة من يوم cycleDay وتنتهي في اليوم السابق له من الشهر التالي.
 * offset = 0 للدورة الحالية، و1 للدورة السابقة.
 * now يسمح بتمرير تاريخ محدد بدل التاريخ الحالي.
 */
export function cycleRange(cycleDay, offset = 0, now = new Date()) {
  let m = now.getMonth(); // رقم الشهر الحالي، من 0 إلى 11

  // إذا لم نصل إلى يوم بداية الدورة، فنحن ما زلنا في دورة بدأت الشهر الماضي
  if (now.getDate() < cycleDay) m--;

  // الرجوع إلى الدورة السابقة حسب قيمة offset
  m -= offset;

  return {
    // تاريخ بداية الدورة
    from: ymd(now.getFullYear(), m, cycleDay),

    // تاريخ نهاية الدورة: اليوم السابق لبداية الدورة التالية
    to: ymd(now.getFullYear(), m + 1, cycleDay - 1),
  };
}

// استخراج الأشهر التي تحتوي على عمليات، مع إضافة الشهر الحالي
export function monthsOf(state) {
  // جمع الأشهر من تواريخ العمليات، بصيغة YYYY-MM
  const s = new Set(state.tx.map(t => t.date.slice(0, 7)));

  // ضمان ظهور الشهر الحالي حتى لو لم توجد فيه عمليات
  s.add(today().slice(0, 7));

  // تحويل الأشهر إلى قائمة وترتيبها من الأحدث إلى الأقدم
  return [...s].sort().reverse();
}

/**
 * تحديد الاختيار الفعلي للفترة.
 * إذا كان الاختيار غير صالح أو الدورة غير مفعّلة، نرجع '' بمعنى كل الفترات.
 */
export function effective(sel, state) {
  const v = sel.v; // الاختيار الحالي من واجهة المستخدم
  const cd = state.cycleDay || 1; // يوم بداية الدورة، والافتراضي هو الأول

  // عدم وجود اختيار يعني عرض كل الفترات
  if (!v) return '';

  // هذه اختيارات خاصة لا تحتاج إلى مطابقة قائمة الأشهر
  if (v === 'today' || v === 'range') return v;

  // الدورة الحالية أو السابقة متاحة فقط إذا كان يوم بدايتها أكبر من 1
  if (v === 'c0' || v === 'c1') return cd > 1 ? v : '';

  // إذا كان الاختيار شهرًا، نتأكد من وجوده ضمن الأشهر المتاحة
  return monthsOf(state).includes(v) ? v : '';
}

/**
 * تحويل الاختيار إلى قيمة تستخدمها دوال الحسابات:
 * ''             = كل الفترات
 * 'YYYY-MM-DD'   = يوم محدد
 * 'YYYY-MM'      = شهر محدد
 * { from, to }   = نطاق بين تاريخين
 */
export function resolve(sel, state) {
  const v = effective(sel, state);
  const cd = state.cycleDay || 1;

  // لا يوجد فلتر صالح، لذلك نعرض جميع الفترات
  if (!v) return '';

  // إرجاع تاريخ اليوم
  if (v === 'today') return today();

  // حساب نطاق الدورة الحالية أو السابقة
  if (v === 'c0') return cycleRange(cd, 0);
  if (v === 'c1') return cycleRange(cd, 1);

  // إرجاع الفترة المخصصة، مع استخدام اليوم عند غياب أحد التاريخين
  if (v === 'range') {
    return {
      from: sel.from || today(),
      to: sel.to || today(),
    };
  }

  // إذا كان الاختيار شهرًا، نعيده بصيغة YYYY-MM
  return v;
}

// تحويل الاختيار إلى عنوان مفهوم للمستخدم في الواجهة
export function label(sel, state) {
  const v = effective(sel, state);

  // عدم تحديد فترة يعني عرض جميع الفترات
  if (!v) return 'كل الفترات';

  // عنوان اختيار اليوم
  if (v === 'today') return 'اليوم';

  // عنوان الدورة الحالية أو السابقة مع تاريخ بدايتها ونهايتها
  if (v === 'c0' || v === 'c1') {
    const r = resolve(sel, state);

    return `${
      v === 'c0' ? 'الدورة الحالية' : 'الدورة السابقة'
    } (${shortDate(r.from)} – ${shortDate(r.to)})`;
  }

  // عرض الفترة المخصصة بالتاريخ المختصر
  if (v === 'range') {
    const r = resolve(sel, state);
    return `${shortDate(r.from)} – ${shortDate(r.to)}`;
  }

  // إذا كان الاختيار شهرًا، نعرض اسمه بالعربية مع السنة
  return monthName(v);
}
