const CACHE = "kinsight-shell-v1";
const SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/kin-logo.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("kinsight-shell-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname === "/api" || url.pathname.startsWith("/api/")) return;
  const asset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/media/") || SHELL.slice(1).includes(url.pathname);
  if (!asset && request.mode !== "navigate") return;
  const refresh = caches.open(CACHE).then(async (cache) => {
    const response = await fetch(request);
    if (response.ok && response.type === "basic" && !response.headers.get("cache-control")?.includes("no-store")) await cache.put(request, response.clone());
    return response;
  });
  // Always observe a background refresh rejection, including while a cached asset is served.
  event.waitUntil(refresh.then(() => undefined).catch(() => undefined));
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (asset) return (await cache.match(request)) || refresh.catch(() => Response.error());
    try {
      const response = await refresh;
      if (response.status < 500) return response;
    } catch { /* Use the previously opened shell or the public offline page. */ }
    return (await cache.match(request)) || (await cache.match("/offline.html")) || Response.error();
  })());
});
