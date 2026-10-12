
import { TX_TYPES } from './txTypes.js'; // تعريف أنواع العمليات وتأثير كل نوع على الأرصدة

// حساب الأرصدة الحالية للبيت والاستثمار والحسابات المالية
export function balances(state) {
  // تجهيز الأرصدة لتبدأ من صفر
  const r = {
    home: 0,     // رصيد البيت
    invest: 0,   // رصيد الاستثمار
    total: 0,    // مجموع رصيد البيت والاستثمار
    accounts: {}, // أرصدة الحسابات المالية
  };

  // إنشاء رصيد مستقل لكل حساب مسجل في التطبيق
  state.accounts.forEach(a => {
    r.accounts[a.id] = {
      total: 0,  // إجمالي رصيد الحساب
      home: 0,   // الجزء التابع للبيت
      invest: 0, // الجزء التابع للاستثمار
    };
  });

  // المرور على جميع العمليات المالية
  for (const t of state.tx) {

    // تحديد تأثير العملية على الأرصدة حسب نوعها
    // قد تنتج العملية تأثيرًا واحدًا أو أكثر، مثل التحويل بين حسابين
    for (const e of TX_TYPES[t.type].effects(t)) {

      // إضافة التأثير إلى رصيد القسم المناسب
      r[e.sector] += e.delta;

      // الوصول إلى الحساب الذي يتأثر بالعملية
      const acc = r.accounts[e.account];

      // إذا كان الحساب موجودًا، نحدّث رصيده وإجمالي رصيد القسم
      if (acc) {
        acc.total += e.delta;
        acc[e.sector] += e.delta;
      }
    }
  }

  // حساب مجموع أرصدة البيت والاستثمار
  r.total = r.home + r.invest;

  // إرجاع جميع الأرصدة المحسوبة
  return r;
}

/**
 * التحقق مما إذا كان التاريخ داخل الفترة المحددة.
 * p = ''             يعني جميع الفترات.
 * p = 'YYYY-MM'      يعني شهرًا محددًا.
 * p = 'YYYY-MM-DD'   يعني يومًا محددًا.
 * p = { from, to }   يعني فترة بين تاريخين.
 */
export const inPeriod = (date, p) =>
  !p || (
    typeof p === 'object'
      ? date >= p.from && date <= p.to // مقارنة تاريخ البداية والنهاية
      : date.startsWith(p)             // مطابقة بداية التاريخ مع الشهر أو اليوم
  );

// حساب ملخص الدخل والمصروفات والمبيعات والربح لفترة معينة
export function periodSummary(state, period) {
  // تجهيز جميع القيم لتبدأ من صفر
  const s = {
    home: {
      income: 0,  // إجمالي دخل البيت
      expense: 0, // إجمالي مصروفات البيت
    },
    invest: {
      sales: 0,     // إجمالي مبيعات الاستثمار
      cogs: 0,      // تكلفة البضاعة التي تم بيعها
      expenses: 0,  // مصروفات الاستثمار
      purchases: 0, // إجمالي المشتريات المسجلة
      profit: 0,    // صافي الربح المحسوب
    },
  };

  // المرور على العمليات المالية
  for (const t of state.tx) {

    // تجاهل العمليات التي تقع خارج الفترة المطلوبة
    if (!inPeriod(t.date, period)) continue;

    // حساب إحصائيات قسم البيت
    if (t.sector === 'home') {
      if (t.type === 'income') {
        s.home.income += t.amount; // إضافة مبلغ الدخل
      }

      if (t.type === 'expense') {
        s.home.expense += t.amount; // إضافة مبلغ المصروف
      }
    }

    // حساب إحصائيات قسم الاستثمار
    else if (t.sector === 'invest') {

      // تسجيل المبيعات وتكلفة البضاعة المباعة
      if (t.type === 'sale') {
        s.invest.sales += t.amount;
        s.invest.cogs += t.cogs || 0;
      }

      // جمع مصروفات الاستثمار
      if (t.type === 'expense') {
        s.invest.expenses += t.amount;
      }

      // جمع مبالغ المشتريات، سواء كانت نقدية أو بالدين
      if (t.type === 'purchase') {
        s.invest.purchases += t.amount;
      }
    }
  }

  // حساب صافي الربح:
  // إجمالي المبيعات - تكلفة البضاعة المباعة - المصروفات
  s.invest.profit =
    s.invest.sales - s.invest.cogs - s.invest.expenses;

  // إرجاع الملخص المالي للفترة
  return s;
}

/**
 * تفصيل حركة الأموال النقدية في قسم الاستثمار.
 * الهدف معرفة مصادر الأموال وأوجه استخدامها.
 */
export function cashFlow(state) {
  const r = {
    capital: 0,        // رأس المال الداخل أو الخارج
    sales: 0,           // الأموال الناتجة عن المبيعات
    paidPurchases: 0,   // المشتريات التي دُفعت نقدًا
    debtPayments: 0,   // المبالغ المسددة للديون
    expenses: 0,        // مصروفات الاستثمار
  };

  // المرور على جميع العمليات المالية
  for (const t of state.tx) {

    // معالجة التحويلات بين البيت والاستثمار
    if (t.type === 'transfer') {

      // التحويل إلى الاستثمار يُضاف إلى رأس المال
      if (t.toSector === 'invest') {
        r.capital += t.amount;
      }

      // التحويل من الاستثمار إلى قسم آخر يُخصم من رأس المال
      if (t.sector === 'invest') {
        r.capital -= t.amount;
      }

      // لا نكمل معالجة هذه العملية كدخل أو مصروف عادي
      continue;
    }

    // تجاهل العمليات التي لا تتبع قسم الاستثمار
    if (t.sector !== 'invest') continue;

    // تحديد كيفية تصنيف العملية المالية
    switch (t.type) {

      // دخل الاستثمار يُضاف إلى رأس المال وفق هذا النموذج
      case 'income':
        r.capital += t.amount;
        break;

      // تسجيل مبالغ المبيعات
      case 'sale':
        r.sales += t.amount;
        break;

      // احتساب المشتريات المدفوعة فقط
      // المشتريات بالدين لا تخصم نقدًا وقت تسجيلها
      case 'purchase':
        if (!t.credit) r.paidPurchases += t.amount;
        break;

      // تسجيل المبالغ المدفوعة لتسديد الديون
      case 'debtpay':
        r.debtPayments += t.amount;
        break;

      // تسجيل مصروفات الاستثمار
      case 'expense':
        r.expenses += t.amount;
        break;
    }
  }

  // إرجاع تفصيل حركة الأموال
  return r;
}
