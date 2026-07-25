const CACHE_NAME = 'eduabsensi-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './asset/logoapp.png',
    './asset/logoweb.png',
    './asset/favicon.png'
];

// Install Service Worker (Dengan Error Handling)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('Mulai melakukan caching aset...');
            for (let asset of ASSETS_TO_CACHE) {
                try {
                    await cache.add(asset);
                } catch (error) {
                    // Jika ada 1 file yang gagal/tidak ditemukan, error hanya dicatat
                    // namun instalasi Service Worker (PWA) akan tetap dilanjutkan
                    console.warn(`[PWA] Gagal meng-cache file: ${asset}`, error);
                }
            }
        })
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Assets
self.addEventListener('fetch', (event) => {
    // Jalankan request API/POST langsung ke network (tanpa cache)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});