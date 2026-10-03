R.reg('home','البيت',()=>{
  const b=E.bal(),d=E.period(today()),m=E.period(today().slice(0,7)).home;
  return `<section class="hero"><small>رصيد البيت</small><h1>${fmt(b.home)}</h1></section>
  <div class="grid">
    <div class="card"><small>دخل الشهر</small><b class="pos">${fmt(m.income)}</b></div>
    <div class="card"><small>مصروف الشهر</small><b class="neg">${fmt(m.expense)}</b></div>
    <div class="card"><small>المتبقي</small><b>${fmt(m.income-m.expense)}</b></div>
    <div class="card"><small>مصروف اليوم</small><b class="neg">${fmt(d.home.expense)}</b></div>
  </div>
  <h3>آخر العمليات</h3>${txList(DB.s.tx.filter(t=>t.sector==='home'||t.toSector==='home'),15)}`;
});