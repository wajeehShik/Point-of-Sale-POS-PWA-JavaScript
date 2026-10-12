
import { periodSummary } from './ledger.js'; // حساب ملخص الدخل والمصروف والربح
import { monthsOf } from './period.js';        // استخراج الأشهر الموجودة في البيانات
import { today } from '../core/format.js';     // الحصول على تاريخ اليوم

/**
 * إرجاع آخر سعر للوحدة تم دفعه لصنف معين.
 * state: بيانات التطبيق.
 * item: اسم الصنف أو فئة المصروف.
 * unit: وحدة القياس، مثل كيلو أو لتر.
 * excludeId: معرّف عملية نستثنيها من البحث، إن وُجد.
 */
export function lastUnitPrice(state, item, unit, excludeId) {
  return state.tx
    // اختيار عمليات المصروفات التي لها سعر وحدة
    .filter(t =>
      t.type === 'expense' &&
      t.category === item &&
      t.unitPrice &&
      t.id !== excludeId &&
      (!unit || t.eunit === unit)
    )
    // ترتيب العمليات من الأحدث إلى الأقدم
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.id.localeCompare(a.id)
    )[0] || null; // إرجاع أحدث عملية، أو null إذا لم توجد
}

/**
 * حساب متوسط السعر وآخر سعر ونسبة تغيّره لكل صنف.
 */
export function itemPrices(txs) {
  const groups = {};

  // تجميع المصروفات حسب الصنف ووحدة القياس
  txs.filter(t => t.type === 'expense' && t.unitPrice)
    .forEach(t => {
      const key = t.category + '|' + (t.eunit || '');

      // إنشاء مجموعة للصنف إذا لم تكن موجودة
      (groups[key] ||= []).push(t);
    });

  // معالجة كل مجموعة وإرجاع إحصائياتها
  return Object.entries(groups).map(([k, a]) => {
    // ترتيب العمليات من الأقدم إلى الأحدث
    a.sort((x, y) =>
      x.date.localeCompare(y.date) ||
      x.id.localeCompare(y.id)
    );

    // فصل اسم الصنف عن وحدة القياس
    const [name, unit] = k.split('|');

    // آخر سعر للوحدة، والسعر السابق له إن وُجد
    const last = a.at(-1).unitPrice;
    const prev = a.length > 1 ? a.at(-2).unitPrice : null;

    // جمع الكميات المشتراة
    const qty = a.reduce((s, t) => s + t.eqty, 0);

    // حساب متوسط تكلفة الوحدة:
    // مجموع مبالغ المصروفات ÷ مجموع الكميات
    const avg = a.reduce((s, t) => s + t.amount, 0) / qty;

    // حساب نسبة التغيّر بين آخر سعر والسعر السابق
    const change = prev > 0
      ? ((last - prev) / prev) * 100
      : 0;

    return {
      name, // اسم الصنف
      unit, // وحدة القياس
      count: a.length, // عدد العمليات
      avg,   // متوسط سعر الوحدة
      last,  // آخر سعر للوحدة
      // تجاهل التغيّر الأقل من 1% لتقليل الفروقات البسيطة
      change: Math.abs(change) >= 1 ? change : 0,
    };
  });
}

/**
 * حساب مجموع المصروفات لكل فئة.
 * sector: القسم المطلوب، مثل البيت أو الاستثمار.
 */
export function expenseByCategory(txs, sector) {
  const m = {};

  txs
    // اختيار المصروفات التابعة للقسم المحدد
    .filter(t => t.type === 'expense' && t.sector === sector)
    .forEach(t => {
      // جمع مبالغ المصروفات داخل كل فئة
      m[t.category] = (m[t.category] || 0) + t.amount;
    });

  // تحويل النتائج إلى قائمة وترتيبها من الأعلى إنفاقًا للأقل
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

/**
 * تحليل أداء المنتجات اعتمادًا على عمليات البيع.
 */
export function productPerformance(txs) {
  const m = {};

  txs
    // اختيار عمليات البيع فقط
    .filter(t => t.type === 'sale')
    .forEach(t => {
      // إنشاء سجل إحصائي للمنتج عند ظهوره لأول مرة
      const o = (m[t.productId] ||= {
        id: t.productId,
        qty: 0,     // إجمالي الكمية المباعة
        revenue: 0, // إجمالي إيرادات البيع
        cost: 0,    // إجمالي تكلفة البضاعة المباعة
      });

      // تجميع بيانات مبيعات المنتج
      o.qty += t.qty;
      o.revenue += t.amount;
      o.cost += t.cogs || 0;
    });

  return Object.values(m)
    .map(o => ({
      ...o,

      // الربح = إيرادات البيع - تكلفة البضاعة المباعة
      profit: o.revenue - o.cost,

      // هامش الربح = الربح ÷ الإيرادات × 100
      margin: o.revenue > 0
        ? Math.round(((o.revenue - o.cost) / o.revenue) * 100)
        : 0,
    }))
    // عرض المنتجات الأعلى ربحًا أولًا
    .sort((a, b) => b.profit - a.profit);
}

/**
 * تجهيز بيانات شهرية للرسم البياني.
 * n: عدد الأشهر المطلوب عرضها، والافتراضي 6.
 */
export function monthlySeries(state, n = 6) {
  return monthsOf(state)
    .slice(0, n) // أخذ أحدث n أشهر
    .reverse()   // عكس الترتيب لعرض الأشهر من الأقدم للأحدث
    .map(month => {
      // حساب ملخص مالي للشهر المحدد
      const x = periodSummary(state, month);

      return {
        month,                    // الشهر
        income: x.home.income,    // دخل البيت
        expense: x.home.expense,  // مصروف البيت
        // ربح الاستثمار، مع منع ظهور قيمة سالبة في هذا الرسم
        profit: Math.max(0, x.invest.profit),
      };
    });
}

/**
 * حساب عدد الأيام التي يغطيها الفلتر المحدد.
 * يستخدم هذا العدد لحساب المتوسطات اليومية ونحوها.
 */
export function daysIn(state, period) {
  const t = today(); // تاريخ اليوم بصيغة YYYY-MM-DD

  // إذا كانت الفترة تحتوي على تاريخ بداية ونهاية
  if (period && typeof period === 'object') {
    // لا نحسب أيامًا مستقبلية بعد اليوم
    const to = period.to > t ? t : period.to;

    // حساب الفرق بين التاريخين وإضافة يوم البداية
    // الحد الأدنى يوم واحد
    return Math.max(
      1,
      Math.round((new Date(to) - new Date(period.from)) / 864e5) + 1
    );
  }

  // إذا كانت الفترة يومًا واحدًا بصيغة YYYY-MM-DD
  if (period && period.length === 10) return 1;

  // إذا كانت الفترة شهرًا بصيغة YYYY-MM
  if (period && period.length === 7) {
    const [y, m] = period.split('-').map(Number);

    // إذا كان الشهر الحالي، نستخدم رقم يوم اليوم
    // وإلا نحسب عدد أيام الشهر المحدد
    return period === t.slice(0, 7)
      ? new Date().getDate()
      : new Date(y, m, 0).getDate();
  }

  // إذا لم تُحدد فترة، نبحث عن أقدم عملية مسجلة
  const dates = state.tx.map(x => x.date).sort();

  // حساب عدد الأيام من أقدم عملية حتى اليوم
  // وإذا لم توجد عمليات، نرجع يومًا واحدًا
  return dates.length
    ? Math.max(
        1,
        Math.round((new Date(t) - new Date(dates[0])) / 864e5) + 1
      )
    : 1;
}
