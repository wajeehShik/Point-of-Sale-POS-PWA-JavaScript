const R={
  pages:{},
  reg(name,title,fn){this.pages[name]={title,fn}},
  start(){addEventListener('hashchange',()=>this.render());this.render()},
  render(){
    const n=location.hash.replace('#/','')||'dashboard';
    const key=this.pages[n]?n:'dashboard',p=this.pages[key];
    document.getElementById('title').textContent=p.title;
    document.getElementById('view').innerHTML=p.fn();
    document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.p===key));
    scrollTo(0,0);
  }
};