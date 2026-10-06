const Auth={
  K:'mali_auth_v1',
  cred(){try{return JSON.parse(localStorage.getItem(this.K))}catch(e){return null}},
  async hash(s){
    const str='mali|'+s;
    if(window.crypto&&crypto.subtle){
      const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
      return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
    }
    return 'x'+btoa(unescape(encodeURIComponent(str)));
  },
  isDefault(){return !this.cred()},
  user(){const c=this.cred();return c?c.user:'123'},
  async check(u,p){
    u=(u||'').trim();
    const c=this.cred();
    if(!c)return u==='123'&&p==='123';
    return u===c.user&&(await this.hash(p))===c.ph;
  },
  async save(user,pw){localStorage.setItem(this.K,JSON.stringify({user:user.trim(),ph:await this.hash(pw)}))},

  /* الجلسة تعيش فقط ما دام التطبيق مفتوحاً (لا تُحفظ بعد الإغلاق) */
  ok(){localStorage.removeItem('mali_sess');return sessionStorage.getItem('mali_sess')==='1'},
  login(){sessionStorage.setItem('mali_sess','1')},
  logout(){sessionStorage.removeItem('mali_sess');location.reload()},

  /* القفل التلقائي: 0 فوراً، 1 أو 5 دقائق، -1 أبداً */
  lockMin(){const v=localStorage.getItem('mali_lock');return v===null?0:v==='never'?-1:+v},
  lock(){
    sessionStorage.removeItem('mali_sess');
    if(typeof closeSheet==='function')closeSheet();
    this.bind();
  },
  watch(){
    let t=0;
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){t=Date.now();return}
      if(!t||!this.ok())return;
      const m=this.lockMin(),away=Date.now()-t;
      t=0;
      if(m>=0&&away>=m*600000)this.lock();
    });
  },

  bind(){
    document.body.classList.add('locked');
    const g=id=>document.getElementById(id);
    g('lp').value='';g('lerr').textContent='';
    g('lhint').textContent=this.isDefault()?'أول دخول: اسم المستخدم 123 · كلمة السر 123':'';
    g('leye').onclick=()=>{
      const p=g('lp'),show=p.type==='password';
      p.type=show?'text':'password';
      g('leye').textContent=show?'🙈':'👁';
    };
    g('lform').onsubmit=async e=>{
      e.preventDefault();
      if(await this.check(g('lu').value,g('lp').value)){
        this.login();g('lp').value='';g('lerr').textContent='';start();
      }else{
        g('lerr').textContent='اسم المستخدم أو كلمة السر غير صحيحة';
        g('lp').value='';g('lp').focus();
      }
    };
    if(!Install.mobile)setTimeout(()=>g('lu').focus(),150);
  }
};