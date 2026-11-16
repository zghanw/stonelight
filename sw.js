const CACHE_NAME = 'stonelight-v5';
const ASSETS = [
  './',
  './index.html',
  './app.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './css/base.css',
  './css/landing.css',
  './css/app.css',
  './js/landing.js',
  './js/relight.js',
  './js/shadowmap.js',
  './js/transcribe.js',
  './js/guide.js',
  './js/app.js',
  './sample/flash.jpg',
  './sample/torch_12.jpg',
  './sample/torch_2.jpg',
  './sample/torch_3.jpg',
  './sample/torch_5.jpg',
  './sample/torch_6.jpg',
  './sample/torch_8.jpg',
  './sample/torch_9.jpg',
  './sample/torch_11.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then((res) => res || caches.match('./index.html'));
      })
  );
});

