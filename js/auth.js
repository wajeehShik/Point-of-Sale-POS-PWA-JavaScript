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
  ok(){return localStorage.getItem('mali_sess')==='1'||sessionStorage.getItem('mali_sess')==='1'},
  login(remember){(remember?localStorage:sessionStorage).setItem('mali_sess','1')},
  logout(){localStorage.removeItem('mali_sess');sessionStorage.removeItem('mali_sess');location.reload()},
  bind(){
    document.body.classList.add('locked');
    const g=id=>document.getElementById(id);
    g('lhint').textContent=this.isDefault()?'للدخول لأول مرة: اسم المستخدم 123 وكلمة السر 123':'';
    g('lform').onsubmit=async e=>{
      e.preventDefault();
      if(await this.check(g('lu').value,g('lp').value)){
        this.login(g('lr').checked);g('lp').value='';g('lerr').textContent='';start();
      }else{
        g('lerr').textContent='اسم المستخدم أو كلمة السر غير صحيحة';
        g('lp').value='';g('lp').focus();
      }
    };
    setTimeout(()=>g('lu').focus(),150);
  }
};