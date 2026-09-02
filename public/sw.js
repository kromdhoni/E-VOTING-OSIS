const CACHE='osis-v1';
const ASSETS=['/E-VOTING-OSIS/','/E-VOTING-OSIS/index.html','/E-VOTING-OSIS/vote.html'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>r))); });
