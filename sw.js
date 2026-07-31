const CACHE_NAME = 'festmap-v3';
const ASSETS = [
    './',
    './index.html',
    './map.html',
    './calendario.html',
    './css/style.css',
    './js/app.js',
    './js/index.js',
    './js/data-fetcher.js',
    './js/ui-components.js',
    './images/food.webp',
    './images/folk.webp',
    './images/comics.webp',
    './images/wild.webp'
];

// Installazione e cache delle risorse
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Attivazione e pulizia vecchie cache
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // CORRETTO: clients.claim() con il punto
    return self.clients.claim();
});

// Recupero risorse (offline-first)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});