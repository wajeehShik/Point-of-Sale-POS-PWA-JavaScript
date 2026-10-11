const V='mali-v20';
const FILES=[
  './','index.html','manifest.json','icons/icon.svg','css/style.css',
  'js/main.js',
  'js/core/constants.js','js/core/format.js','js/core/dates.js',
  'js/data/store.js','js/data/prefs.js',
  'js/domain/txTypes.js','js/domain/lookup.js','js/domain/ledger.js','js/domain/inventory.js',
  'js/domain/debts.js','js/domain/period.js','js/domain/search.js','js/domain/analytics.js',
  'js/services/transactions.js','js/services/products.js','js/services/debts.js',
  'js/services/settings.js','js/services/export.js','js/services/auth.js','js/services/install.js',
  'js/ui/dom.js','js/ui/actions.js','js/ui/state.js','js/ui/router.js','js/ui/sheet.js',
  'js/ui/components.js','js/ui/periodBar.js','js/ui/txList.js','js/ui/opsView.js',
  'js/ui/entry.js','js/ui/deleteFlow.js','js/ui/productSheet.js','js/ui/supplierSheet.js',
  'js/ui/login.js','js/ui/install.js',
  'js/ui/forms/fields.js','js/ui/forms/index.js','js/ui/forms/income.js','js/ui/forms/expense.js',
  'js/ui/forms/sale.js','js/ui/forms/purchase.js','js/ui/forms/transfer.js','js/ui/forms/debtpay.js',
  'js/ui/views/productsView.js','js/ui/views/suppliersView.js','js/ui/views/cashFlowView.js','js/ui/views/monthsChart.js',
  'js/ui/pages/dashboard.js','js/ui/pages/home.js','js/ui/pages/invest.js','js/ui/pages/reports.js','js/ui/pages/settings.js',
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.allSettled(FILES.map(f=>c.add(f)))));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==V).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{const copy=r.clone();caches.open(V).then(c=>c.put(e.request,copy));return r})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html')))
  );
});