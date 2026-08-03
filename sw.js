/* Service Worker für „Endlich kapiert" — macht die App installierbar
   und offline-tauglich (nur die App selbst wird gecacht, Supabase bleibt live). */
const CACHE = "ek-app-v3";   /* hochzählen, wenn sich der Service Worker ändert */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* ---------- Erinnerungen ----------
   Der Server schickt eine kurze Nachricht, wenn Themen zur Wiederholung
   anstehen. Ohne diesen Teil käme sie nie an. */
self.addEventListener("push", (e) => {
  let daten = {};
  try { daten = e.data ? e.data.json() : {}; } catch (err) { daten = {körper: e.data && e.data.text()}; }
  const titel = daten.titel || "Endlich kapiert";
  e.waitUntil(self.registration.showNotification(titel, {
    body: daten.koerper || daten.körper || "Ein paar Themen warten heute auf dich.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    lang: "de",
    tag: "ek-wiederholung",          // ersetzt eine ältere Erinnerung, statt sie zu stapeln
    data: { pfad: daten.pfad || "/plan" }
  }));
});

/* Tippt jemand auf die Mitteilung: vorhandenes Fenster nach vorn holen,
   sonst die App öffnen — nicht jedes Mal ein neuer Tab. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const ziel = (e.notification.data && e.notification.data.pfad) || "/plan";
  e.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of fenster) {
      if (new URL(f.url).origin === self.location.origin) {
        await f.focus();
        if ("navigate" in f) await f.navigate(ziel);
        return;
      }
    }
    await self.clients.openWindow(ziel);
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
