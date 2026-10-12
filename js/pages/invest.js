
/* عدد المنتجات المعروضة افتراضيًا، وعدد الموردين المعروضين افتراضيًا */
const PLIM = 6, DLIM = 3;


// إنشاء HTML لقائمة المنتجات في صفحة الاستثمار
function prodHTML() {
  // قراءة نص البحث عن المنتجات وتحويله إلى أحرف صغيرة
  const q = (UI.pq || '').trim().toLowerCase();

  // التحقق مما إذا كانت كمية المنتج منخفضة أو وصلت إلى الحد الأدنى
  const low = x => x.q <= (x.p.min || 0);

  // تجهيز قائمة المنتجات مع حساب الكمية المتوفرة في المخزون لكل منتج
  let ps = DB.s.products.map(p => ({
    p, // بيانات المنتج نفسه
    q: E.stock(p.id), // الكمية الحالية المتوفرة في المخزون
  }));

  // ترتيب المنتجات بحيث تظهر المنتجات منخفضة المخزون أولًا،
  // ثم ترتيب المنتجات حسب الاسم باللغة العربية
  ps.sort((a, b) =>
    low(a) === low(b)
      ? a.p.name.localeCompare(b.p.name, 'ar')
      : low(a) ? -1 : 1
  );

  // إذا كتب المستخدم اسمًا للبحث، نعرض المنتجات التي يحتوي اسمها عليه
  if (q) ps = ps.filter(x => x.p.name.toLowerCase().includes(q));

  // إذا لم توجد نتائج، نعرض رسالة مناسبة للمستخدم
  if (!ps.length) {
    return `<div class="list">
      <div class="empty">
        ${DB.s.products.length
          ? 'ما في منتج بهذا الاسم'
          : 'أضف منتجاً من خلال ＋ ثم شراء.'}
      </div>
    </div>`;
  }

  // عند البحث أو اختيار عرض الكل، نعرض كل النتائج،
  // وإلا نكتفي بعدد المنتجات المحدد في PLIM
  const lim = (UI.pAll || q) ? ps.length : PLIM;

  // إنشاء صف HTML لكل منتج ضمن العدد المطلوب عرضه
  const rows = ps.slice(0, lim).map(x => {
    // حساب الربح المتوقع من بيع وحدة واحدة قبل أي مصاريف أخرى
    const u = x.p.price - x.p.cost;

    return `<div class="row-i" data-prod="${x.p.id}">
      <span class="ic">🏷️</span>

      <div class="mid">
        ${esc(x.p.name)}

        <!-- إظهار شارة نفاد المخزون إذا كانت الكمية صفرًا أو أقل -->
        ${x.q <= 0 ? '<em class="bdg">نفد</em>' : ''}

        <span>
          تكلفة ${fmt(x.p.cost)} ·
          بيع ${fmt(x.p.price)} ·
          ربح ${fmt(u)}
        </span>
      </div>

      <!-- تمييز الكمية إذا كانت منخفضة -->
      <b class="${low(x) ? 'warn' : ''}">${x.q}</b>

      <span class="chev">‹</span>
    </div>`;
  }).join(''); // دمج جميع صفوف المنتجات في نص HTML واحد

  // تجهيز زر عرض الكل أو عرض عدد أقل من المنتجات
  let btn = '';

  if (ps.length > lim) {
    // يظهر إذا كانت هناك منتجات إضافية غير معروضة
    btn = `<button class="btn alt" data-pall>
      عرض كل المنتجات (${ps.length})
    </button>`;
  } else if (UI.pAll && !q && ps.length > PLIM) {
    // يظهر عند عرض كل المنتجات، للعودة إلى العرض المختصر
    btn = `<button class="btn alt" data-pall>عرض أقل</button>`;
  }

  // إرجاع قائمة المنتجات مع زر التحكم في عدد النتائج
  return `<div class="list">${rows}</div>${btn}`;
}


// تحديث قائمة المنتجات عند كتابة نص في مربع البحث
function prodSearch(v) {
  UI.pq = v; // حفظ نص البحث في حالة الواجهة
  document.getElementById('plist').innerHTML = prodHTML(); // إعادة رسم القائمة
}


/* تجميع الديون المستحقة حسب اسم المورد */
function supGroups() {
  const m = {}; // كائن لتجميع الديون الخاصة بكل مورد

  // استخراج الديون التي ما زال لها مبلغ غير مسدد
  E.debts().filter(d => d.left > 0.005).forEach(d => {
    const k = d.t.supplier || ''; // اسم المورد، أو نص فارغ إذا لم يُحدد

    // إنشاء مجموعة جديدة للمورد عند ظهوره لأول مرة
    // أو استخدام المجموعة الموجودة إذا كان له أكثر من دين
    const g = m[k] || (m[k] = {
      k, // اسم المورد
      n: 0, // عدد الديون المستحقة له
      left: 0, // إجمالي المبلغ المتبقي له
      first: d.t.date, // تاريخ أقدم دين
    });

    g.n++; // زيادة عدد الديون الخاصة بهذا المورد
    g.left += d.left; // إضافة المبلغ المتبقي إلى إجمالي ديونه

    // الاحتفاظ بتاريخ أقدم دين للمورد
    if (d.t.date < g.first) g.first = d.t.date;
  });

  // تحويل المجموعات إلى مصفوفة وترتيب الموردين حسب إجمالي الدين،
  // من أكبر مبلغ مستحق إلى أصغره
  return Object.values(m).sort((a, b) => b.left - a.left);
}


// إنشاء HTML لقائمة الديون المستحقة للموردين
function debtsHTML() {
  const gs = supGroups(); // الحصول على الديون مجمعة حسب المورد

  // إذا لم توجد ديون مستحقة، لا نعرض قسم الديون
  if (!gs.length) return '';

  // حساب إجمالي الديون المستحقة لجميع الموردين
  const tot = gs.reduce((s, g) => s + g.left, 0);

  // إذا اختار المستخدم عرض الكل، أو كان عدد الموردين قليلًا،
  // نعرض الجميع؛ وإلا نعرض DLIM موردين فقط
  const lim = (UI.dAll || gs.length <= DLIM + 1) ? gs.length : DLIM;

  // إنشاء صف لكل مورد ضمن العدد المطلوب عرضه
  const rows = gs.slice(0, lim).map(g => `
    <div class="row-i" data-sup="#${esc(g.k)}">
      <span class="ic">🤝</span>

      <div class="mid">
        ${esc(g.k || 'بدون مورّد')}

        <span>
          ${g.n} ${g.n === 1 ? 'دين' : 'ديون'} ·
          منذ ${sd(g.first)}
        </span>
      </div>

      <!-- إظهار إجمالي الدين المتبقي للمورد -->
      <b class="neg">${fmt(g.left)}</b>

      <span class="chev">‹</span>
    </div>
  `).join('');

  // تجهيز زر عرض المزيد أو عرض عدد أقل من الموردين
  let btn = '';

  if (gs.length > lim) {
    btn = `<button class="btn alt" data-dall>
      عرض كل الموردين (${gs.length})
    </button>`;
  } else if (UI.dAll && gs.length > DLIM + 1) {
    btn = `<button class="btn alt" data-dall>عرض أقل</button>`;
  }

  // إظهار عنوان القسم وإجمالي الديون وعدد الموردين وقائمة الديون
  return `
    <h3>
      🤝 ديون عليك ·
      <span class="neg">${fmt(tot)}</span> ·
      ${gs.length} ${gs.length === 1 ? 'مورّد' : 'موردين'}
    </h3>

    <div class="list">${rows}</div>
    ${btn}
  `;
}


// شرح كيفية حساب الرصيد النقدي والقيمة الإجمالية للاستثمار
function flowHTML() {
  // استخراج مكونات حركة الأموال والقيم الحالية للاستثمار
  const f = E.flow(); // ملخص حركة الأموال
  const bal = E.bal().invest; // الرصيد النقدي الحالي للاستثمار
  const inv = E.inventoryValue(); // قيمة المخزون بسعر التكلفة
  const debt = E.debtTotal(); // إجمالي الديون المتبقية للموردين

  // دالة مساعدة لإنشاء صف يعرض اسم البند وقيمته ولونه
  const L = (l, v, c) =>
    `<div class="stat">
      <span>${l}</span>
      <b class="${c || ''}">${v}</b>
    </div>`;

  // إرجاع قسم قابل للفتح والإغلاق يشرح مكونات رصيد الاستثمار
  return `<details class="det">
    <summary>كيف انحسب رصيد الاستثمار؟</summary>

    <!-- الجزء الأول: حساب الرصيد النقدي -->
    <div class="list">
      ${L('رأس المال والتحويلات الداخلة', fmt(f.cap))}

      <!-- إضافة المبيعات كاملة لأنها تمثل الأموال الناتجة عن البيع -->
      ${L('＋ المبيعات (كاملة: تكلفة + ربح)', fmt(f.sales), 'pos')}

      <!-- خصم المشتريات التي دُفع ثمنها فعليًا -->
      ${L('－ مشتريات مدفوعة', fmt(f.paidPurch), 'neg')}

      <!-- إظهار سداد الديون فقط إذا كان هناك مبلغ مسدد -->
      ${f.debtPay
        ? L('－ سداد ديون', fmt(f.debtPay), 'neg')
        : ''}

      <!-- خصم مصاريف الاستثمار -->
      ${L('－ مصاريف', fmt(f.exp), 'neg')}

      <!-- الرصيد النقدي الناتج عن حركة الأموال -->
      <div class="stat sum">
        <span>= الرصيد النقدي</span>
        <b>${fmt(bal)}</b>
      </div>
    </div>

    <div class="gap"></div>

    <!-- الجزء الثاني: حساب قيمة الاستثمار الكلية -->
    <div class="list">
      ${L('الرصيد النقدي', fmt(bal))}

      <!-- إضافة قيمة البضاعة المتوفرة بسعر شرائها، لا بسعر بيعها -->
      ${L('＋ قيمة المخزون (بسعر التكلفة)', fmt(inv))}

      <!-- خصم الديون المستحقة للموردين إذا كانت موجودة -->
      ${debt > 0.005
        ? L('－ ديون عليك', fmt(debt), 'neg')
        : ''}

      <!-- القيمة الإجمالية للاستثمار بعد خصم الديون -->
      <div class="stat sum">
        <span>= قيمة الاستثمار الكلية</span>
        <b>${fmt(bal + inv - debt)}</b>
      </div>
    </div>

    <!-- توضيح الفرق بين المال النقدي وقيمة الاستثمار الكلية -->
    <div class="nt">
      الرصيد النقدي هو المال الموجود فعلاً بالاستثمار.
      المبيعات بتدخله كاملة، والمخزون ما هو داخل فيه وإنما بيتحسب بالقيمة الكلية.
    </div>
  </details>`;
}


// تسجيل صفحة الاستثمار في نظام عرض الصفحات
R.reg('invest', 'الاستثمار', () => {
  // استخراج الأرصدة والفترة المختارة وملخص الاستثمار لهذه الفترة
  const b = E.bal(), pre = perPrefix(), m = E.period(pre).invest;

  // عدد المنتجات المسجلة
  const n = DB.s.products.length;

  // عدد المنتجات التي وصلت كميتها إلى الحد الأدنى أو أقل
  const lowN = DB.s.products.filter(
    p => E.stock(p.id) <= (p.min || 0)
  ).length;

  // حساب ربح المبيعات قبل خصم المصاريف
  // المبيعات ناقص تكلفة البضاعة التي تم بيعها
  const gross = m.sales - m.cogs;

  // إنشاء محتوى صفحة الاستثمار
  return `<section class="hero">
    <small>رصيد الاستثمار (نقد)</small>
    <h1>${fmt(b.invest)}</h1>
  </section>

  ${periodBar()} <!-- شريط اختيار الفترة الزمنية -->

  <!-- بطاقات الملخص المالي للاستثمار -->
  <div class="grid">
    <div class="card">
      <small>قيمة المخزون</small>
      <b>${fmt(E.inventoryValue())}</b>
    </div>

    <div class="card">
      <small>المشتريات</small>
      <b>${fmt(m.purchases)}</b>
    </div>

    <div class="card">
      <small>المبيعات</small>
      <b>${fmt(m.sales)}</b>
    </div>

    <div class="card">
      <small>تكلفة المباع</small>
      <b>${fmt(m.cogs)}</b>
    </div>

    <div class="card">
      <small>المصاريف</small>
      <b class="neg">${fmt(m.expenses)}</b>
    </div>

    <!-- هامش الربح = صافي الربح مقسومًا على المبيعات -->
    <div class="card">
      <small>هامش الربح</small>
      <b>
        ${m.sales > 0
          ? Math.round(m.profit / m.sales * 100) + '%'
          : '—'}
      </b>
    </div>

    <!-- ربح المبيعات قبل خصم المصاريف التشغيلية -->
    <div class="card hl">
      <small>ربح المبيعات (قبل المصاريف)</small>
      <b class="${gross >= 0 ? 'pos' : 'neg'}">${fmt(gross)}</b>
    </div>

    <!-- صافي الربح بعد خصم المصاريف -->
    <div class="card hl">
      <small>صافي الربح (بعد المصاريف)</small>
      <b class="${m.profit >= 0 ? 'pos' : 'neg'}">${fmt(m.profit)}</b>
    </div>
  </div>

  ${flowHTML()} <!-- شرح حساب الرصيد والقيمة الإجمالية للاستثمار -->

  ${debtsHTML()} <!-- عرض الديون المستحقة للموردين -->

  <!-- عنوان المنتجات وعددها، مع تنبيه عند انخفاض المخزون -->
  <h3>
    المنتجات · ${n}
    ${lowN
      ? ` · <span class="warn">${lowN} منخفض أو نافد</span>`
      : ''}
  </h3>

  <!-- إظهار مربع البحث إذا تجاوز عدد المنتجات الحد الافتراضي -->
  ${n > PLIM
    ? `<input
        class="search"
        type="search"
        placeholder="🔍 ابحث عن منتج"
        value="${esc(UI.pq)}"
        oninput="prodSearch(this.value)"
      >`
    : ''}

  <!-- قائمة المنتجات -->
  <div id="plist">${prodHTML()}</div>

  <!-- قائمة عمليات الاستثمار -->
  <h3>العمليات</h3>
  ${opsBlock('invest')}`;
});
