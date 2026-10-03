R.reg('dashboard','الرئيسية',()=>{
  const b=E.bal(),d=E.period(today()),m=E.period(today().slice(0,7));
  const pc=n=>n>=0?'pos':'neg';
  return `<section class="hero"><small>إجمالي الأموال</small><h1>${fmt(b.total)}</h1>
    <div class="split"><div>🏡 البيت<b>${fmt(b.home)}</b></div><div>📦 الاستثمار<b>${fmt(b.invest)}</b></div></div></section>
  <div class="grid">
    <div class="card"><small>مصروف البيت اليوم</small><b class="neg">${fmt(d.home.expense)}</b></div>
    <div class="card"><small>ربح الاستثمار اليوم</small><b class="${pc(d.invest.profit)}">${fmt(d.invest.profit)}</b></div>
    <div class="card"><small>مصروف البيت هذا الشهر</small><b class="neg">${fmt(m.home.expense)}</b></div>
    <div class="card"><small>ربح الاستثمار هذا الشهر</small><b class="${pc(m.invest.profit)}">${fmt(m.invest.profit)}</b></div>
  </div>
  <h3>الحسابات</h3><div class="list">${DB.s.accounts.map(a=>`<div class="stat"><span>${esc(a.name)}</span><b>${fmt(b.acc[a.id]||0)}</b></div>`).join('')}</div>
  <h3>آخر العمليات</h3>${txList(DB.s.tx,5)}`;
});