function daysIn(pre){
  if(pre.length===10)return 1;
  if(pre.length===7){
    const [y,m]=pre.split('-').map(Number),dim=new Date(y,m,0).getDate();
    return pre===today().slice(0,7)?new Date().getDate():dim;
  }
  const ds=DB.s.tx.map(t=>t.date).sort();
  if(!ds.length)return 1;
  return Math.max(1,Math.round((new Date(today())-new Date(ds[0]))/864e5)+1);
}

function barList(rows,color){
  if(!rows.length)return '<div class="list"><div class="empty">لا بيانات في هذه الفترة</div></div>';
  const tot=rows.reduce((s,r)=>s+r[1],0),mx=Math.max(1,...rows.map(r=>r[1]));
  return '<div class="card">'+rows.map(([l,v])=>`<div class="bar-r"><div class="bl"><span>${esc(l)}</span><b>${fmt(v)} <em>${Math.round(v/tot*100)}%</em></b></div><div class="bt"><i style="width:${v/mx*100}%;background:${color}"></i></div></div>`).join('')+'</div>';
}

function monthsChart(){
  const ms=E.months().slice(0,6).reverse();
  const data=ms.map(m=>{const x=E.period(m);return [m,x.home.income,x.home.expense,Math.max(0,x.invest.profit)]});
  const mx=Math.max(1,...data.flatMap(d=>[d[1],d[2],d[3]]));
  const gw=320/data.length,bw=Math.min(14,gw/4.2);
  let s='';
  data.forEach((d,k)=>{
    const cx=gw*k+gw/2;
    [[d[1],'#16A34A'],[d[2],'#DC2626'],[d[3],'#2563EB']].forEach(([v,c],j)=>{
      const hh=Math.max(v>0?2:0,v/mx*110);
      s+=`<rect x="${cx+(j-1)*(bw+2)-bw/2}" y="${130-hh}" width="${bw}" height="${hh}" rx="3" fill="${c}"/>`;
    });
    s+=`<text x="${cx}" y="147" text-anchor="middle" font-size="11" fill="#64748B">${+d[0].slice(5)}</text>`;
  });
  return `<div class="card"><svg viewBox="0 0 320 152" width="100%" role="img" aria-label="مقارنة آخر ستة أشهر"><line x1="0" y1="130" x2="320" y2="130" stroke="#E2E8F0"/>${s}</svg>
  <div class="legend"><span><i style="background:#16A34A"></i>دخل البيت</span><span><i style="background:#DC2626"></i>مصروف البيت</span><span><i style="background:#2563EB"></i>ربح الاستثمار</span></div></div>`;
}

R.reg('reports','التقارير',()=>{
  const pre=perPrefix(),r=E.period(pre),h=r.home,i=r.invest;
  const txs=DB.s.tx.filter(t=>t.date.startsWith(pre));
  if(!DB.s.tx.length)return periodBar()+'<div class="list" style="margin-top:14px"><div class="empty">ما في بيانات للتقارير بعد. أضف أول عملية من الرئيسية.</div></div>';

  const net=(h.income-h.expense)+i.profit,left=h.income-h.expense;
  const save=h.income>0?Math.round(left/h.income*100)+'%':'—';
  const avgDay=h.expense/daysIn(pre);
  const margin=i.sales>0?Math.round(i.profit/i.sales*100)+'%':'—';

  const cats=sec=>{const m={};txs.filter(t=>t.type==='expense'&&t.sector===sec).forEach(t=>m[t.category]=(m[t.category]||0)+t.amount);return Object.entries(m).sort((a,b)=>b[1]-a[1])};

  const pm={};
  txs.filter(t=>t.type==='sale').forEach(t=>{const o=pm[t.productId]||(pm[t.productId]={rev:0,cost:0,q:0});o.rev+=t.amount;o.cost+=t.cogs||0;o.q+=t.qty});
  const prow=Object.entries(pm).sort((a,b)=>(b[1].rev-b[1].cost)-(a[1].rev-a[1].cost)).map(([id,o])=>{
    const p=o.rev-o.cost;
    return `<div class="row-i"><span class="ic">🏷️</span><div class="mid">${esc(prodName(id))}<span>بيع ${o.q} · هامش ${o.rev>0?Math.round(p/o.rev*100):0}%</span></div><b class="${p>=0?'pos':'neg'}">${p>=0?'+':''}${fmt(p)}</b></div>`;
  }).join('')||'<div class="empty">لا مبيعات في هذه الفترة</div>';

  const items={};
  txs.filter(t=>t.type==='expense'&&t.unitPrice).forEach(t=>{(items[t.category+'|'+(t.eunit||'')]=items[t.category+'|'+(t.eunit||'')]||[]).push(t)});
  const irow=Object.entries(items).map(([k,a])=>{
    a.sort((x,y)=>x.date.localeCompare(y.date)||x.id.localeCompare(y.id));
    const [name,unit]=k.split('|'),last=a[a.length-1].unitPrice,prev=a.length>1?a[a.length-2].unitPrice:null;
    const sq=a.reduce((s,t)=>s+t.eqty,0),avg=a.reduce((s,t)=>s+t.amount,0)/sq;
    let tr='',cl='';
    if(prev&&prev>0){const d=(last-prev)/prev*100;if(Math.abs(d)>=1){tr=(d>0?'▲ ':'▼ ')+Math.abs(Math.round(d))+'%';cl=d>0?'neg':'pos'}}
    return `<div class="row-i"><div class="mid">${esc(name)}<span>${a.length} مرات · متوسط ${fmt(avg)}${unit?' / '+esc(unit):''} · آخر ${fmt(last)}</span></div><b class="${cl}">${tr||'—'}</b></div>`;
  }).join('');

  const mrows=E.months().map(m=>{
    const x=E.period(m);
    return `<tr data-per="${m}"><td>${monthName(m)}</td><td class="pos">${fmt(x.home.income)}</td><td class="neg">${fmt(x.home.expense)}</td><td class="${x.invest.profit>=0?'pos':'neg'}">${fmt(x.invest.profit)}</td></tr>`;
  }).join('');

  return `${periodBar()}
  <section class="hero"><small>صافي الفترة · ${perText()}</small><h1 class="${net<0?'':''}">${net>0?'+':''}${fmt(net)}</h1>
    <div class="split"><div>🏡 المتبقي من البيت<b>${fmt(left)}</b></div><div>📦 ربح الاستثمار<b>${fmt(i.profit)}</b></div></div></section>

  <div class="grid">
    <div class="card"><small>نسبة الادخار</small><b>${save}</b></div>
    <div class="card"><small>متوسط مصروف البيت يومياً</small><b>${fmt(avgDay)}</b></div>
    <div class="card"><small>هامش ربح الاستثمار</small><b>${margin}</b></div>
    <div class="card"><small>قيمة المخزون</small><b>${fmt(E.inventoryValue())}</b></div>
  </div>

  <h3>آخر 6 أشهر</h3>${monthsChart()}

  <h3>🏡 البيت · ${perText()}</h3>
  <div class="list"><div class="stat"><span>الدخل</span><b class="pos">${fmt(h.income)}</b></div><div class="stat"><span>المصاريف</span><b class="neg">${fmt(h.expense)}</b></div><div class="stat sum"><span>المتبقي</span><b class="${left>=0?'pos':'neg'}">${fmt(left)}</b></div></div>
  <h3>أين صُرف مال البيت</h3>${barList(cats('home'),'#DC2626')}

  <h3>📦 الاستثمار · ${perText()}</h3>
  <div class="list"><div class="stat"><span>المبيعات</span><b>${fmt(i.sales)}</b></div><div class="stat"><span>تكلفة البضاعة</span><b>${fmt(i.cogs)}</b></div><div class="stat"><span>مصاريف الاستثمار</span><b class="neg">${fmt(i.expenses)}</b></div><div class="stat sum"><span>صافي الربح</span><b class="${i.profit>=0?'pos':'neg'}">${fmt(i.profit)}</b></div></div>
  <h3>مصاريف الاستثمار حسب الصنف</h3>${barList(cats('invest'),'#F59E0B')}
  <h3>ربح كل منتج</h3><div class="list">${prow}</div>

  ${irow?`<h3>أسعار الأصناف · هل صارت أغلى؟</h3><div class="list">${irow}</div>`:''}

  <h3>مقارنة الأشهر · اضغط على شهر لعرضه</h3>
  <div class="list tblw"><table class="tbl"><tr><th>الشهر</th><th>دخل البيت</th><th>مصروف البيت</th><th>ربح الاستثمار</th></tr>${mrows}</table></div>

  <button class="btn alt" style="margin-top:16px" onclick="exportCSV()">⬇️ تصدير عمليات ${perText()} (CSV)</button>`;
});

function exportCSV(){
  const pre=perPrefix();
  const rows=[['التاريخ','النوع','القسم','البند','الكمية','المبلغ','المحفظة','ملاحظة']];
  DB.s.tx.filter(t=>t.date.startsWith(pre)).sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    rows.push([t.date,TYPES[t.type][1],SECT[t.sector].replace(/^\S+\s/,''),t.productId?prodName(t.productId):(t.category||''),t.qty||(t.eqty?t.eqty+' '+(t.eunit||''):''),t.amount,accName(t.account),t.note||'']);
  });
  const csv='\ufeff'+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='mali-'+(pre||'all')+'.csv';a.click();
}