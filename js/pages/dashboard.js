R.reg('dashboard','الرئيسية',()=>{
  const b=E.bal(),pre=perPrefix(),r=E.period(pre),h=r.home,i=r.invest;
  const sg=n=>n<0?'neg':'';
  const wal=DB.s.accounts.map(a=>{
    const s=b.accS[a.id]||{home:0,invest:0},tot=b.acc[a.id]||0;
    return `<div class="wal"><div class="top"><span>${esc(a.name)}</span><b class="${sg(tot)}">${fmt(tot)}</b></div>
    <div class="sub"><span>🏡 البيت <b class="${sg(s.home)}">${fmt(s.home)}</b></span><span>📦 الاستثمار <b class="${sg(s.invest)}">${fmt(s.invest)}</b></span></div></div>`;
  }).join('');
  return `<section class="hero"><small>إجمالي الأموال</small><h1>${fmt(b.total)}</h1>
    <div class="split"><div>🏡 البيت<b>${fmt(b.home)}</b></div><div>📦 الاستثمار<b>${fmt(b.invest)}</b></div></div></section>
  ${periodBar()}
  <h3>ملخص · ${perText()}</h3>
  <div class="grid" style="margin-top:0">
    <div class="card"><small>دخل البيت</small><b class="pos">${fmt(h.income)}</b></div>
    <div class="card"><small>مصروف البيت</small><b class="neg">${fmt(h.expense)}</b></div>
    <div class="card"><small>مبيعات الاستثمار</small><b>${fmt(i.sales)}</b></div>
    <div class="card"><small>ربح الاستثمار</small><b class="${i.profit>=0?'pos':'neg'}">${fmt(i.profit)}</b></div>
  </div>
  <h3>المحافظ · الرصيد الفعلي وتوزيعه</h3><div class="list">${wal}</div>
  <h3>آخر العمليات · ${perText()}</h3>${txList(DB.s.tx.filter(t=>t.date.startsWith(pre)),10)}`;
});