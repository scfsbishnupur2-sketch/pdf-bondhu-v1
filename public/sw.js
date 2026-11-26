const APP_SHELL_CACHE = 'oneora-shell-v21';
const CDN_CACHE = 'oneora-cdn-v7';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './landing.html',
  './oneora-design-system.css',
  './app.js',
  './i18n.js',
  './pdf-office-pro.js',
  './daily-utilities.js',
  './india-vault.js',
  './oneora-db.js',
  './admob-service.js',
  './oneora-monetization.js',
  './oneora-planner.js',
  './oneora-money.js',
  './oneora-ai-extras.js',
  './oneora-companion.js',
  './oneora-shell.js',
  './oneora-smarthub.js',
  './oneora-onboarding.js',
  './vendor/pdf-lib.min.js',
  './vendor/jszip.min.js',
  './vendor/xlsx.full.min.js',
  './vendor/mammoth.browser.min.js',
  './vendor/jsQR.js',
  './manifest.json',
  './icon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS).catch(() => {})),
      caches.open(CDN_CACHE).then((cache) => cache.addAll(CDN_ASSETS).catch(() => {}))
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const validCaches = [APP_SHELL_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (!validCaches.includes(name)) return caches.delete(name);
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CLEAR_SHELL_CACHE') {
    event.waitUntil(
      caches.delete(APP_SHELL_CACHE).then(() => {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ cleared: true });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Never cache API calls or version.json
  if (isSameOrigin && (url.pathname.startsWith('/api/') || url.pathname.endsWith('version.json'))) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(
        () => new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  if (isSameOrigin) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === 'navigate') {
              return caches.match('./index.html').then((idx) => idx || caches.match('./offline.html'));
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CDN_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
