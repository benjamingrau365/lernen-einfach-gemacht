/* Service Worker für „Endlich kapiert" — macht die App installierbar
   und offline-tauglich (nur die App selbst wird gecacht, Supabase bleibt live). */
const CACHE = "ek-app-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                 // keine Schreib-/Auth-Requests cachen
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // Supabase & Co. immer live aus dem Netz
  e.respondWith((async () => {
    try {
      const netz = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, netz.clone());
      return netz;
    } catch (err) {
      const treffer = await caches.match(req);
      return treffer || Response.error();
    }
  })());
});
