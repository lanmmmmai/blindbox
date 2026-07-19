// Tăng phiên bản khi thay đổi tài nguyên tĩnh để client không giữ lại
// CSS/JS cũ từ Service Worker.
const CACHE_NAME = "tui-mu-bi-mat-v11";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/constants.js",
  "./js/app.js",
  "./js/router.js",
  "./js/storage.js",
  "./js/game-state.js",
  "./js/pwa.js",
  "./js/ui.js",
  "./manifest.json",
  "./offline.html",
  "./assets/icons/icon.svg"
];

// Cài đặt và cache tài nguyên tĩnh
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt SW và xóa cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Chiến lược Fetch: Cache First cho tài nguyên tĩnh, Network First cho phần còn lại
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore network errors offline */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        const url = new URL(event.request.url);
        if (networkResponse.status === 200 && (
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.svg') ||
          url.pathname.includes('/fonts/') ||
          url.pathname.includes('font-awesome')
        )) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.headers.get("accept").includes("text/html")) {
          return caches.match("./offline.html");
        }
      });
    })
  );
});
