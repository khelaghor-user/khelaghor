/* ================================================================
   আমার খেলাঘর — Service Worker
   PWA + Offline Cache
   ================================================================ */

const CACHE_NAME = 'khelaghor-v1';
const RUNTIME_CACHE = 'khelaghor-runtime-v1';

/* Static assets — install এর সময় cache হবে */
const STATIC_ASSETS = [
  './',
  './index.html',
];

/* Install — static files cache */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

/* Activate — পুরনো cache clear */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

/* Fetch strategy */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* GET ছাড়া কিছু নেই */
  if(req.method !== 'GET') return;

  /* API calls — network first, fail হলে cache থেকে */
  if(url.hostname.includes('bzairo') ||
     url.hostname.includes('bzzoiro') ||
     url.hostname.includes('cricapi') ||
     url.hostname.includes('rapidapi') ||
     url.hostname.includes('fotmob')) {

    event.respondWith(
      fetch(req).then((res) => {
        /* সফল হলে কপি করে runtime cache-এ রাখি */
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        /* Network fail — cache থেকে */
        return caches.match(req).then((cached) => {
          if(cached) return cached;
          /* কিছু না পেলে একটা খালি JSON response */
          return new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  /* Images (logo) — cache first */
  if(req.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if(cached) return cached;
        return fetch(req).then((res) => {
          if(res && res.status === 200){
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  /* HTML / CSS / JS / fonts — cache first, network fallback */
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if(res && res.status === 200 && (url.origin === self.location.origin)){
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

/* Notification click — অ্যাপ খুলবে */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for(const c of list){
        if(c.url.includes(self.location.origin) && 'focus' in c){
          return c.focus();
        }
      }
      if(clients.openWindow){
        return clients.openWindow('/');
      }
    })
  );
});

/* Message — skipWaiting activate */
self.addEventListener('message', (event) => {
  if(event.data === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
