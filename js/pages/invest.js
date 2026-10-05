R.reg('invest','الاستثمار',()=>{
  const b=E.bal(),pre=perPrefix(),m=E.period(pre).invest;
  const prods=DB.s.products.length?'<div class="list">'+DB.s.products.map(p=>{
    const q=E.stock(p.id);
    return `<div class="row-i" data-prod="${p.id}"><span class="ic">🏷️</span><div class="mid">${esc(p.name)}<span>تكلفة ${fmt(p.cost)} · بيع ${fmt(p.price)}</span></div><b class="${q<=(p.min||0)?'warn':''}">${q}</b><span class="chev">‹</span></div>`}).join('')+'</div>'
    :'<div class="list"><div class="empty">أضف منتجاً من خلال ＋ ثم شراء.</div></div>';
  return `<section class="hero"><small>رصيد الاستثمار</small><h1>${fmt(b.invest)}</h1></section>
  ${periodBar()}
  <div class="grid">
    <div class="card"><small>قيمة المخزون</small><b>${fmt(E.inventoryValue())}</b></div>
    <div class="card"><small>المشتريات</small><b>${fmt(m.purchases)}</b></div>
    <div class="card"><small>المبيعات</small><b>${fmt(m.sales)}</b></div>
    <div class="card"><small>تكلفة المباع</small><b>${fmt(m.cogs)}</b></div>
    <div class="card"><small>المصاريف</small><b class="neg">${fmt(m.expenses)}</b></div>
    <div class="card"><small>صافي الربح</small><b class="${m.profit>=0?'pos':'neg'}">${fmt(m.profit)}</b></div>
  </div>
  <h3>المنتجات (المتوفر) · اضغط للتعديل</h3>${prods}
  <h3>العمليات</h3>${opsBlock('invest')}`;
});