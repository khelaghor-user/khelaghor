/* আমার খেলাঘর — Service Worker v14 */
const CACHE='khelaghor-v14';
const ASSETS=['./','./khelaghor-football-only.html'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // API calls: network first, fallback cache
  if(url.hostname.includes('bzzoiro.com')||url.hostname.includes('cricapi')){
    e.respondWith(
      fetch(e.request).then(r=>{
        const clone=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{});
        return r;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }
  // App shell: cache first
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
      const clone=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{});
      return r;
    }).catch(()=>caches.match('./khelaghor-football-only.html')))
  );
});
