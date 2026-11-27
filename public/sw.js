const APP_SHELL_CACHE = 'oneora-shell-v27';
const CDN_CACHE = 'oneora-cdn-v7';
const SHARE_TARGET_CACHE = 'oneora-share-target-v1';

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
  './pastel-tool-template.js',
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
  const validCaches = [APP_SHELL_CACHE, CDN_CACHE, SHARE_TARGET_CACHE];
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
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Handle "Open with ONEORA" PWA Share Target POST
  if (isSameOrigin && request.method === 'POST' && url.searchParams.get('share_target') === '1') {
    event.respondWith(
      (async () => {
        try {
          const formData = await request.formData();
          const cache = await caches.open(SHARE_TARGET_CACHE);
          const existingKeys = await cache.keys();
          await Promise.all(existingKeys.map((k) => cache.delete(k)));

          const sharedFiles = formData.getAll('shared_files').filter((f) => f && typeof f.arrayBuffer === 'function');
          const fileMeta = [];
          for (let i = 0; i < sharedFiles.length; i++) {
            const file = sharedFiles[i];
            const key = `./__oneora_shared_file_${i}`;
            const buf = await file.arrayBuffer();
            await cache.put(
              key,
              new Response(buf, {
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                  'X-File-Name': encodeURIComponent(file.name || `shared_${i + 1}`)
                }
              })
            );
            fileMeta.push({ key, name: file.name || `shared_${i + 1}`, type: file.type || 'application/octet-stream' });
          }

          await cache.put(
            './__oneora_shared_meta.json',
            new Response(
              JSON.stringify({
                title: String(formData.get('title') || ''),
                text: String(formData.get('text') || ''),
                url: String(formData.get('url') || ''),
                files: fileMeta,
                receivedAt: Date.now()
              }),
              { headers: { 'Content-Type': 'application/json' } }
            )
          );
        } catch (err) {
          console.warn('Share target cache error:', err);
        }
        return Response.redirect('./?shared=1', 303);
      })()
    );
    return;
  }

  if (request.method !== 'GET') return;

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
