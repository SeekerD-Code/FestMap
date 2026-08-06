const CACHE_NAME = 'festmap-v4';
const ASSETS = [
    './',
    './index.html',
    './elenco.html',
    './calendario.html',
    './contatti.html',
    './dati-evento.html',
    './mappa-preferiti.html',
    './preferiti.html',
    './manifest.json',
    './favicon.ico',
    './css/style.css',
    './css/style-menu.css',
    './css/style-pc.css',
    './css/Style-SplashScreen.css',
    './js/animazione_pin.js',
    './js/app.js',
    './js/calendario.js',
    './js/data-fetcher.js',
    './js/filters-utils.js',
    './js/header-component.js',
    './js/index.js',
    './js/map-preferiti.js',
    './js/map.js',
    './js/preferiti-handler.js',
    './js/preferiti.js',
    './js/ui-components.js',
    './images/food.webp',
    './images/folk.webp',
    './images/comics.webp',
    './images/wild.webp',
    './images/Italia.webp',
    './images/logo FM.png'
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
    return self.clients.claim();
});

// Recupero risorse (offline-first)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});