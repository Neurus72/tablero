// v7: InfoCam (antes Tablero) se puede instalar (ícono) y abre aunque no haya internet.
// Siempre intenta traer lo nuevo de internet; si no hay señal, usa lo guardado.
// Al cambiar archivos, subir VERSION. OJO v17: también APP_VERSION en index.html (tienen que ser IGUALES:
// la app compara su APP_VERSION con la VERSION de este archivo publicado para avisar "HAY UNA VERSIÓN NUEVA").
const VERSION = "infocam-v24-1";
const BASICOS = ["./", "camaras.js", "estadistica.js", "manifest.webmanifest", "icono-192.png", "icono-512.png", "apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  // v17: "reload" = bajarlos de internet de verdad (no lo que el navegador tenía guardado de antes)
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(BASICOS.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // los avisos van a otro lado: no se tocan
  if (url.pathname.endsWith("/sw.js")) return;                          // v17: la consulta de versión va directo a internet
  const clave = req.mode === "navigate" ? url.pathname : req;           // la página sin "?..."
  // v17: "no-cache" = preguntarle siempre a internet si cambió (antes el navegador podía mostrar la vieja hasta 10 min)
  const fresco = req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" });
  e.respondWith(
    fresco.then(function (r) {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(clave, copia); }); }
      return r;
    }).catch(function () {
      return caches.match(clave).then(function (r) { return r || caches.match("./"); });
    })
  );
});
