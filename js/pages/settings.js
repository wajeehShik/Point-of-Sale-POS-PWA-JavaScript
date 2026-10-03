R.reg('settings','الإعدادات',()=>`
  <h3>الحسابات المالية</h3>
  <div class="list">${DB.s.accounts.map(a=>`<div class="stat"><span>${esc(a.name)}</span></div>`).join('')}</div>
  <button class="btn alt" onclick="addAcc()">＋ إضافة حساب</button>

  <h3>النسخ الاحتياطي</h3>
  <div class="card" style="font-size:13px;color:var(--t2);margin-bottom:8px">بياناتك محفوظة على هذا الجهاز وهذا المتصفح فقط. لنقلها لجهاز ثاني: صدّر نسخة من هنا ثم استعدها هناك.</div>
  <button class="btn" onclick="exportData()">تصدير نسخة JSON</button>
  <button class="btn alt" onclick="document.getElementById('imp').click()">استعادة نسخة</button>
  <input type="file" id="imp" accept=".json" hidden onchange="importData(this.files[0])">

  <h3>تفريغ البيانات</h3>
  <button class="btn alt" onclick="clearTx()">حذف العمليات فقط (${DB.s.tx.length})</button>
  <button class="btn danger" style="margin-top:8px" onclick="resetAll()">حذف كل شيء</button>`);

function addAcc(){
  const n=(prompt('اسم الحساب')||'').trim();
  if(n){DB.add('accounts',{name:n});R.render();toast('تمت إضافة الحساب ✓')}
}
function exportData(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([DB.export()],{type:'application/json'}));
  a.download='mali-backup-'+today()+'.json';a.click();
}
function importData(f){
  if(!f)return;const r=new FileReader();
  r.onload=()=>{try{DB.import(r.result);R.render();toast('تمت الاستعادة ✓')}catch(e){toast('الملف غير صالح',1)}};
  r.readAsText(f);
}
function clearTx(){
  if(!confirm('سيتم حذف كل العمليات، وتبقى الحسابات والمنتجات (المخزون يصير 0). يفضّل تصدير نسخة قبلها. متأكد؟'))return;
  DB.s.tx=[];DB.save();R.render();toast('تم حذف العمليات');
}
function resetAll(){
  if(!confirm('سيتم حذف كل البيانات نهائياً (عمليات وحسابات ومنتجات). متأكد؟'))return;
  DB.reset();R.render();toast('تم حذف كل البيانات');
}