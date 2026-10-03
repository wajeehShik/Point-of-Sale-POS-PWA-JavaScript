R.reg('settings','الإعدادات',()=>`
  <h3>الحسابات المالية</h3>
  <div class="list">${DB.s.accounts.map(a=>`<div class="stat"><span>${esc(a.name)}</span></div>`).join('')}</div>
  <button class="btn alt" onclick="addAcc()">＋ إضافة حساب</button>
  <h3>النسخ الاحتياطي</h3>
  <button class="btn" onclick="exportData()">تصدير نسخة JSON</button>
  <button class="btn alt" onclick="document.getElementById('imp').click()">استعادة نسخة</button>
  <input type="file" id="imp" accept=".json" hidden onchange="importData(this.files[0])">
  <h3>منطقة الخطر</h3>
  <button class="btn danger" onclick="resetAll()">حذف كل البيانات</button>`);
function addAcc(){const n=(prompt('اسم الحساب')||'').trim();if(n){DB.add('accounts',{name:n});R.render()}}
function exportData(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([DB.export()],{type:'application/json'}));
  a.download='mali-backup-'+today()+'.json';a.click();
}
function importData(f){
  if(!f)return;const r=new FileReader();
  r.onload=()=>{try{DB.import(r.result);R.render();alert('تمت الاستعادة')}catch(e){alert('الملف غير صالح')}};
  r.readAsText(f);
}
function resetAll(){if(confirm('سيتم حذف كل البيانات نهائياً. متأكد؟')){DB.reset();R.render()}}