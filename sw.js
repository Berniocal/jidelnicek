const CACHE = "jidelnicek-v8";

// věci, které chceme mít i offline hned po instalaci
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

function isHTML(request) {
  return request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
}

function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; }
  catch { return false; }
}

// Network-first pro HTML (index, navigace) → vždy aktuální, offline fallback na cache
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

// Stale-while-revalidate pro statické soubory (rychlé + tichá aktualizace)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((fresh) => {
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  }).catch(() => null);

  return cached || (await fetchPromise) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // jen GET a jen vlastní origin
  if (req.method !== "GET") return;
  if (!sameOrigin(req)) return;

  // HTML a navigace → network-first
  if (isHTML(req)) {
    e.respondWith(networkFirst(req));
    return;
  }

  // ostatní statika → stale-while-revalidate
  e.respondWith(staleWhileRevalidate(req));
});
