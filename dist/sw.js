/* PLH//MATRIX service worker */
const V = "202610311438";
const CACHE = "plh-matrix-" + V;
const SHELL = ["/", "/index.html", "/styles.css?v=" + V, "/app.js?v=" + V, "/gens.js?v=" + V, "/config.js?v=" + V, "/content.json?v=" + V,
  "/vendor/marked.min.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png",
  "/fonts/jetbrains-mono-latin-400-normal.woff2", "/fonts/jetbrains-mono-latin-700-normal.woff2",
  "/fonts/jetbrains-mono-greek-400-normal.woff2", "/fonts/jetbrains-mono-greek-700-normal.woff2", "/fonts/DSEG7Classic-Bold.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("/", cp)); return r; }).catch(() => caches.match("/")));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = { body: e.data && e.data.text() }; }
  const title = d.title || "PLH//MATRIX";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "Δεν έχεις εξασκηθεί σήμερα. Δέκα λεπτά φτάνουν.",
    icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", tag: d.tag || "plh-daily", renotify: true,
    data: { url: d.url || "/#/" }, vibrate: [80, 40, 80]
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/#/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
