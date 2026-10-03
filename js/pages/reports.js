R.reg('reports','التقارير',()=>{
  const blk=(title,p)=>{const r=E.period(p),h=r.home,i=r.invest;return `<h3>${title}</h3><div class="list">
    <div class="stat"><span>🏡 دخل البيت</span><b>${fmt(h.income)}</b></div>
    <div class="stat"><span>🏡 مصروف البيت</span><b class="neg">${fmt(h.expense)}</b></div>
    <div class="stat"><span>📦 المبيعات</span><b>${fmt(i.sales)}</b></div>
    <div class="stat"><span>📦 تكلفة البضاعة</span><b>${fmt(i.cogs)}</b></div>
    <div class="stat"><span>📦 مصاريف الاستثمار</span><b>${fmt(i.expenses)}</b></div>
    <div class="stat sum"><span>صافي ربح الاستثمار</span><b class="${i.profit>=0?'pos':'neg'}">${fmt(i.profit)}</b></div></div>`};
  const pp=E.productProfit(today().slice(0,7));
  const rows=Object.entries(pp).map(([id,v])=>`<div class="stat"><span>${esc(prodName(id))}</span><b class="${v>=0?'pos':'neg'}">${fmt(v)}</b></div>`).join('')||'<div class="empty">لا مبيعات هذا الشهر</div>';
  return blk('اليوم',today())+blk('هذا الشهر',today().slice(0,7))+`<h3>ربح كل منتج هذا الشهر</h3><div class="list">${rows}</div>`;
});