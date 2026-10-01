// Offline start: cache the app shell on install, serve from cache, refresh in the background.
const CACHE = "napkin-v13";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./drills.js", "./core.js", "./interview.js", "./finance.js", "./store.js", "./progress.js", "./sync.js", "./config.js", "./families.js", "./lessons.js", "./quick2.js", "./quant.js", "./priorities.js", "./levels.js", "./diagnostic.js", "./runs.js", "./router.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; }).catch(() => cached);
      return cached || fresh;
    })
  );
});
