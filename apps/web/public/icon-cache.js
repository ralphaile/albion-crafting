// Keeps each item icon the first time it loads, so later visits load none.
// GitHub Pages lets browsers keep files only 10 minutes, which is why this
// exists. Delete the cache, or change its name, to load every icon again.
const CACHE = "item-icons-v1";

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !/\/icons\/[^/]+\.png$/.test(url.pathname)
  ) {
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached !== undefined) {
        return cached;
      }
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
