const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Math.round(n*100)/100).toLocaleString('en-US')+' ₪';
const today=()=>new Date().toLocaleDateString('sv');
const TYPES={income:['💰','إيراد'],expense:['💸','مصروف'],sale:['🛒','بيع'],purchase:['📦','شراء'],transfer:['🔄','تحويل']};
const SECT={home:'🏡 البيت',invest:'📦 الاستثمار'};
const CATS={
  home:{income:['راتب','مساعدة','عمل','دخل آخر']},
  invest:{income:['دخل آخر']}
};
const accName=id=>(DB.s.accounts.find(a=>a.id===id)||{}).name||'—';
const prodName=id=>(DB.s.products.find(p=>p.id===id)||{}).name||'منتج محذوف';
const opts=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(l)}</option>`).join('');
const accOpts=()=>opts(DB.s.accounts.map(a=>[a.id,a.name]));
const itemList=()=>[...new Set(DB.s.tx.filter(t=>t.type==='expense').map(t=>t.category))].map(c=>`<option value="${esc(c)}">`).join('');

function txList(list,n=10){
  const rows=[...list].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,n);
  if(!rows.length)return '<div class="list"><div class="empty">ما في عمليات بعد. اضغط ＋ لإضافة أول عملية.</div></div>';
  return '<div class="list">'+rows.map(t=>{
    const lbl=t.type==='sale'||t.type==='purchase'?`${TYPES[t.type][1]} ${prodName(t.productId)} × ${t.qty}`
      :t.type==='transfer'?`${SECT[t.sector]} ← ${SECT[t.toSector]}`
      :t.type==='expense'?`${t.category}${t.qtyText?' · '+t.qtyText:''}`:t.category;
    let meta=t.type==='transfer'?`${accName(t.account)} ← ${accName(t.toAccount)}`:`${SECT[t.sector]} · ${accName(t.account)}`;
    if(t.type==='sale')meta+=` · ربح ${fmt(t.amount-(t.cogs||0))}`;
    const sg=t.type==='transfer'?'':E.sign(t)>0?'+':'-';
    const cl=t.type==='transfer'?'':E.sign(t)>0?'pos':'neg';
    return `<div class="row-i"><span class="ic">${TYPES[t.type][0]}</span><div class="mid">${esc(lbl)}<span>${esc(meta)} · ${t.date}</span></div><b class="${cl}">${sg}${fmt(t.amount)}</b><button class="del" data-del="${t.id}" aria-label="حذف">✕</button></div>`;
  }).join('')+'</div>';
}

/* ===== نافذة الإضافة ===== */
let cur='income';
function openSheet(){cur='income';$('#sheet').classList.add('open');drawForm()}
function closeSheet(){$('#sheet').classList.remove('open')}

function drawForm(){
  const t=cur,prods=DB.s.products.map(p=>[p.id,p.name]);
  let h=`<div class="chips">${Object.entries(TYPES).map(([k,[i,l]])=>`<button type="button" class="chip${k===t?' on':''}" data-type="${k}">${i} ${l}</button>`).join('')}</div>`;
  if(t==='income'||t==='expense'){
    h+=`<label>القسم<select name="sector">${opts([['home',SECT.home],['invest',SECT.invest]])}</select></label>`;
    if(t==='income'){
      h+=`<label>مصدر الدخل<select name="category"></select></label>
      <label>المبلغ<input name="amount" type="number" step="any" min="0" inputmode="decimal"></label>`;
    }else{
      h+=`<label>الصنف<input name="category" list="items" placeholder="مثال: بطاطا" autocomplete="off"><datalist id="items">${itemList()}</datalist></label>
      <div class="row"><label>الكمية<input name="qtyText" placeholder="مثال: 2 كيلو" autocomplete="off"></label><label>السعر<input name="amount" type="number" step="any" min="0" inputmode="decimal" placeholder="10"></label></div>`;
    }
    h+=`<label>${t==='income'?'الحساب الذي دخلت إليه':'الحساب الذي دُفع منه'}<select name="account">${accOpts()}</select></label>`;
  }else if(t==='sale'){
    h+=`<label>المنتج<select name="product">${opts(prods)}<option value="__new">＋ منتج جديد</option></select></label>
    <label id="newp" style="display:none">اسم المنتج الجديد<input name="newname"></label>
    <div class="row"><label>الكمية<input name="qty" type="number" step="any" value="1" min="0"></label><label>سعر البيع (للوحدة)<input name="unit" type="number" step="any" min="0"></label></div>
    <div class="card" style="margin-bottom:12px">
      <div class="stat" style="padding:4px 0;border:0"><span>الإجمالي</span><b id="tot">0 ₪</b></div>
      <div class="stat" style="padding:4px 0;border:0"><span>تكلفة الوحدة</span><b id="cst">—</b></div>
      <div class="stat" style="padding:4px 0;border:0"><span>الربح</span><b id="prf">—</b></div>
      <div id="stk" style="font-size:12px;color:var(--t2);margin-top:4px"></div>
    </div>
    <label>الحساب الذي استلم المال<select name="account">${accOpts()}</select></label>`;
  }else if(t==='purchase'){
    h+=`<label>المنتج<select name="product">${opts(prods)}<option value="__new">＋ منتج جديد</option></select></label>
    <label id="newp" style="display:none">اسم المنتج الجديد<input name="newname"></label>
    <div class="row"><label>الكمية<input name="qty" type="number" step="any" min="0" inputmode="decimal" placeholder="160"></label><label>المبلغ المدفوع<input name="amount" type="number" step="any" min="0" inputmode="decimal" placeholder="135"></label></div>
    <div class="total">تكلفة الوحدة: <b id="tot">—</b><span id="stk"></span></div>
    <label>الحساب الذي دُفع منه<select name="account">${accOpts()}</select></label>`;
  }else{
    h+=`<div class="row"><label>من قسم<select name="sector">${opts([['home',SECT.home],['invest',SECT.invest]])}</select></label><label>إلى قسم<select name="toSector">${opts([['invest',SECT.invest],['home',SECT.home]])}</select></label></div>
    <div class="row"><label>من حساب<select name="account">${accOpts()}</select></label><label>إلى حساب<select name="toAccount">${accOpts()}</select></label></div>
    <label>المبلغ<input name="amount" type="number" step="any" min="0" inputmode="decimal"></label>`;
  }
  h+=`<div id="dt" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px;color:var(--t2)"><span>📅 التاريخ: اليوم</span><button type="button" data-date style="background:none;border:0;color:var(--info);font:inherit;font-size:13px;padding:4px">تغيير</button></div>
  <label id="datel" style="display:none">التاريخ<input type="date" name="date" value="${today()}"></label>
  <label>ملاحظة<input name="note"></label><button class="btn">حفظ</button>`;
  $('#form').innerHTML=h;
  if(cur==='sale')fillPrice();
  sync();
}

/* يعبّي سعر البيع الأخير للمنتج تلقائياً */
function fillPrice(){
  const f=$('#form'),p=DB.s.products.find(x=>x.id===f.elements.product.value);
  f.elements.unit.value=p&&p.price>0?p.price:'';
}

function sync(){
  const f=$('#form'),g=n=>f.elements[n];
  if(g('category')&&g('category').tagName==='SELECT'&&g('sector'))g('category').innerHTML=opts((CATS[g('sector').value][cur]||[]).map(c=>[c,c]));
  const p=g('product')?DB.s.products.find(x=>x.id===g('product').value):null;
  if(cur==='sale'&&g('qty')&&g('unit')){
    const q=+g('qty').value||0,u=+g('unit').value||0,cost=p?p.cost:0,profit=(u-cost)*q;
    $('#tot').textContent=fmt(q*u);
    $('#cst').textContent=p?fmt(cost):'منتج جديد (بدون تكلفة)';
    const pr=$('#prf');
    if(q>0&&u>0){pr.textContent=(profit>=0?'+':'')+fmt(profit);pr.className=profit>=0?'pos':'neg'}
    else{pr.textContent='—';pr.className=''}
  }
  if(cur==='purchase'&&g('qty')&&g('amount')){
    const q=+g('qty').value,a=+g('amount').value;
    $('#tot').textContent=q>0&&a>0?fmt(a/q):'—';
  }
  if(g('product')){
    $('#newp').style.display=g('product').value==='__new'?'block':'none';
    $('#stk').textContent=p&&cur==='sale'?`المتوفر في المخزون: ${E.stock(p.id)}`:'';
  }
}

function submitForm(e){
  e.preventDefault();
  const f=$('#form'),v=n=>f.elements[n]?f.elements[n].value:'';
  const t={type:cur,date:v('date')||today(),note:v('note'),account:v('account')};
  const qty=+v('qty'),unit=+v('unit');
  if(cur==='income'){t.sector=v('sector');t.category=v('category');t.amount=+v('amount')}
  else if(cur==='expense'){
    const item=v('category').trim();if(!item)return alert('اكتب اسم الصنف');
    t.sector=v('sector');t.category=item;t.qtyText=v('qtyText').trim();t.amount=+v('amount');
  }
  else if(cur==='transfer'){
    t.sector=v('sector');t.toSector=v('toSector');t.toAccount=v('toAccount');t.amount=+v('amount');
    if(t.sector===t.toSector&&t.account===t.toAccount)return alert('اختر قسمين أو حسابين مختلفين');
  }else{
    t.sector='invest';t.qty=qty;
    if(cur==='sale'){t.unit=unit;t.amount=qty*unit}
    else{t.amount=+v('amount');t.unit=qty>0?t.amount/qty:0}
    if(!(qty>0&&t.amount>0))return alert('أدخل الكمية والسعر');
    let pid=v('product');
    if(pid==='__new'){
      const name=v('newname').trim();if(!name)return alert('اكتب اسم المنتج');
      pid=DB.add('products',{name,cost:cur==='purchase'?t.unit:0,price:cur==='sale'?unit:0,qty0:0,min:0}).id;
    }
    if(!pid)return alert('اختر منتجاً');
    const p=DB.s.products.find(x=>x.id===pid);t.productId=pid;
    if(cur==='sale'){
      if(qty>E.stock(pid))return alert('الكمية أكبر من المخزون المتوفر');
      t.cogs=p.cost*qty;p.price=unit;
    }else p.cost=t.unit;
  }
  if(!(t.amount>0))return alert('أدخل مبلغاً أكبر من صفر');
  DB.add('tx',t);closeSheet();R.render();
}

document.addEventListener('click',e=>{
  if(e.target.id==='fab')return openSheet();
  const c=e.target.closest('[data-type],[data-close],[data-del],[data-date]');
  if(!c)return;
  if(c.dataset.type){cur=c.dataset.type;drawForm()}
  else if('close' in c.dataset)closeSheet();
  else if('date' in c.dataset){$('#dt').style.display='none';$('#datel').style.display='block'}
  else if(c.dataset.del&&confirm('حذف هذه العملية؟ ستتحدث الأرصدة تلقائياً.')){DB.del('tx',c.dataset.del);R.render()}
});
document.addEventListener('input',e=>{if(e.target.closest('#form'))sync()});
document.addEventListener('change',e=>{
  if(!e.target.closest('#form'))return;
  if(cur==='sale'&&e.target.name==='product')fillPrice();
  sync();
});
document.addEventListener('submit',e=>{if(e.target.id==='form')submitForm(e)});