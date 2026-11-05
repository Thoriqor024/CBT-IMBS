const CACHE_NAME = 'cbt-imbs-shell-v2';
const SHELL_URLS = [
  '/',
  '/index.html',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan sentuh atau cache request API atau non-GET
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Untuk navigasi dokumen (HTML): NETWORK-FIRST agar selalu mendapat index.html terbaru dengan hash asset yang benar
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Ketika offline, gunakan cache index.html
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/index.html') || await caches.match('/');
          if (rootCached) return rootCached;
          return new Response('Offline - IMBS CBT', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Untuk aset statis (js, css, images, fonts):
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached, tapi update di background jika status 200
        fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});
