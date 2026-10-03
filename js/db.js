const DB={
  s:null,key:'mali_v1',
  load(){
    try{this.s=JSON.parse(localStorage.getItem(this.key))}catch(e){}
    if(!this.s)this.s={
      accounts:[{id:'a1',name:'جوال Pay'},{id:'a2',name:'PalPay'},{id:'a3',name:'بنك فلسطين'},{id:'a4',name:'كاش'}],
      products:[],tx:[]
    };
  },
  save(){localStorage.setItem(this.key,JSON.stringify(this.s))},
  id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)},
  add(col,o){o.id=this.id();this.s[col].push(o);this.save();return o},
  del(col,id){this.s[col]=this.s[col].filter(x=>x.id!==id);this.save()},
  export(){return JSON.stringify(this.s,null,1)},
  import(text){const o=JSON.parse(text);if(!o.tx||!o.accounts)throw new Error('bad');this.s=o;this.save()},
  reset(){localStorage.removeItem(this.key);this.load()}
};