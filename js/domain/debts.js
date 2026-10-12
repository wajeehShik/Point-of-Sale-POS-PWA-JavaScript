
import { EPS } from '../core/constants.js'; // هامش صغير لتجنب الفروقات العشرية البسيطة

// ترتيب العمليات حسب التاريخ، وإذا تساوى التاريخ نرتب حسب المعرّف
const byDate = (a, b) =>
  a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

// حساب مجموع المبالغ التي سُددت لدين معين
export const paidOn = (s, id) =>
  s.tx
    .filter(t => t.type === 'debtpay' && t.ref === id) // اختيار سدادات هذا الدين
    .reduce((a, t) => a + t.amount, 0); // جمع مبالغ السداد

/**
 * توزيع الكميات المباعة على مشتريات الدين من الأقدم إلى الأحدث.
 * FIFO يعني أن البضاعة الأقدم تُعتبر مباعة أولًا.
 */
function soldByDebt(s) {
  const out = {}, byProduct = {};

  // اختيار المشتريات التي تمت بالدين وتجميعها حسب المنتج
  s.tx
    .filter(t => t.type === 'purchase' && t.credit)
    .forEach(t => {
      (byProduct[t.productId] ||= []).push(t);

      // نبدأ باعتبار أن الكمية المباعة من هذا الدين تساوي صفرًا
      out[t.id] = 0;
    });

  // معالجة كل منتج له مشتريات بالدين
  for (const pid in byProduct) {
    // العثور على بيانات المنتج
    const p = s.products.find(x => x.id === pid);

    // جمع كل الكميات المباعة من هذا المنتج
    let sold = s.tx
      .filter(t => t.type === 'sale' && t.productId === pid)
      .reduce((a, t) => a + t.qty, 0);

    // خصم المخزون الافتتاحي؛ لأنه بضاعة قديمة مدفوعة
    sold = Math.max(
      0,
      sold - Math.max(0, +(p && p.qty0) || 0)
    );

    // توزيع الكميات المباعة على الديون من الأقدم إلى الأحدث
    byProduct[pid].sort(byDate).forEach(t => {
      // لا ننسب للدين كمية أكبر من كميته أو من الكمية المتبقية للبيع
      const x = Math.min(t.qty, sold);

      // تسجيل الكمية المباعة من هذه المشتراة بالدين
      out[t.id] = x;

      // طرح الكمية التي وزعناها من إجمالي الكمية المباعة
      sold -= x;
    });
  }

  // إرجاع كميات البيع المنسوبة إلى كل دين حسب معرّفه
  return out;
}

/**
 * حساب تفاصيل كل دين:
 * paid     = المبلغ المسدد
 * left     = المبلغ المتبقي من الدين
 * soldQty  = كمية البضاعة المباعة من هذا الدين
 * soldCost = تكلفة البضاعة المباعة
 * due      = المبلغ المستحق حاليًا وفق قاعدة التطبيق
 */
export function debts(s) {
  // معرفة كمية البيع المنسوبة لكل عملية شراء بالدين
  const sold = soldByDebt(s);

  return s.tx
    .filter(t => t.type === 'purchase' && t.credit) // المشتريات الآجلة فقط
    .map(t => {
      // مجموع ما تم سداده لهذا الدين
      const paid = paidOn(s, t.id);

      // الكمية المباعة من هذا الدين
      const soldQty = sold[t.id] || 0;

      // حساب تكلفة الوحدة الواحدة
      const unit = t.qty > 0 ? t.amount / t.qty : 0;

      // تكلفة البضاعة التي بيعت من هذه المشتراة
      const soldCost = soldQty * unit;

      // المتبقي من الدين بعد السدادات
      const left = t.amount - paid;

      return {
        t,          // بيانات عملية الشراء الأصلية
        paid,       // مجموع المبالغ المسددة
        left,       // المتبقي من الدين
        soldQty,    // الكمية المباعة
        soldCost,   // تكلفة الكمية المباعة
        unit,       // تكلفة الوحدة
        // المستحق لا يتجاوز المتبقي من الدين أو تكلفة البضاعة المباعة
        // ونمنع ظهور قيمة سالبة
        due: Math.max(0, Math.min(left, soldCost - paid)),
      };
    })
    // ترتيب الديون حسب التاريخ من الأقدم إلى الأحدث
    .sort((a, b) => byDate(a.t, b.t));
}

// إرجاع اسم المورد للدين، أو نص فارغ إذا لم يكن محددًا
export const supplierOf = d => d.t.supplier || '';

// إرجاع الديون التابعة لمورد معين
export const supplierDebts = (s, key) =>
  debts(s).filter(d => supplierOf(d) === key);

// حساب إجمالي المبالغ المتبقية من جميع الديون
export const debtTotal = s =>
  debts(s).reduce((a, d) => a + Math.max(0, d.left), 0);

/**
 * تجميع الديون حسب المورد.
 * لكل مورد نحسب:
 * count = عدد الديون المتبقية
 * left  = إجمالي المتبقي
 * due   = إجمالي المستحق حاليًا
 * first = تاريخ أقدم دين
 */
export function supplierGroups(s) {
  const m = {};

  // تجاهل الديون التي لا يتجاوز متبقيها هامش EPS
  debts(s)
    .filter(d => d.left > EPS)
    .forEach(d => {
      // استخدام اسم المورد كمفتاح للتجميع
      const k = supplierOf(d);

      // إنشاء مجموعة للمورد عند ظهوره لأول مرة
      const g = (m[k] ||= {
        key: k,          // اسم المورد
        count: 0,        // عدد الديون
        left: 0,         // إجمالي المتبقي
        due: 0,          // إجمالي المستحق حاليًا
        first: d.t.date, // أقدم تاريخ دين حتى الآن
      });

      // تحديث إجماليات المورد
      g.count++;
      g.left += d.left;
      g.due += d.due;

      // الاحتفاظ بأقدم تاريخ دين
      if (d.t.date < g.first) g.first = d.t.date;
    });

  // إرجاع الموردين مع عرض الأعلى استحقاقًا أولًا
  // وعند التساوي، نعرض صاحب الدين المتبقي الأكبر أولًا
  return Object.values(m)
    .sort((a, b) => b.due - a.due || b.left - a.left);
}
