const PLIM=6;
function prodHTML(){
  const q=(UI.pq||'').trim().toLowerCase();
  const low=x=>x.q<=(x.p.min||0);
  let ps=DB.s.products.map(p=>({p,q:E.stock(p.id)}));
  ps.sort((a,b)=>low(a)===low(b)?a.p.name.localeCompare(b.p.name,'ar'):low(a)?-1:1);
  if(q)ps=ps.filter(x=>x.p.name.toLowerCase().includes(q));
  if(!ps.length)return `<div class="list"><div class="empty">${DB.s.products.length?'ما في منتج بهذا الاسم':'أضف منتجاً من خلال ＋ ثم شراء.'}</div></div>`;
  const lim=(UI.pAll||q)?ps.length:PLIM;
  const rows=ps.slice(0,lim).map(x=>`<div class="row-i" data-prod="${x.p.id}"><span class="ic">🏷️</span><div class="mid">${esc(x.p.name)}${x.q<=0?'<em class="bdg">نفد</em>':''}<span>تكلفة ${fmt(x.p.cost)} · بيع ${fmt(x.p.price)}</span></div><b class="${low(x)?'warn':''}">${x.q}</b><span class="chev">‹</span></div>`).join('');
  let btn='';
  if(ps.length>lim)btn=`<button class="btn alt" data-pall>عرض كل المنتجات (${ps.length})</button>`;
  else if(UI.pAll&&!q&&ps.length>PLIM)btn=`<button class="btn alt" data-pall>عرض أقل</button>`;
  return `<div class="list">${rows}</div>${btn}`;
}
function prodSearch(v){UI.pq=v;document.getElementById('plist').innerHTML=prodHTML()}

R.reg('invest','الاستثمار',()=>{
  const b=E.bal(),pre=perPrefix(),m=E.period(pre).invest;
  const n=DB.s.products.length,lowN=DB.s.products.filter(p=>E.stock(p.id)<=(p.min||0)).length;
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
  <h3>المنتجات · ${n}${lowN?` · <span class="warn">${lowN} منخفض أو نافد</span>`:''}</h3>
  ${n>PLIM?`<input class="search" type="search" placeholder="🔍 ابحث عن منتج" value="${esc(UI.pq)}" oninput="prodSearch(this.value)">`:''}
  <div id="plist">${prodHTML()}</div>
  <h3>العمليات</h3>${opsBlock('invest')}`;
});