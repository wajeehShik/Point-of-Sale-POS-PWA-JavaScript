R.reg('home','البيت',()=>{
  const b=E.bal(),pre=perPrefix(),m=E.period(pre).home,d=E.period(today()).home;
  return `<section class="hero"><small>رصيد البيت</small><h1>${fmt(b.home)}</h1></section>
  ${periodBar()}
  <div class="grid">
    <div class="card"><small>الدخل · ${perText()}</small><b class="pos">${fmt(m.income)}</b></div>
    <div class="card"><small>المصروف · ${perText()}</small><b class="neg">${fmt(m.expense)}</b></div>
    <div class="card"><small>المتبقي · ${perText()}</small><b class="${m.income-m.expense<0?'neg':''}">${fmt(m.income-m.expense)}</b></div>
    <div class="card"><small>مصروف اليوم</small><b class="neg">${fmt(d.expense)}</b></div>
  </div>
  <h3>العمليات</h3>${opsBlock('home')}`;
});