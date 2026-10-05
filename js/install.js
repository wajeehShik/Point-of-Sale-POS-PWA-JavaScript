const Install={
  ev:null,
  ios:/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),
  mobile:/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent),
  standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true},
  dismissed(){return Date.now()-(+localStorage.getItem('mali_inst')||0)<3*864e5},
  show(){return !this.standalone()&&(!!this.ev||this.mobile||this.ios)&&!this.dismissed()},
  render(){
    const html=this.show()?`<div class="inst"><span class="ii">📲</span><div class="it"><b>ثبّت التطبيق على جوالك</b><span>بيفتح مثل أي تطبيق وبشتغل بدون إنترنت</span></div><button class="ib" onclick="Install.go()">${this.ev?'تثبيت':'كيف؟'}</button><button class="ix" onclick="Install.dismiss()" aria-label="إغلاق">✕</button></div>`:'';
    document.querySelectorAll('.instbox').forEach(el=>el.innerHTML=html);
  },
  async go(){
    if(this.ev){
      this.ev.prompt();
      try{await this.ev.userChoice}catch(e){}
      this.ev=null;this.render();return;
    }
    this.help();
  },
  dismiss(){localStorage.setItem('mali_inst',Date.now());this.render()},
  help(){
    let m=document.getElementById('ihelp');
    if(!m){m=document.createElement('div');m.id='ihelp';document.body.appendChild(m)}
    const steps=this.ios
      ?['افتح الموقع من متصفح <b>Safari</b>','اضغط زر <b>المشاركة</b> ⬆️ أسفل الشاشة','اختر <b>«إضافة إلى الشاشة الرئيسية»</b>','اضغط <b>«إضافة»</b> وبيطلع التطبيق عندك']
      :['اضغط على <b>⋮</b> أعلى المتصفح','اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>','اضغط <b>«تثبيت»</b> وبيطلع التطبيق عندك'];
    m.innerHTML=`<div class="back" onclick="document.getElementById('ihelp').className=''"></div><div class="ipanel"><h3>📲 كيف أثبّت التطبيق؟</h3><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol><button class="btn" onclick="document.getElementById('ihelp').className=''">تمام</button></div>`;
    m.className='open';
  }
};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();Install.ev=e;Install.render()});
addEventListener('appinstalled',()=>{Install.ev=null;Install.render()});
document.addEventListener('DOMContentLoaded',()=>Install.render());