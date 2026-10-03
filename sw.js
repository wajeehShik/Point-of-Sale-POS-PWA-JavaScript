const V='mali-v2';
const FILES=['./','index.html','manifest.json','icons/icon.svg','css/style.css','js/db.js','js/engine.js','js/router.js','js/app.js','js/pages/dashboard.js','js/pages/home.js','js/pages/invest.js','js/pages/reports.js','js/pages/settings.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});