// v10: ESTADÍSTICA ANÓNIMA de uso de InfoCam (cuántos celulares la abren, la instalan, miran la simulación o el video).
// No manda nombres ni la ubicación: sólo el número al azar de este celular (tab_aparato, el mismo de AVISAR CÁMARA)
// y qué hizo. La ciudad aproximada la calcula Cloudflare. Sólo cuenta en la página publicada (no en las pruebas de la PC).
// Se ve en la página de Ricar: https://tablero-avisos.gps-moto.workers.dev/ → 📊 ESTADÍSTICAS
function contarVisita(tipo) {
  try {
    if (location.hostname !== "neurus72.github.io") return;
    let ap = null;
    try { ap = localStorage.getItem("tab_aparato"); } catch (e) {}
    if (!ap) { ap = Math.random().toString(36).slice(2, 12); try { localStorage.setItem("tab_aparato", ap); } catch (e) {} }
    const datos = JSON.stringify({ ap: ap, tipo: tipo });
    const url = "https://tablero-avisos.gps-moto.workers.dev/visita";
    if (navigator.sendBeacon && navigator.sendBeacon(url, datos)) return;
    fetch(url, { method: "POST", body: datos, mode: "no-cors", keepalive: true }).catch(function () {});
  } catch (e) {}
}
