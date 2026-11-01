const CACHE_NAME = 'stonelight-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
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
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});

