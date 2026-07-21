/* =====================================================================
   Billy Ledger App – Serviceworker (gehostete iPhone-/PWA-Variante)
   Branding by HWG.Tech
   Legt die App und die Programmbibliotheken im Browser-Cache ab, damit
   die App auch OHNE Internet startet (nach dem ersten erfolgreichen Laden).
   Bei neuer Version unten CACHE hochzählen – der alte Cache wird dann
   automatisch verworfen.
   ===================================================================== */
const CACHE = "billy-ledger-9cd1b8f8-2.3.0";

// App-Gerüst + CDN-Bibliotheken (Versionen wie in der index.html!)
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];
// werksdaten.js wird bewusst NICHT vorab geladen (optional/kundenspezifisch),
// aber beim ersten Abruf automatisch mitgecacht.

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Einzeln laden, damit ein fehlendes CDN-File die Installation nicht killt.
    await Promise.allSettled(DATEIEN.map((u) => c.add(new Request(u, { cache: "reload" }))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("billy-ledger-9cd1b8f8-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function ausNetzUndCachen(req) {
  const res = await fetch(req);
  try {
    if (res && (res.ok || res.type === "opaque")) {
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
    }
  } catch (e) { /* Cache-Fehler ignorieren */ }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: false });
    if (cached) {
      // Im Hintergrund auffrischen (stale-while-revalidate)
      e.waitUntil(ausNetzUndCachen(req).catch(() => {}));
      return cached;
    }
    try {
      return await ausNetzUndCachen(req);
    } catch (err) {
      // Offline und nichts im Cache: bei Seitenaufrufen die App zeigen
      if (req.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
