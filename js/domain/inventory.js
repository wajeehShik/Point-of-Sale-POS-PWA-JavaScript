
/**
 * حساب كمية المخزون الحالية لكل المنتجات.
 * يبدأ من الكمية الافتتاحية، ثم يضيف المشتريات ويخصم المبيعات.
 */
export function stockMap(state) {
  const m = {};

  // تسجيل الكمية الافتتاحية لكل منتج
  state.products.forEach(p => {
    m[p.id] = +p.qty0 || 0;
  });

  // المرور على جميع العمليات المالية
  for (const t of state.tx) {
    // تجاهل العمليات التي لا تخص منتجًا موجودًا في القائمة
    if (!(t.productId in m)) continue;

    // عند شراء بضاعة، نضيف الكمية إلى المخزون
    if (t.type === 'purchase') {
      m[t.productId] += t.qty;
    }

    // عند بيع بضاعة، نخصم الكمية من المخزون
    else if (t.type === 'sale') {
      m[t.productId] -= t.qty;
    }
  }

  // إرجاع كائن يحتوي على رصيد كل منتج
  // مثال: { product1: 10, product2: 5 }
  return m;
}

// إرجاع كمية المخزون لمنتج معين
// إذا لم يوجد المنتج في النتيجة، نرجع صفرًا
export const stock = (s, pid) =>
  stockMap(s)[pid] ?? 0;

// التحقق مما إذا كان أي منتج لديه مخزون سالب
export const hasNegativeStock = s =>
  Object.values(stockMap(s)).some(q => q < -1e-9);

// حساب القيمة الإجمالية للمخزون
export function inventoryValue(s) {
  // حساب الكمية الحالية لكل منتج
  const m = stockMap(s);

  // قيمة المخزون = الكمية المتبقية × تكلفة الوحدة
  // لا نحسب الكميات السالبة ضمن قيمة المخزون
  return s.products.reduce(
    (sum, p) => sum + Math.max(0, m[p.id]) * p.cost,
    0
  );
}

/**
 * حساب إحصائيات منتج معين:
 * sold   = إجمالي الكمية المباعة
 * profit = إجمالي الربح من مبيعات المنتج
 */
export function productStats(s, pid) {
  let sold = 0;
  let profit = 0;

  // المرور على جميع العمليات
  for (const t of s.tx) {
    // احتساب عمليات البيع الخاصة بالمنتج المطلوب فقط
    if (t.type === 'sale' && t.productId === pid) {
      sold += t.qty; // إضافة الكمية المباعة

      // الربح = مبلغ البيع - تكلفة البضاعة المباعة
      // إذا لم تكن التكلفة موجودة، نعتبرها صفرًا
      profit += t.amount - (t.cogs || 0);
    }
  }

  // إرجاع إجمالي الكمية المباعة والربح
  return { sold, profit };
}
