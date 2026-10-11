const PLIM=6,DLIM=3;
function prodHTML(){
  const q=(UI.pq||'').trim().toLowerCase();
  const low=x=>x.q<=(x.p.min||0);
  let ps=DB.s.products.map(p=>({p,q:E.stock(p.id)}));
  ps.sort((a,b)=>low(a)===low(b)?a.p.name.localeCompare(b.p.name,'ar'):low(a)?-1:1);
  if(q)ps=ps.filter(x=>x.p.name.toLowerCase().includes(q));
  if(!ps.length)return `<div class="list"><div class="empty">${DB.s.products.length?'ما في منتج بهذا الاسم':'أضف منتجاً من خلال ＋ ثم شراء.'}</div></div>`;
  const lim=(UI.pAll||q)?ps.length:PLIM;
  const rows=ps.slice(0,lim).map(x=>{
    const u=x.p.price-x.p.cost;
    return `<div class="row-i" data-prod="${x.p.id}"><span class="ic">🏷️</span><div class="mid">${esc(x.p.name)}${x.q<=0?'<em class="bdg">نفد</em>':''}<span>تكلفة ${fmt(x.p.cost)} · بيع ${fmt(x.p.price)} · ربح ${fmt(u)}</span></div><b class="${low(x)?'warn':''}">${x.q}</b><span class="chev">‹</span></div>`}).join('');
  let btn='';
  if(ps.length>lim)btn=`<button class="btn alt" data-pall>عرض كل المنتجات (${ps.length})</button>`;
  else if(UI.pAll&&!q&&ps.length>PLIM)btn=`<button class="btn alt" data-pall>عرض أقل</button>`;
  return `<div class="list">${rows}</div>${btn}`;
}
function prodSearch(v){UI.pq=v;document.getElementById('plist').innerHTML=prodHTML()}

/* الديون مجمّعة حسب المورّد */
function supGroups(){
  const m={};
  E.debts().filter(d=>d.left>0.005).forEach(d=>{
    const k=d.t.supplier||'';
    const g=m[k]||(m[k]={k,n:0,left:0,first:d.t.date});
    g.n++;g.left+=d.left;if(d.t.date<g.first)g.first=d.t.date;
  });
  return Object.values(m).sort((a,b)=>b.left-a.left);
}
function debtsHTML(){
  const gs=supGroups();
  if(!gs.length)return '';
  const tot=gs.reduce((s,g)=>s+g.left,0);
  const lim=(UI.dAll||gs.length<=DLIM+1)?gs.length:DLIM;
  const rows=gs.slice(0,lim).map(g=>`<div class="row-i" data-sup="#${esc(g.k)}"><span class="ic">🤝</span><div class="mid">${esc(g.k||'بدون مورّد')}<span>${g.n} ${g.n===1?'دين':'ديون'} · منذ ${sd(g.first)}</span></div><b class="neg">${fmt(g.left)}</b><span class="chev">‹</span></div>`).join('');
  let btn='';
  if(gs.length>lim)btn=`<button class="btn alt" data-dall>عرض كل الموردين (${gs.length})</button>`;
  else if(UI.dAll&&gs.length>DLIM+1)btn=`<button class="btn alt" data-dall>عرض أقل</button>`;
  return `<h3>🤝 ديون عليك · <span class="neg">${fmt(tot)}</span> · ${gs.length} ${gs.length===1?'مورّد':'موردين'}</h3><div class="list">${rows}</div>${btn}`;
}

function flowHTML(){
  const f=E.flow(),bal=E.bal().invest,inv=E.inventoryValue(),debt=E.debtTotal();
  const L=(l,v,c)=>`<div class="stat"><span>${l}</span><b class="${c||''}">${v}</b></div>`;
  return `<details class="det"><summary>كيف انحسب رصيد الاستثمار؟</summary>
    <div class="list">
      ${L('رأس المال والتحويلات الداخلة',fmt(f.cap))}
      ${L('＋ المبيعات (كاملة: تكلفة + ربح)',fmt(f.sales),'pos')}
      ${L('－ مشتريات مدفوعة',fmt(f.paidPurch),'neg')}
      ${f.debtPay?L('－ سداد ديون',fmt(f.debtPay),'neg'):''}
      ${L('－ مصاريف',fmt(f.exp),'neg')}
      <div class="stat sum"><span>= الرصيد النقدي</span><b>${fmt(bal)}</b></div>
    </div>
    <div class="gap"></div>
    <div class="list">
      ${L('الرصيد النقدي',fmt(bal))}
      ${L('＋ قيمة المخزون (بسعر التكلفة)',fmt(inv))}
      ${debt>0.005?L('－ ديون عليك',fmt(debt),'neg'):''}
      <div class="stat sum"><span>= قيمة الاستثمار الكلية</span><b>${fmt(bal+inv-debt)}</b></div>
    </div>
    <div class="nt">الرصيد النقدي هو المال الموجود فعلاً بالاستثمار. المبيعات بتدخله كاملة، والمخزون ما هو داخل فيه وإنما بيتحسب بالقيمة الكلية.</div>
  </details>`;
}

R.reg('invest','الاستثمار',()=>{
  const b=E.bal(),pre=perPrefix(),m=E.period(pre).invest;
  const n=DB.s.products.length,lowN=DB.s.products.filter(p=>E.stock(p.id)<=(p.min||0)).length;
  const gross=m.sales-m.cogs;
  return `<section class="hero"><small>رصيد الاستثمار (نقد)</small><h1>${fmt(b.invest)}</h1></section>
  ${periodBar()}
  <div class="grid">
    <div class="card"><small>قيمة المخزون</small><b>${fmt(E.inventoryValue())}</b></div>
    <div class="card"><small>المشتريات</small><b>${fmt(m.purchases)}</b></div>
    <div class="card"><small>المبيعات</small><b>${fmt(m.sales)}</b></div>
    <div class="card"><small>تكلفة المباع</small><b>${fmt(m.cogs)}</b></div>
    <div class="card"><small>المصاريف</small><b class="neg">${fmt(m.expenses)}</b></div>
    <div class="card"><small>هامش الربح</small><b>${m.sales>0?Math.round(m.profit/m.sales*100)+'%':'—'}</b></div>
    <div class="card hl"><small>ربح المبيعات (قبل المصاريف)</small><b class="${gross>=0?'pos':'neg'}">${fmt(gross)}</b></div>
    <div class="card hl"><small>صافي الربح (بعد المصاريف)</small><b class="${m.profit>=0?'pos':'neg'}">${fmt(m.profit)}</b></div>
  </div>
  ${flowHTML()}
  ${debtsHTML()}
  <h3>المنتجات · ${n}${lowN?` · <span class="warn">${lowN} منخفض أو نافد</span>`:''}</h3>
  ${n>PLIM?`<input class="search" type="search" placeholder="🔍 ابحث عن منتج" value="${esc(UI.pq)}" oninput="prodSearch(this.value)">`:''}
  <div id="plist">${prodHTML()}</div>
  <h3>العمليات</h3>${opsBlock('invest')}`;
});