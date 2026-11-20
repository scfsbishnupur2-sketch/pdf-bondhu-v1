const APP_SHELL_CACHE = 'pdf-bondhu-shell-v7';
const CDN_CACHE = 'pdf-bondhu-cdn-v3';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS).catch(() => {})),
      caches.open(CDN_CACHE).then((cache) => cache.addAll(CDN_ASSETS).catch(() => {}))
    ])
  );
  // Activate immediately so published updates roll out to Android WebView & PWAs right away
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const validCaches = [APP_SHELL_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (!validCaches.includes(name)) {
            return caches.delete(name);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Network-First for same-origin app shell (index.html, app.js, manifest.json)
  // Guarantees every AI Studio Publish auto-updates installed Android APKs on next launch,
  // while falling back seamlessly to offline cache when disconnected.
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
              return caches.match('./index.html') || caches.match('./');
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          })
        )
    );
    return;
  }

  // Cache-First with background refresh for external CDN libraries (PDF-lib, PDF.js, XLSX, OpenCV, Tesseract)
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
