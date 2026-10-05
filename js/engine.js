/* كل الأرصدة تنحسب من سجل العمليات، ولا تتخزن */
const E={
  sign(t){return (t.type==='income'||t.type==='sale')?1:-1},
  /* هل التاريخ داخل الفترة؟ الفترة: '' (الكل) أو 'YYYY-MM[-DD]' أو {from,to} */
  inP(d,pre){return !pre||(typeof pre==='object'?(d>=pre.from&&d<=pre.to):d.startsWith(pre))},
  bal(){
    const r={home:0,invest:0,acc:{},accS:{}};
    const a=(id,s,v)=>{
      if(!id)return;
      r.acc[id]=(r.acc[id]||0)+v;
      const o=r.accS[id]||(r.accS[id]={home:0,invest:0});o[s]+=v;
    };
    DB.s.accounts.forEach(x=>{r.acc[x.id]=0;r.accS[x.id]={home:0,invest:0}});
    for(const t of DB.s.tx){
      if(t.type==='transfer'){
        r[t.sector]-=t.amount;r[t.toSector]+=t.amount;
        a(t.account,t.sector,-t.amount);a(t.toAccount,t.toSector,t.amount);
      }else{const v=this.sign(t)*t.amount;r[t.sector]+=v;a(t.account,t.sector,v)}
    }
    r.total=r.home+r.invest;return r;
  },
  stock(pid){
    const p=DB.s.products.find(x=>x.id===pid);let q=p?+p.qty0||0:0;
    for(const t of DB.s.tx){if(t.productId!==pid)continue;
      if(t.type==='purchase')q+=t.qty;if(t.type==='sale')q-=t.qty}
    return q;
  },
  inventoryValue(){return DB.s.products.reduce((s,p)=>s+Math.max(0,this.stock(p.id))*p.cost,0)},
  /* الأشهر الموجودة بالبيانات (الأحدث أولاً) */
  months(){
    const s=new Set(DB.s.tx.map(t=>t.date.slice(0,7)));
    s.add(new Date().toLocaleDateString('sv').slice(0,7));
    return [...s].sort().reverse();
  },
  period(pre){
    const r={home:{income:0,expense:0},invest:{sales:0,cogs:0,expenses:0,purchases:0,profit:0}};
    for(const t of DB.s.tx){
      if(!this.inP(t.date,pre))continue;
      if(t.sector==='home'){
        if(t.type==='income')r.home.income+=t.amount;
        if(t.type==='expense')r.home.expense+=t.amount;
      }else if(t.sector==='invest'){
        if(t.type==='sale'){r.invest.sales+=t.amount;r.invest.cogs+=t.cogs||0}
        if(t.type==='expense')r.invest.expenses+=t.amount;
        if(t.type==='purchase')r.invest.purchases+=t.amount;
      }
    }
    r.invest.profit=r.invest.sales-r.invest.cogs-r.invest.expenses;
    return r;
  },
  productProfit(pre){
    const m={};
    for(const t of DB.s.tx)if(t.type==='sale'&&this.inP(t.date,pre))m[t.productId]=(m[t.productId]||0)+t.amount-(t.cogs||0);
    return m;
  }
};