const CACHE_NAME = 'eduabsensi-admin-v3';

// Daftar file utama yang akan di-cache
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Menggunakan trik Promise.all dan .catch()
        // Agar jika 1 file gagal ditemukan (404), file yang lain tetap sukses disimpan
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn('PWA Peringatan: File ini gagal di-cache (mungkin tidak ditemukan):', url);
            });
          })
        );
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kembalikan dari cache jika ada, jika tidak ambil dari jaringan (internet)
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
            console.log('Fetch gagal, kemungkinan sedang offline.');
        });
      })
  );
});

// Membersihkan cache versi lama saat update
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});