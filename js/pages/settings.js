R.reg('settings','الإعدادات',()=>`
  ${Auth.isDefault()?'<div class="warnbox">⚠️ ما زلت تستخدم بيانات الدخول الافتراضية (123). يفضّل تغييرها.</div>':''}

  <h3>🔒 قفل التطبيق</h3>
  <div class="card">
    <label>اطلب تسجيل الدخول مجدداً
      <select onchange="setLock(this.value)">${[['0','فوراً عند الخروج من التطبيق'],['1','بعد دقيقة من الخروج'],['5','بعد 5 دقائق من الخروج'],['never','فقط عند فتح التطبيق من جديد']].map(([v,l])=>`<option value="${v}"${(Auth.lockMin()<0?'never':String(Auth.lockMin()))===v?' selected':''}>${l}</option>`).join('')}</select>
    </label>
    <div style="font-size:12px;color:var(--t2)">في كل الحالات التطبيق بيطلب الدخول كل ما تفتحه من جديد.</div>
  </div>

  <h3>🗓️ بداية الشهر المالي</h3>
  <div class="card">
    <label>يوم بداية الشهر
      <select onchange="setCycle(this.value)">${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}"${(DB.s.cycleDay||1)===d?' selected':''}>${d===1?'1 (الشهر العادي)':d}</option>`).join('')}</select>
    </label>
    <div style="font-size:12px;color:var(--t2)">إذا بتستلم راتبك يوم 20 اختر 20، وبيظهر بفلتر الفترة «الدورة الحالية» (من 20 لـ19 من الشهر الجاي).</div>
  </div>

  <h3>🔐 بيانات الدخول</h3>
  <div class="card">
    <label>اسم المستخدم<input id="cu" value="${esc(Auth.user())}" autocomplete="off" autocapitalize="off"></label>
    <label>كلمة السر الحالية<input id="cp" type="password" autocomplete="current-password"></label>
    <label>كلمة سر جديدة (اتركها فاضية إذا ما بدك تغيّرها)<input id="np" type="password" autocomplete="new-password"></label>
    <button class="btn" onclick="saveCred()">حفظ التغييرات</button>
    <button class="btn alt" onclick="Auth.logout()">تسجيل الخروج</button>
  </div>

  <h3>📲 التطبيق</h3>
  ${Install.standalone()?'<div class="okbox">✅ التطبيق مثبّت على جهازك</div>':'<button class="btn" onclick="Install.go()">تثبيت التطبيق على الجوال</button>'}

  <h3>المحافظ</h3>
  <div class="list">${DB.s.accounts.map(a=>`<div class="stat"><span>${esc(a.name)}</span></div>`).join('')}</div>
  <button class="btn alt" onclick="addAcc()">＋ إضافة محفظة</button>

  <h3>النسخ الاحتياطي</h3>
  <div class="card" style="font-size:13px;color:var(--t2);margin-bottom:8px">بياناتك محفوظة على هذا الجهاز وهذا المتصفح فقط. لنقلها لجهاز ثاني: صدّر نسخة من هنا ثم استعدها هناك.</div>
  <button class="btn" onclick="exportData()">تصدير نسخة JSON</button>
  <button class="btn alt" onclick="document.getElementById('imp').click()">استعادة نسخة</button>
  <input type="file" id="imp" accept=".json" hidden onchange="importData(this.files[0])">

  <h3>تفريغ البيانات</h3>
  <button class="btn alt" onclick="clearTx()">حذف العمليات فقط (${DB.s.tx.length})</button>
  <button class="btn danger" style="margin-top:8px" onclick="resetAll()">حذف كل شيء</button>`);

function setLock(v){localStorage.setItem('mali_lock',v);toast('تم حفظ إعداد القفل ✓')}
function setCycle(v){
  DB.s.cycleDay=+v;DB.save();
  if(+v===1){if(PER.v==='c0'||PER.v==='c1'){PER.v='';localStorage.setItem('mali_per','')}}
  else{PER.v='c0';localStorage.setItem('mali_per','c0')}
  R.render();toast('تم حفظ بداية الشهر المالي ✓');
}
async function saveCred(){
  const cu=$('#cu').value.trim(),cp=$('#cp').value,np=$('#np').value;
  if(!(await Auth.check(Auth.user(),cp)))return toast('كلمة السر الحالية غير صحيحة',1);
  if(!cu)return toast('اكتب اسم المستخدم',1);
  if(np&&np.length<3)return toast('كلمة السر الجديدة قصيرة (3 أحرف على الأقل)',1);
  await Auth.save(cu,np||cp);
  R.render();toast('تم حفظ بيانات الدخول ✓');
}
function addAcc(){
  const n=(prompt('اسم المحفظة')||'').trim();
  if(n){DB.add('accounts',{name:n});R.render();toast('تمت إضافة المحفظة ✓')}
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
  if(!confirm('سيتم حذف كل العمليات، وتبقى المحافظ والمنتجات (المخزون يصير 0). يفضّل تصدير نسخة قبلها. متأكد؟'))return;
  DB.s.tx=[];DB.save();R.render();toast('تم حذف العمليات');
}
function resetAll(){
  if(!confirm('سيتم حذف كل البيانات نهائياً (عمليات ومحافظ ومنتجات). متأكد؟'))return;
  DB.reset();R.render();toast('تم حذف كل البيانات');
}