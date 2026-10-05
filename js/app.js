let cur='income',editId=null,prodId=null,ctx=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Math.round(n*100)/100).toLocaleString('en-US')+' ₪';
const today=()=>new Date().toLocaleDateString('sv');
const TYPES={income:['💰','إيراد'],expense:['💸','مصروف'],sale:['🛒','بيع'],purchase:['📦','شراء'],transfer:['🔄','تحويل']};
const SECT={home:'🏡 البيت',invest:'📦 الاستثمار'};
const CATS={
  home:{income:['راتب','مساعدة','عمل','دخل آخر']},
  invest:{income:['رأس مال جديد','قرض أو دين','دخل آخر']}
};
const DEF={
  home:['طعام','مواصلات','فواتير','صحة','أطفال','منزل'],
  invest:['شحن','توصيل','تغليف','إعلان','أدوات','مواصلات للعمل']
};
const UNITS=['كيلو','غرام','لتر','قطعة','علبة','كيس'];
const ALL=['income','expense','sale','purchase','transfer'];
const allowed=()=>ctx==='home'?['income','expense']:ctx==='invest'?['sale','purchase','expense']:ALL;

const accName=id=>(DB.s.accounts.find(a=>a.id===id)||{}).name||'—';
const prodName=id=>(DB.s.products.find(p=>p.id===id)||{}).name||'منتج محذوف';
const opts=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(l)}</option>`).join('');
const accOpts=()=>opts(DB.s.accounts.map(a=>[a.id,a.name]));
const itemList=()=>{
  const base=ctx?DEF[ctx]:[...DEF.home,...DEF.invest];
  const used=DB.s.tx.filter(t=>t.type==='expense'&&(!ctx||t.sector===ctx)).map(t=>t.category);
  return [...new Set([...used,...base])].map(c=>`<option value="${esc(c)}">`).join('');
};
const stockBroken=()=>DB.s.products.some(p=>E.stock(p.id)<-1e-9);

/* آخر سعر وحدة دُفع لهذا الصنف (وبنفس الوحدة إذا انحددت) */
function lastUnitPrice(item,unit){
  const l=DB.s.tx.filter(t=>t.type==='expense'&&t.category===item&&t.unitPrice&&t.id!==editId&&(!unit||t.eunit===unit))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  return l[0]||null;
}

function toast(m,err){
  let el=$('#toast');
  if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}
  el.textContent=m;el.className='show'+(err?' err':'');
  clearTimeout(el._t);el._t=setTimeout(()=>el.className='',2600);
}

/* ===== التواريخ بالعربي ===== */
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MN=['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];
const pad=n=>String(n).padStart(2,'0');
const ymd=(y,m,d)=>{const dt=new Date(y,m,d);return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate())};
const sd=s=>{const a=s.split('-');return (+a[2])+'/'+(+a[1])};
const monthName=m=>MN[+m.slice(5,7)-1]+' '+m.slice(0,4);
function dayLabel(ds){
  const [y,m,d]=ds.split('-').map(Number),dt=new Date(y,m-1,d);
  const yr=y!==new Date().getFullYear()?'/'+y:'';
  const base=`${DAYS[dt.getDay()]} ${d}/${m}${yr}`;
  if(ds===today())return 'اليوم · '+base;
  const yd=new Date();yd.setDate(yd.getDate()-1);
  if(ds===yd.toLocaleDateString('sv'))return 'أمس · '+base;
  return base;
}

/* ===== حالة الواجهة ===== */
const UI={tab:{home:'all',invest:'all'},lim:{home:30,invest:30},pq:'',pAll:false};

/* ===== فلتر الفترة (شهر، يوم، دورة مالية، نطاق مخصص) ===== */
const PER={v:localStorage.getItem('mali_per')||'',from:localStorage.getItem('mali_pf')||'',to:localStorage.getItem('mali_pt')||''};
/* الدورة المالية: تبدأ من يوم cycleDay (مثلاً 20) وتنتهي قبل نفس اليوم بالشهر الجاي */
function cycleRange(off){
  const cd=DB.s.cycleDay||1,n=new Date();
  let m=n.getMonth();
  if(n.getDate()<cd)m--;
  m-=off;
  return {from:ymd(n.getFullYear(),m,cd),to:ymd(n.getFullYear(),m+1,cd-1)};
}
const perPrefix=()=>{
  const v=PER.v;
  if((v==='c0'||v==='c1')&&(DB.s.cycleDay||1)===1){PER.v='';return ''}
  if(v==='today')return today();
  if(v==='c0')return cycleRange(0);
  if(v==='c1')return cycleRange(1);
  if(v==='range')return {from:PER.from||today(),to:PER.to||today()};
  if(v&&!E.months().includes(v))PER.v='';
  return PER.v||'';
};
const perText=()=>{
  const v=PER.v;
  if(!v)return 'كل الفترات';
  if(v==='today')return 'اليوم';
  if(v==='c0'||v==='c1'){const r=cycleRange(v==='c0'?0:1);return (v==='c0'?'الدورة الحالية':'الدورة السابقة')+' ('+sd(r.from)+' – '+sd(r.to)+')'}
  if(v==='range'){const r=perPrefix();return sd(r.from)+' – '+sd(r.to)}
  return monthName(v);
};
function setPeriod(v){
  PER.v=v;
  if(v==='range'&&(!PER.from||!PER.to)){
    PER.from=(DB.s.cycleDay||1)>1?cycleRange(0).from:today().slice(0,7)+'-01';PER.to=today();
    localStorage.setItem('mali_pf',PER.from);localStorage.setItem('mali_pt',PER.to);
  }
  localStorage.setItem('mali_per',v);
  UI.lim.home=UI.lim.invest=30;
  R.render();
}
function setRange(k,val){
  if(!val)return;
  PER[k]=val;
  if(PER.from>PER.to){const t=PER.from;PER.from=PER.to;PER.to=t}
  localStorage.setItem('mali_pf',PER.from);localStorage.setItem('mali_pt',PER.to);
  UI.lim.home=UI.lim.invest=30;
  R.render();
}
function periodBar(){
  const cm=today().slice(0,7),cd=DB.s.cycleDay||1,v=PER.v;
  const o=(val,l)=>`<option value="${val}"${v===val?' selected':''}>${l}</option>`;
  let h=o('','كل الفترات')+o('today','اليوم');
  if(cd>1){const a=cycleRange(0),b=cycleRange(1);h+=o('c0',`الدورة الحالية (${sd(a.from)} – ${sd(a.to)})`)+o('c1',`الدورة السابقة (${sd(b.from)} – ${sd(b.to)})`)}
  h+=E.months().map(m=>o(m,monthName(m)+(m===cm?' (هذا الشهر)':''))).join('')+o('range','نطاق مخصص…');
  const r=v==='range'?perPrefix():null;
  return `<div class="fbar"><label>📅 الفترة<select onchange="setPeriod(this.value)">${h}</select></label>${r?`<div class="rng"><label>من<input type="date" value="${r.from}" onchange="setRange('from',this.value)"></label><label>إلى<input type="date" value="${r.to}" onchange="setRange('to',this.value)"></label></div>`:''}</div>`;
}

/* ===== التبويبات ===== */
const TABS={
  home:[['all','الكل',null],['income','إيراد',['income']],['expense','مصروف',['expense']],['transfer','تحويل',['transfer']]],
  invest:[['all','الكل',null],['sale','بيع',['sale']],['purchase','شراء',['purchase']],['expense','مصاريف',['expense']],['other','أخرى',['income','transfer']]]
};
function opsBlock(page){
  const defs=TABS[page],def=defs.find(d=>d[0]===UI.tab[page])||defs[0],pre=perPrefix();
  const list=DB.s.tx.filter(t=>(t.sector===page||t.toSector===page)&&E.inP(t.date,pre)&&(!def[2]||def[2].includes(t.type)));
  const showSum=def[2]&&def[2].length===1&&def[2][0]!=='transfer';
  const total=list.reduce((s,t)=>s+t.amount,0);
  return `<div class="tabs">${defs.map(d=>`<button class="tab${d[0]===def[0]?' on':''}" data-tab="${page}:${d[0]}">${d[1]}</button>`).join('')}</div>
  ${showSum?`<div class="tsum"><span>${list.length} عملية</span><b>${fmt(total)}</b></div>`:''}
  ${txList(list,UI.lim[page],page)}`;
}

/* قائمة العمليات مجمّعة حسب اليوم مع مجموع كل يوم */
function txList(list,n=10,page=''){
  const all=[...list].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  if(!all.length)return `<div class="list"><div class="empty">${DB.s.tx.length?'ما في عمليات بهذا الفلتر.':'ما في عمليات بعد. اضغط ＋ لإضافة أول عملية.'}</div></div>`;
  const net={};
  all.forEach(t=>{if(t.type!=='transfer')net[t.date]=(net[t.date]||0)+E.sign(t)*t.amount});
  let h='<div class="list">',day='';
  all.slice(0,n).forEach(t=>{
    if(t.date!==day){
      day=t.date;const v=net[day]||0;
      h+=`<div class="dh"><span>${dayLabel(day)}</span><b class="${v>0?'pos':v<0?'neg':''}">${v?(v>0?'+':'-')+fmt(Math.abs(v)):''}</b></div>`;
    }
    const qt=t.eqty?`${t.eqty} ${t.eunit||''}`.trim():(t.qtyText||'');
    const lbl=t.type==='sale'||t.type==='purchase'?`${TYPES[t.type][1]} ${prodName(t.productId)} × ${t.qty}`
      :t.type==='transfer'?`${SECT[t.sector]} ← ${SECT[t.toSector]}`
      :t.type==='expense'?`${t.category}${qt?' · '+qt:''}`:t.category;
    let meta=t.type==='transfer'?`${accName(t.account)} ← ${accName(t.toAccount)}`:(page?accName(t.account):`${SECT[t.sector]} · ${accName(t.account)}`);
    if(t.type==='sale')meta+=` · ربح ${fmt(t.amount-(t.cogs||0))}`;
    if(t.type==='expense'&&t.unitPrice&&t.eunit)meta+=` · ${fmt(t.unitPrice)}/${t.eunit}`;
    const sg=t.type==='transfer'?'':E.sign(t)>0?'+':'-';
    const cl=t.type==='transfer'?'':E.sign(t)>0?'pos':'neg';
    h+=`<div class="row-i" data-edit="${t.id}"><span class="ic">${TYPES[t.type][0]}</span><div class="mid">${esc(lbl)}<span>${esc(meta)}</span></div><b class="${cl}">${sg}${fmt(t.amount)}</b><span class="chev">‹</span></div>`;
  });
  h+='</div>';
  if(page&&all.length>n)h+=`<button class="btn alt" data-more="${page}">عرض المزيد (${all.length-n})</button>`;
  return h;
}

/* ===== نافذة الإضافة / التعديل ===== */
const setTitle=s=>{$('.bar h3').textContent=s};
function showSheet(){$('#sheet').classList.add('open');document.body.style.overflow='hidden'}
function openSheet(){
  editId=null;prodId=null;
  ctx=R.cur==='home'?'home':R.cur==='invest'?'invest':null;
  cur=allowed()[0];
  setTitle(ctx==='home'?'عملية على البيت':ctx==='invest'?'عملية على الاستثمار':'عملية جديدة');
  showSheet();drawForm();
}
function openEdit(id){
  const t=DB.s.tx.find(x=>x.id===id);if(!t)return;
  ctx=null;editId=id;prodId=null;cur=t.type;setTitle('تعديل عملية');showSheet();drawForm();fillEdit(t);
}
function openProduct(id){ctx=null;editId=null;prodId=id;cur='product';setTitle('تعديل منتج');showSheet();drawForm()}
function closeSheet(){$('#sheet').classList.remove('open');document.body.style.overflow='';editId=null;prodId=null}

/* اختيار الوحدة بالأزرار */
function setUnit(u,manual){
  const f=$('#form');if(!f.elements.eunit)return;
  const known=UNITS.includes(u),other=!!u&&!known;
  f.elements.eunit.value=u||'';
  document.querySelectorAll('#units .u').forEach(b=>{
    const k=b.dataset.unit;
    b.classList.toggle('on',k===u||(k==='__other'&&other));
  });
  const eo=f.elements.eother;
  eo.style.display=other?'block':'none';
  if(other)eo.value=u;
  if(manual)f.dataset.touched='1';
}

function drawForm(){
  const t=cur;
  if(t==='product'){
    const p=DB.s.products.find(x=>x.id===prodId);
    $('#form').innerHTML=`<label>اسم المنتج<input name="pname" value="${esc(p.name)}"></label>
    <div class="row"><label>سعر التكلفة<input name="cost" type="number" step="any" inputmode="decimal" value="${p.cost}"></label><label>سعر البيع<input name="price" type="number" step="any" inputmode="decimal" value="${p.price}"></label></div>
    <div class="row"><label>رصيد افتتاحي<input name="qty0" type="number" step="any" inputmode="decimal" value="${p.qty0||0}"></label><label>الحد الأدنى<input name="min" type="number" step="any" inputmode="decimal" value="${p.min||0}"></label></div>
    <div class="sumbox"><div class="stat"><span>المتوفر حالياً</span><b>${E.stock(p.id)}</b></div><div class="note">تغيير السعر لا يغيّر أرباح المبيعات السابقة.</div></div>
    <div class="savebar"><button class="btn">حفظ</button><button type="button" class="btn alt" style="color:var(--danger);margin-top:8px" data-delprod>حذف المنتج</button></div>`;
    return;
  }
  const prods=DB.s.products.map(p=>[p.id,p.name]);
  const types=allowed();
  let h=editId?'':`<div class="chips" style="grid-template-columns:repeat(${types.length},1fr)">${types.map(k=>`<button type="button" class="chip${k===t?' on':''}" data-type="${k}"><span>${TYPES[k][0]}</span>${TYPES[k][1]}</button>`).join('')}</div>`;
  if(t==='income'||t==='expense'){
    h+=(ctx&&!editId)
      ?`<input type="hidden" name="sector" value="${ctx}">`
      :`<label>القسم<select name="sector">${opts([['home',SECT.home],['invest',SECT.invest]])}</select></label>`;
    if(t==='income'){
      h+=`<label>مصدر الدخل<select name="category"></select></label>
      <label>المبلغ<input name="amount" type="number" step="any" min="0" inputmode="decimal" placeholder="المبلغ"></label>`;
    }else{
      h+=`<label>الصنف<input name="category" list="items" placeholder="مثال: بطاطا" autocomplete="off"><datalist id="items">${itemList()}</datalist></label>
      <div class="row"><label>الكمية (اختياري)<input name="eqty" type="number" step="any" min="0" inputmode="decimal" placeholder="5"></label><label>السعر الإجمالي<input name="amount" type="number" step="any" min="0" inputmode="decimal" placeholder="المبلغ"></label></div>
      <div class="lbl">الوحدة</div>
      <div class="units" id="units">${UNITS.map(u=>`<button type="button" class="u" data-unit="${u}">${u}</button>`).join('')}<button type="button" class="u" data-unit="__other">أخرى</button></div>
      <input type="hidden" name="eunit">
      <input name="eother" placeholder="اكتب الوحدة" style="display:none;margin-top:-4px;margin-bottom:12px" autocomplete="off">
      <div class="total" id="uprice"></div>`;
    }
    h+=`<label>${t==='income'?'الحساب الذي دخلت إليه':'الحساب الذي دُفع منه'}<select name="account">${accOpts()}</select></label>`;
  }else if(t==='sale'){
    h+=`<label>المنتج<select name="product">${opts(prods)}</select></label>
    <div class="row"><label>الكمية<input name="qty" type="number" step="any" value="1" min="0" inputmode="decimal"></label><label>سعر البيع (للوحدة)<input name="unit" type="number" step="any" min="0" inputmode="decimal" placeholder="السعر"></label></div>
    <div class="sumbox">
      <div class="stat"><span>الإجمالي</span><b id="tot">0 ₪</b></div>
      <div class="stat"><span>تكلفة الوحدة</span><b id="cst">—</b></div>
      <div class="stat"><span>الربح</span><b id="prf">—</b></div>
      <div class="note" id="stk"></div>
    </div>
    <label>الحساب الذي استلم المال<select name="account">${accOpts()}</select></label>`;
  }else if(t==='purchase'){
    h+=`<label>المنتج<select name="product">${opts(prods)}<option value="__new">＋ منتج جديد</option></select></label>
    <label id="newp" style="display:none">اسم المنتج الجديد<input name="newname"></label>
    <div class="row"><label>الكمية<input name="qty" type="number" step="any" min="0" inputmode="decimal" placeholder="الكمية"></label><label>المبلغ المدفوع<input name="amount" type="number" step="any" min="0" inputmode="decimal" placeholder="الإجمالي"></label></div>
    <div class="total">تكلفة الوحدة: <b id="tot">—</b></div>
    <label>الحساب الذي دُفع منه<select name="account">${accOpts()}</select></label>`;
  }else{
    h+=`<div class="row"><label>من قسم<select name="sector">${opts([['home',SECT.home],['invest',SECT.invest]])}</select></label><label>إلى قسم<select name="toSector">${opts([['invest',SECT.invest],['home',SECT.home]])}</select></label></div>
    <div class="row"><label>من حساب<select name="account">${accOpts()}</select></label><label>إلى حساب<select name="toAccount">${accOpts()}</select></label></div>
    <label>المبلغ<input name="amount" type="number" step="any" min="0" inputmode="decimal" placeholder="المبلغ"></label>`;
  }
  h+=`<div class="daterow" id="dt"><span>📅 التاريخ: اليوم</span><button type="button" class="link" data-date>تغيير</button></div>
  <label id="datel" style="display:none">التاريخ<input type="date" name="date" value="${today()}"></label>
  <label>ملاحظة<input name="note" placeholder="اختياري"></label>
  <div class="savebar"><button class="btn">حفظ</button>${editId?'<button type="button" class="btn alt" style="color:var(--danger);margin-top:8px" data-deltx>حذف العملية</button>':''}</div>`;
  $('#form').innerHTML=h;
  $('#form').dataset.touched='';
  if(cur==='sale'&&!editId)fillPrice();
  sync();
}

function fillEdit(t){
  const f=$('#form');
  const set=(n,v)=>{
    const el=f.elements[n];if(!el||v===undefined||v===null)return;
    if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(v)))el.add(new Option(v,v));
    el.value=v;
  };
  set('sector',t.sector);sync();
  set('category',t.category);
  if(t.type!=='sale')set('amount',t.amount);
  set('eqty',t.eqty);
  if(t.type==='expense'){f.dataset.touched='1';setUnit(t.eunit||'')}
  set('account',t.account);set('toSector',t.toSector);set('toAccount',t.toAccount);
  set('product',t.productId);set('qty',t.qty);
  if(t.type==='sale')set('unit',t.unit);
  set('note',t.note);set('date',t.date);
  $('#dt').style.display='none';$('#datel').style.display='block';
  sync();
}

/* يعبّي آخر سعر بيع للمنتج تلقائياً */
function fillPrice(){
  const f=$('#form'),p=DB.s.products.find(x=>x.id===f.elements.product.value);
  f.elements.unit.value=p&&p.price>0?p.price:'';
}

function sync(){
  const f=$('#form'),g=n=>f.elements[n];
  if(!f.elements.length)return;
  const c=g('category');
  /* نعيد بناء مصادر الدخل فقط لما يتغير القسم، حتى ما يضيع اختيار المستخدم */
  if(c&&c.tagName==='SELECT'&&g('sector')){
    const sec=g('sector').value;
    if(c.dataset.sec!==sec){
      c.innerHTML=opts((CATS[sec][cur]||[]).map(x=>[x,x]));
      c.dataset.sec=sec;
    }
  }
  /* سعر الوحدة للمصروف + آخر سعر للصنف */
  if(cur==='expense'&&g('eqty')){
    if(g('eother').style.display!=='none')g('eunit').value=g('eother').value.trim();
    const item=g('category').value.trim();
    if(!g('eunit').value&&!f.dataset.touched&&item){
      const la=lastUnitPrice(item,'');
      if(la&&la.eunit)setUnit(la.eunit);
    }
    const q=+g('eqty').value,a=+g('amount').value,u=g('eunit').value.trim();
    const parts=[];
    if(q>0&&a>0)parts.push(`سعر ${u||'الوحدة'}: <b>${fmt(a/q)}</b>`);
    const last=item?lastUnitPrice(item,u):null;
    if(last)parts.push(`آخر مرة: ${fmt(last.unitPrice)}${last.eunit?' / '+esc(last.eunit):''} (${last.date})`);
    $('#uprice').innerHTML=parts.join('<br>');
  }
  const p=g('product')?DB.s.products.find(x=>x.id===g('product').value):null;
  if(cur==='sale'&&g('qty')&&g('unit')){
    const q=+g('qty').value||0,u=+g('unit').value||0,cost=p?p.cost:0,profit=(u-cost)*q;
    $('#tot').textContent=fmt(q*u);
    $('#cst').textContent=p?fmt(cost):'—';
    const pr=$('#prf');
    if(q>0&&u>0){pr.textContent=(profit>=0?'+':'')+fmt(profit);pr.className=profit>=0?'pos':'neg'}
    else{pr.textContent='—';pr.className=''}
  }
  if(cur==='purchase'&&g('qty')&&g('amount')){
    const q=+g('qty').value,a=+g('amount').value;
    $('#tot').textContent=q>0&&a>0?fmt(a/q):'—';
  }
  if(g('product')){
    const np=$('#newp');if(np)np.style.display=g('product').value==='__new'?'block':'none';
    const s=$('#stk');if(s)s.textContent=p&&cur==='sale'?`المتوفر في المخزون: ${E.stock(p.id)}`:'';
  }
}

function submitForm(e){
  e.preventDefault();
  if(cur==='product')return saveProduct();
  const f=$('#form'),v=n=>f.elements[n]?f.elements[n].value:'';
  const t={type:cur,date:v('date')||today(),note:v('note'),account:v('account')};
  const qty=+v('qty'),unit=+v('unit');
  const old=editId?DB.s.tx.find(x=>x.id===editId):null;
  let newPid=null,pid=null,p=null;

  if(cur==='income'){t.sector=v('sector');t.category=v('category');t.amount=+v('amount')}
  else if(cur==='expense'){
    const item=v('category').trim();if(!item)return toast('اكتب اسم الصنف',1);
    t.sector=v('sector');t.category=item;t.amount=+v('amount');
    const eq=+v('eqty'),eu=v('eunit').trim();
    if(eq>0){
      t.eqty=eq;t.eunit=eu;t.unitPrice=t.amount/eq;t.qtyText=`${eq} ${eu}`.trim();
    }else if(old&&old.qtyText&&!old.eqty)t.qtyText=old.qtyText;
  }
  else if(cur==='transfer'){
    t.sector=v('sector');t.toSector=v('toSector');t.toAccount=v('toAccount');t.amount=+v('amount');
    if(t.sector===t.toSector&&t.account===t.toAccount)return toast('اختر قسمين أو حسابين مختلفين',1);
  }else{
    t.sector='invest';t.qty=qty;
    if(cur==='sale'){t.unit=unit;t.amount=qty*unit}
    else{t.amount=+v('amount');t.unit=qty>0?t.amount/qty:0}
    if(!(qty>0&&t.amount>0))return toast('أدخل الكمية والسعر',1);
    pid=v('product');
    if(pid==='__new'){
      const name=v('newname').trim();if(!name)return toast('اكتب اسم المنتج',1);
      pid=newPid=DB.add('products',{name,cost:t.unit,price:0,qty0:0,min:0}).id;
    }
    if(!pid)return toast('اختر منتجاً',1);
    p=DB.s.products.find(x=>x.id===pid);t.productId=pid;
    if(cur==='sale')t.cogs=old&&old.type==='sale'&&old.productId===pid&&old.qty>0?old.cogs/old.qty*qty:p.cost*qty;
  }
  if(!(t.amount>0)){if(newPid)DB.del('products',newPid);return toast('أدخل مبلغاً أكبر من صفر',1)}

  /* نطبّق التغيير ثم نتأكد إن المخزون ما صار سالب، وإلا نتراجع */
  const snap=old?JSON.parse(JSON.stringify(old)):null;
  let idx=-1;
  if(editId){idx=DB.s.tx.findIndex(x=>x.id===editId);t.id=editId;DB.s.tx[idx]=t}
  else{t.id=DB.id();DB.s.tx.push(t)}
  if(stockBroken()){
    if(editId)DB.s.tx[idx]=snap;else DB.s.tx.pop();
    if(newPid)DB.del('products',newPid);
    return toast('الكمية أكبر من المخزون المتوفر',1);
  }
  if(p&&cur==='purchase')p.cost=t.unit;
  if(p&&cur==='sale')p.price=unit;
  DB.save();
  const was=editId;closeSheet();R.render();toast(was?'تم تعديل العملية ✓':'تم الحفظ ✓');
}

function saveProduct(){
  const f=$('#form'),p=DB.s.products.find(x=>x.id===prodId),n=f.elements.pname.value.trim();
  if(!n)return toast('اكتب اسم المنتج',1);
  const bak={...p};
  Object.assign(p,{name:n,cost:+f.elements.cost.value||0,price:+f.elements.price.value||0,qty0:+f.elements.qty0.value||0,min:+f.elements.min.value||0});
  if(stockBroken()){Object.assign(p,bak);return toast('الرصيد الافتتاحي بيخلي المخزون سالب',1)}
  DB.save();closeSheet();R.render();toast('تم حفظ المنتج ✓');
}

function delTx(id){
  const i=DB.s.tx.findIndex(x=>x.id===id),old=DB.s.tx[i];
  DB.s.tx.splice(i,1);
  if(stockBroken()){DB.s.tx.splice(i,0,old);toast('ما بتنحذف: بتخلي مخزون منتج سالب. احذف عمليات البيع المرتبطة أولاً',1);return false}
  DB.save();return true;
}

document.addEventListener('click',e=>{
  if(e.target.id==='fab')return openSheet();
  const c=e.target.closest('[data-edit],[data-prod],[data-type],[data-close],[data-date],[data-deltx],[data-delprod],[data-unit],[data-tab],[data-per],[data-more],[data-pall]');
  if(!c)return;
  const d=c.dataset;
  if(d.edit)openEdit(d.edit);
  else if(d.prod)openProduct(d.prod);
  else if(d.type){cur=d.type;drawForm()}
  else if('close' in d)closeSheet();
  else if(d.tab){const [pg,k]=d.tab.split(':');UI.tab[pg]=k;UI.lim[pg]=30;R.render()}
  else if(d.more){UI.lim[d.more]+=30;R.render()}
  else if('pall' in d){UI.pAll=!UI.pAll;R.render()}
  else if(d.per!==undefined)setPeriod(d.per);
  else if('date' in d){$('#dt').style.display='none';$('#datel').style.display='block'}
  else if(d.unit){
    const f=$('#form');
    if(d.unit==='__other'){
      setUnit('',true);
      document.querySelectorAll('#units .u').forEach(b=>b.classList.toggle('on',b.dataset.unit==='__other'));
      f.elements.eother.style.display='block';f.elements.eother.value='';f.elements.eother.focus();
    }else setUnit(f.elements.eunit.value===d.unit?'':d.unit,true);
    sync();
  }
  else if('deltx' in d){
    if(confirm('حذف هذه العملية؟ ستتحدث الأرصدة والمخزون والأرباح تلقائياً.')&&delTx(editId)){closeSheet();R.render();toast('تم حذف العملية')}
  }
  else if('delprod' in d){
    if(DB.s.tx.some(t=>t.productId===prodId))return toast('المنتج عليه عمليات، احذفها أولاً',1);
    if(confirm('حذف هذا المنتج؟')){DB.del('products',prodId);closeSheet();R.render();toast('تم حذف المنتج')}
  }
});
document.addEventListener('input',e=>{
  if(!e.target.closest('#form'))return;
  if(e.target.name==='eother')$('#form').dataset.touched='1';
  sync();
});
document.addEventListener('change',e=>{
  if(!e.target.closest('#form'))return;
  if(cur==='sale'&&e.target.name==='product'&&!editId)fillPrice();
  sync();
});
document.addEventListener('submit',e=>{if(e.target.id==='form')submitForm(e)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});