
R.reg('dashboard', 'الرئيسية', () => {
  // حساب أرصدة الأموال، وتحديد الفترة المختارة، واستخراج ملخص البيت والاستثمار
  const b = E.bal(), pre = perPrefix(), r = E.period(pre), h = r.home, i = r.invest;

  // إرجاع اسم CSS لإظهار الرصيد بالسالب بلون مختلف
  const sg = n => n < 0 ? 'neg' : '';

  // إنشاء بطاقة لكل محفظة أو حساب مالي
  const wal = DB.s.accounts.map(a => {
    // استخراج رصيد الحساب في قطاعي البيت والاستثمار
    // إذا لم توجد أرصدة للحساب، نعتبرها صفرًا
    const s = b.accS[a.id] || { home: 0, invest: 0 };

    // إجمالي رصيد الحساب في جميع القطاعات
    const tot = b.acc[a.id] || 0;

    // إنشاء HTML يعرض اسم الحساب ورصيده وتوزيعه بين البيت والاستثمار
    return `<div class="wal">
      <div class="top">
        <span>${esc(a.name)}</span>
        <b class="${sg(tot)}">${fmt(tot)}</b>
      </div>
      <div class="sub">
        <span>🏡 البيت <b class="${sg(s.home)}">${fmt(s.home)}</b></span>
        <span>📦 الاستثمار <b class="${sg(s.invest)}">${fmt(s.invest)}</b></span>
      </div>
    </div>`;
  }).join(''); // دمج بطاقات الحسابات في نص HTML واحد


  // إظهار إجمالي الأموال مع توزيعها بين البيت والاستثمار
  return `<section class="hero">
    <small>إجمالي الأموال</small>
    <h1>${fmt(b.total)}</h1>

    <div class="split">
      <div>🏡 البيت<b>${fmt(b.home)}</b></div>
      <div>📦 الاستثمار<b>${fmt(b.invest)}</b></div>
    </div>
  </section>

  ${periodBar()} <!-- شريط اختيار الفترة الزمنية -->

  <h3>ملخص · ${perText()}</h3>

  <!-- بطاقات الملخص المالي للفترة المختارة -->
  <div class="grid" style="margin-top:0">
    <div class="card">
      <small>دخل البيت</small>
      <b class="pos">${fmt(h.income)}</b>
    </div>

    <div class="card">
      <small>مصروف البيت</small>
      <b class="neg">${fmt(h.expense)}</b>
    </div>

    <div class="card">
      <small>مبيعات الاستثمار</small>
      <b>${fmt(i.sales)}</b>
    </div>

    <div class="card">
      <small>ربح الاستثمار</small>
      <!-- تغيير لون الربح حسب كونه موجبًا أو سالبًا -->
      <b class="${i.profit >= 0 ? 'pos' : 'neg'}">${fmt(i.profit)}</b>
    </div>
  </div>

  <h3>المحافظ · الرصيد الفعلي وتوزيعه</h3>

  <!-- عرض جميع الحسابات وأرصدتها -->
  <div class="list">${wal}</div>

  <h3>العمليات · ${perText()}</h3>

  <!-- حقل البحث في العمليات المالية -->
  <input
    class="search"
    type="search"
    placeholder="🔍 ابحث في كل العمليات (صنف، منتج، مورّد، ملاحظة، مبلغ، يوم...)"
    value="${esc(UI.q.all)}"
    oninput="opsSearch('all',this.value)"
  >

  <!-- قائمة العمليات، وتتحدث نتائجها عند الكتابة في البحث -->
  <div id="ops-all">${allOpsList()}</div>`;
});
