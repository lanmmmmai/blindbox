// Tăng phiên bản khi thay đổi tài nguyên tĩnh để client không giữ lại
// CSS/JS cũ từ Service Worker.
const CACHE_NAME = "tui-mu-bi-mat-v19";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/kawaii-theme.css",
  "./js/constants.js",
  "./js/app.js",
  "./js/router.js",
  "./js/storage.js",
  "./js/firebase-config.js",
  "./js/firebase-auth.js",
  "./js/firebase-connection-test.js",
  "./js/firebase-functions.js",
  "./js/firebase-room-service.js",
  "./js/firebase-realtime.js",
  "./js/online-game.js",
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
  const request = event.request;
  const url = new URL(request.url);

  // Service Worker không được can thiệp vào callable POST hay Firebase APIs.
  if (request.method !== "GET") return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  const isFirebaseRequest = url.hostname.includes("cloudfunctions.net") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firebaseapp.com");
  if (isFirebaseRequest) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse.ok && networkResponse.type === "basic") {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {/* Ignore network errors offline */});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok && networkResponse.type === "basic" && (
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.svg') ||
          url.pathname.includes('/fonts/') ||
          url.pathname.includes('font-awesome')
        )) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
        }
        return networkResponse;
      }).catch(() => {
        if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
          return caches.match("./offline.html").then(response => response || new Response("Ứng dụng đang ngoại tuyến.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
        }
        return new Response("Không thể tải tài nguyên khi ngoại tuyến.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      });
    })
  );
});
