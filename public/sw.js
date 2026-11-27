const APP_SHELL_CACHE = 'oneora-shell-v36';
const VENDOR_CACHE = 'oneora-vendor-v1';
const SHARE_TARGET_CACHE = 'oneora-share-target-v1';

// 100% Local App Shell Assets (ZERO External CDNs, ZERO External Fonts)
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './landing.html',
  './oneora-compat.js',
  './oneora-design-system.css',
  './vendor/cropper.min.css',
  './fonts/plus-jakarta-sans-400.woff2',
  './fonts/plus-jakarta-sans-500.woff2',
  './fonts/plus-jakarta-sans-600.woff2',
  './fonts/plus-jakarta-sans-700.woff2',
  './fonts/plus-jakarta-sans-800.woff2',
  './app.js',
  './i18n.js',
  './pdf-office-pro.js',
  './oneora-universal-reader.js',
  './scanner-worker.js',
  './daily-utilities.js',
  './india-vault.js',
  './pastel-tool-template.js',
  './oneora-db.js',
  './admob-service.js',
  './oneora-monetization.js',
  './oneora-planner.js',
  './oneora-money.js',
  './oneora-khata.js',
  './oneora-fin-calculators.js',
  './oneora-social-tools.js',
  './oneora-voice-helper.js',
  './oneora-office-pro.js',
  './oneora-utilities-safety.js',
  './oneora-ai-extras.js',
  './oneora-companion.js',
  './oneora-shell.js',
  './oneora-smarthub.js',
  './oneora-onboarding.js',
  './oneora-profile.js',
  './manifest.json',
  './icon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png'
];

// Resilient per-asset precaching so one missing/transient file NEVER fails Service Worker install
async function safePrecache(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) {
          await cache.put(url, res);
        }
      } catch (e) {
        // Ignore single-asset errors so install still succeeds cleanly
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(safePrecache(APP_SHELL_CACHE, APP_SHELL_ASSETS));
  // Controlled update: do NOT call skipWaiting() here when an active worker exists.
  // oneora-compat.js prompts the user with "New ONEORA update ready -> Refresh" and sends SKIP_WAITING.
});

self.addEventListener('activate', (event) => {
  const validCaches = [APP_SHELL_CACHE, VENDOR_CACHE, SHARE_TARGET_CACHE];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (validCaches.indexOf(name) === -1) return caches.delete(name);
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_SHELL_CACHE') {
    event.waitUntil(
      Promise.all([caches.delete(APP_SHELL_CACHE), caches.delete(VENDOR_CACHE)]).then(() => {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ cleared: true });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
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
            const key = './__oneora_shared_file_' + i;
            const buf = await file.arrayBuffer();
            await cache.put(
              key,
              new Response(buf, {
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                  'X-File-Name': encodeURIComponent(file.name || ('shared_' + (i + 1)))
                }
              })
            );
            fileMeta.push({ key: key, name: file.name || ('shared_' + (i + 1)), type: file.type || 'application/octet-stream' });
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
  if (isSameOrigin && (url.pathname.indexOf('/api/') === 0 || url.pathname.slice(-12) === 'version.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(
        () => new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Lazy-loaded local vendor engines & fonts: Cache-First so once opened they load instantaneously offline
  if (isSameOrigin && (url.pathname.indexOf('/vendor/') !== -1 || url.pathname.indexOf('/fonts/') !== -1)) {
    event.respondWith(
      caches.open(VENDOR_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
        })
      )
    );
    return;
  }

  // Same-origin App Shell & Vite assets: Network-First with Cache Fallback
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
});
