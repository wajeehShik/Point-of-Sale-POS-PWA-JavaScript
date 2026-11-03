const CACHE_NAME = 'mali-offline-v24';

const APP_FILES = [
  './',
  'index.html',
  'manifest.json',
  'manifest.txt',
  'icons/icon.svg',
  'css/style.css',

  'js/main.js',

  // Core
  'js/core/constants.js',
  'js/core/dates.js',
  'js/core/format.js',

  // Data
  'js/data/prefs.js',
  'js/data/store.js',

  // Domain
  'js/domain/analytics.js',
  'js/domain/debts.js',
  'js/domain/inventory.js',
  'js/domain/ledger.js',
  'js/domain/lookup.js',
  'js/domain/period.js',
  'js/domain/search.js',
  'js/domain/txTypes.js',

  // Pages
  'js/pages/dashboard.js',
  'js/pages/invest.js',

  // Services
  'js/services/auth.js',
  'js/services/autobackup.js',
  'js/services/dailyBackup.js',
  'js/services/debts.js',
  'js/services/export.js',
  'js/services/install.js',
  'js/services/products.js',
  'js/services/settings.js',
  'js/services/transactions.js',

  // UI
  'js/ui/actions.js',
  'js/ui/backupSettings.js',
  'js/ui/components.js',
  'js/ui/deleteFlow.js',
  'js/ui/dom.js',
  'js/ui/entry.js',
  'js/ui/install.js',
  'js/ui/login.js',
  'js/ui/opsView.js',
  'js/ui/periodBar.js',
  'js/ui/productSheet.js',
  'js/ui/router.js',
  'js/ui/sheet.js',
  'js/ui/state.js',
  'js/ui/supplierSheet.js',
  'js/ui/txList.js',

  // UI forms
  'js/ui/forms/debtpay.js',
  'js/ui/forms/expense.js',
  'js/ui/forms/fields.js',
  'js/ui/forms/income.js',
  'js/ui/forms/index.js',
  'js/ui/forms/purchase.js',
  'js/ui/forms/sale.js',
  'js/ui/forms/transfer.js',

  // UI pages
  'js/ui/pages/dashboard.js',
  'js/ui/pages/expenses.js',
  'js/ui/pages/home.js',
  'js/ui/pages/invest.js',
  'js/ui/pages/reports.js',
  'js/ui/pages/sales.js',
  'js/ui/pages/settings.js',

  // UI views
  'js/ui/views/cashFlowView.js',
  'js/ui/views/monthsChart.js',
  'js/ui/views/productsView.js',
  'js/ui/views/suppliersView.js',
];

function appUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // إذا تعذّر حفظ ملف أساسي، يفشل التثبيت بدل إخفاء المشكلة.
    await cache.addAll(APP_FILES.map(appUrl));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // لا نتعامل مع POST أو غيره؛ نتركه للمتصفح.
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);

  // لا نعترض طلبات مواقع أو نطاقات أخرى.
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        const cachedPage = await caches.match(request);
        if (cachedPage) return cachedPage;

        const cachedIndex = await caches.match(appUrl('index.html'));
        if (cachedIndex) return cachedIndex;

        return new Response(
          'التطبيق غير محفوظ على هذا الجهاز بعد. افتحه مرة واحدة مع الإنترنت ثم أعد المحاولة.',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        );
      }
    })());

    return;
  }

  // للملفات مثل JavaScript وCSS والصور: الكاش أولًا.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    } catch {
      return new Response('هذا الملف غير متوفر دون اتصال.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
