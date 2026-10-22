// BTU Studio service worker: network-first (fresh code when online), cache fallback (offline).
// Bump CACHE whenever a precached file changes; old caches are deleted on activate.
const CACHE = 'btu-v10-materials';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './feedback.js?v=3', './feedback.css?v=3', './theme.js?v=1', './theme.css?v=3', './materials.js?v=1',
  './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => {
      // exact URL first, then ignore ?v= differences, then the app shell for navigations
      return (await caches.match(req)) || (await caches.match(req, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    })
  );
});
