R.reg('invest','الاستثمار',()=>{
  const b=E.bal(),d=E.period(today()).invest,m=E.period(today().slice(0,7)).invest;
  const prods=DB.s.products.length?'<div class="list">'+DB.s.products.map(p=>{
    const q=E.stock(p.id);
    return `<div class="row-i"><span class="ic">🏷️</span><div class="mid">${esc(p.name)}<span>تكلفة ${fmt(p.cost)} · بيع ${fmt(p.price)}</span></div><b class="${q<=(p.min||0)?'warn':''}">${q}</b></div>`}).join('')+'</div>'
    :'<div class="list"><div class="empty">أضف منتجاً من خلال ＋ ثم شراء.</div></div>';
  return `<section class="hero"><small>رصيد الاستثمار</small><h1>${fmt(b.invest)}</h1></section>
  <div class="grid">
    <div class="card"><small>قيمة المخزون</small><b>${fmt(E.inventoryValue())}</b></div>
    <div class="card"><small>مصاريف الشهر</small><b class="neg">${fmt(m.expenses)}</b></div>
    <div class="card"><small>مبيعات اليوم</small><b>${fmt(d.sales)}</b></div>
    <div class="card"><small>ربح اليوم</small><b class="${d.profit>=0?'pos':'neg'}">${fmt(d.profit)}</b></div>
    <div class="card"><small>مبيعات الشهر</small><b>${fmt(m.sales)}</b></div>
    <div class="card"><small>ربح الشهر</small><b class="${m.profit>=0?'pos':'neg'}">${fmt(m.profit)}</b></div>
  </div>
  <h3>المنتجات (المتوفر)</h3>${prods}
  <h3>آخر العمليات</h3>${txList(DB.s.tx.filter(t=>t.sector==='invest'||t.toSector==='invest'),15)}`;
}); 