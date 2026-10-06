const PLIM=6;
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

function debtsHTML(){
  const ds=E.debts().filter(d=>d.left>0.005);
  if(!ds.length)return '';
  const tot=ds.reduce((s,d)=>s+d.left,0);
  return `<h3>🤝 ديون عليك · <span class="neg">${fmt(tot)}</span></h3><div class="list">`+ds.map(d=>`<div class="row-i"><span class="ic">🤝</span><div class="mid">${esc(prodName(d.t.productId))} × ${d.t.qty}${d.t.supplier?' · '+esc(d.t.supplier):''}<span>${dayLabel(d.t.date)} · ${d.paid>0?'مسدد '+fmt(d.paid)+' من '+fmt(d.t.amount):'الدين '+fmt(d.t.amount)}</span></div><b class="neg">${fmt(d.left)}</b><button class="paybtn" data-pay="${d.t.id}">سداد</button></div>`).join('')+'</div>';
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
  return `<section class="hero"><small>رصيد الاستثمار (نقد)</small><h1>${fmt(b.invest)}</h1></section>
  ${periodBar()}
  <div class="grid">
    <div class="card"><small>قيمة المخزون</small><b>${fmt(E.inventoryValue())}</b></div>
    <div class="card"><small>المشتريات</small><b>${fmt(m.purchases)}</b></div>
    <div class="card"><small>المبيعات</small><b>${fmt(m.sales)}</b></div>
    <div class="card"><small>تكلفة المباع</small><b>${fmt(m.cogs)}</b></div>
    <div class="card"><small>المصاريف</small><b class="neg">${fmt(m.expenses)}</b></div>
    <div class="card"><small>صافي الربح</small><b class="${m.profit>=0?'pos':'neg'}">${fmt(m.profit)}</b></div>
  </div>
  ${flowHTML()}
  ${debtsHTML()}
  <h3>المنتجات · ${n}${lowN?` · <span class="warn">${lowN} منخفض أو نافد</span>`:''}</h3>
  ${n>PLIM?`<input class="search" type="search" placeholder="🔍 ابحث عن منتج" value="${esc(UI.pq)}" oninput="prodSearch(this.value)">`:''}
  <div id="plist">${prodHTML()}</div>
  <h3>العمليات</h3>${opsBlock('invest')}`;
});