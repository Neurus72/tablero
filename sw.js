// v7: InfoCam (antes Tablero) se puede instalar (ícono) y abre aunque no haya internet.
// Siempre intenta traer lo nuevo de internet; si no hay señal, usa lo guardado.
// Al cambiar archivos, subir VERSION.
const VERSION = "infocam-v8-1";
const BASICOS = ["./", "camaras.js", "manifest.webmanifest", "icono-192.png", "icono-512.png", "apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASICOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;   // los avisos van a otro lado: no se tocan
  const clave = req.mode === "navigate" ? new URL(req.url).pathname : req;            // la página sin "?..."
  e.respondWith(
    fetch(req).then(function (r) {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(clave, copia); }); }
      return r;
    }).catch(function () {
      return caches.match(clave).then(function (r) { return r || caches.match("./"); });
    })
  );
});
