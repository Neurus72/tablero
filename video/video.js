// VIDEO PARA YOUTUBE: simulación de un auto por la Ruta 2 (Samborombón → Chascomús) que reemplaza el GPS del celular,
// con el "guion" del video: carteles de explicación y el dedito que toca los botones.
// Pruebas: ?rapido=N hace todo N veces más rápido; ?auto=1 arranca sin el clic de la portada.
window.SIMULACION = true;
window.VOZ_LOG = [];
(function () {
  const Q = new URLSearchParams(location.search);
  const RAP = Number(Q.get('rapido') || 1);
  let cb = null;
  navigator.geolocation.watchPosition = function (ok) { cb = ok; return 1; };

  function m(a, b) { const r = Math.PI / 180; return 6371000 * Math.hypot((b[1] - a[1]) * r * Math.cos(a[0] * r), (b[0] - a[0]) * r); }
  function rumbo(a, b) {
    const r = Math.PI / 180, y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r),
      x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }

  // Cámaras de este tramo de la Ruta 2 (para el dato "próxima cámara")
  const CAMS = [[-35.34343, -58.04990], [-35.42651, -58.04962]];
  let acum = [0], total = 0, CAMS_KM = [];

  // Estado del auto: d = metros recorridos, v = km/h, obj = velocidad que quiere el "conductor", x = tiempo ×N
  const S = { d: 0, v: 0, obj: 0, x: 1, t: Date.now(), frenar: null, corre: false, acc: 0 };

  function $(id) { return document.getElementById(id); }
  function camOn() { return $('cam').className.indexOf('on') >= 0; }
  function camRojo() { return $('cam').className.indexOf('pasado') >= 0; }

  function paso() {
    const max = Number($('cam-max').textContent) || 0;
    // El conductor: con el cartel rojo, a los 3 s frena hasta 5 km/h menos que la máxima;
    // con cartel amarillo no pasa de la máxima − 5; sin cámara va a la velocidad que quiere.
    if (camRojo()) { S.frenar = (S.frenar || 0) + 1; if (S.frenar > 3) S.v = Math.max(max - 5, S.v - 4); }
    else if (camOn() && max && S.v > max - 5) S.v = Math.max(max - 5, S.v - 4);
    else {
      if (!camOn()) S.frenar = null;
      if (S.v < S.obj) S.v = Math.min(S.obj, S.v + 3);
      else if (S.v > S.obj) S.v = Math.max(S.obj, S.v - 4);
    }
    S.d = Math.min(total, S.d + S.v / 3.6); S.t += 1000;
    let i = 1; while (i < acum.length - 1 && acum[i] < S.d) i++;
    const f = (S.d - acum[i - 1]) / (acum[i] - acum[i - 1] || 1);
    const a = RUTA[i - 1], b = RUTA[i];
    cb && cb({ timestamp: S.t, coords: { latitude: a[0] + (b[0] - a[0]) * f, longitude: a[1] + (b[1] - a[1]) * f,
      speed: S.v / 3.6, heading: rumbo(a, b), accuracy: 5, altitude: 12 } });
    $('siminfo').style.visibility = camOn() ? 'hidden' : 'visible';   // abajo del cartel (que titila) no se ve
    const km = S.d / 1000, prox = CAMS_KM.find(k => k > km);
    $('siminfo').innerHTML = 'SIMULACIÓN · Ruta 2 · km ' + km.toFixed(1).replace('.', ',') +
      '<br>tiempo ' + (S.x <= 1 ? 'real' : '×' + S.x) +
      (prox != null ? ' · próxima cámara a ' + (prox - km).toFixed(1).replace('.', ',') + ' km' : '');
  }
  // Reloj de la simulación: cada 50 ms avanza 0,05 s × x (cada segundo simulado = una posición del GPS)
  setInterval(function () {
    if (!S.corre) return;
    S.acc += 0.05 * S.x * RAP;
    while (S.acc >= 1) { S.acc -= 1; paso(); }
  }, 50);

  // ----- Ayudas del guion -----
  function espera(ms) { return new Promise(r => setTimeout(r, ms / RAP)); }
  function hasta(fn) { return new Promise(r => { const k = setInterval(() => { if (fn()) { clearInterval(k); r(); } }, 50); }); }
  function narrar(html) {
    const n = $('narra');
    if (!html) { n.className = ''; return; }
    n.innerHTML = '<div>' + html + '</div>'; n.className = 'on';   // un div adentro: si no, cada parte queda en una columna
  }
  function marcar(id, on) { $(id).classList.toggle('marca', on); }
  // El dedito va hasta el botón, lo aprieta (con una onda) y lo toca de verdad
  async function tocar(el) {
    const mano = $('mano'), marco = $('marco');
    const r = el.getBoundingClientRect(), f = marco.getBoundingClientRect(), tam = mano.offsetHeight;
    const cx = r.left - f.left + r.width * 0.5, cy = r.top - f.top + r.height * 0.5;
    mano.style.transitionDuration = (0.9 / RAP) + 's, ' + (0.9 / RAP) + 's, .15s';
    mano.style.left = (cx - tam * 0.42) + 'px';     // la punta del dedo queda en el medio del botón
    mano.style.top = (cy - tam * 0.06) + 'px';
    await espera(1100);
    mano.classList.add('aprieta');
    const o = document.createElement('div'); o.className = 'onda';
    o.style.left = cx + 'px'; o.style.top = cy + 'px'; marco.appendChild(o);
    setTimeout(() => o.remove(), 700);
    await espera(200);
    el.click();
    await espera(300);
    mano.classList.remove('aprieta');
  }
  async function manoFuera() { $('mano').style.left = '110%'; $('mano').style.top = '110%'; await espera(900); }

  // ----- EL GUION DEL VIDEO -----
  async function guion() {
    // Portada: espera el clic (habilita el sonido) y queda 5 s más, para que el video arranque limpio
    const portada = $('portada');
    if (!Q.get('auto')) await new Promise(r => portada.addEventListener('click', r, { once: true }));
    $('pista').style.display = 'none';
    await espera(5000);
    portada.className = 'tapa fuera';
    S.corre = true;   // GPS andando, auto parado
    await espera(1200);

    narrar('Salimos de <b>Samborombón</b> (Brandsen) por la <b>Ruta 2</b>, hacia <b>Chascomús</b>.');
    await espera(4500);
    narrar('En la app, tocá <span class="ve">INICIAR VIAJE</span>: desde ahí cuenta la distancia, la máxima, el promedio y el tiempo.');
    await espera(2500);
    await tocar($('btnViaje'));
    manoFuera();
    await espera(3500);

    S.obj = 110; S.x = 4;
    narrar('Los números de la velocidad cambian de color. La <b>barra de arriba</b> es la referencia.');
    await hasta(() => S.v >= 110);
    await espera(2500);
    marcar('card-rumbo', true);
    narrar('La <b>brújula</b> muestra para dónde vamos.');
    await espera(3500);
    marcar('card-rumbo', false);

    narrar('Lejos de las cámaras <b>adelantamos el tiempo</b>.');
    S.x = 20;
    await hasta(camOn);
    S.x = 2;
    narrar('Cámara adelante: cartel <span class="am">AMARILLO</span> y aviso por voz, con la distancia y la velocidad máxima.');
    await hasta(() => !camOn());
    S.x = 4;
    narrar('Pasamos a 110, con máxima 120: <b>sin multa</b>. 👍');
    await espera(4000);

    // Avisar una cámara que no estaba en la lista
    narrar('¿Ves una cámara o un control que InfoCam no tiene? Tocá <span class="az">📷 AVISAR CÁMARA</span>.');
    S.x = 1;
    await espera(3000);
    await tocar($('btnAviso'));
    narrar('Elegís qué fue: <b>cámara fija</b> o <b>control móvil</b>.');
    await espera(2800);
    await tocar($('av-fija'));
    manoFuera();
    narrar('Queda anotado el lugar exacto. Así, <b>entre todos</b>, completamos la lista.');
    await espera(5500);

    // Segunda cámara, yendo pasado
    narrar('Ahora vamos más rápido…');
    S.obj = 125; S.x = 20;
    await hasta(camOn);
    S.x = 2;
    await hasta(camRojo);
    narrar('¡Vamos pasados! Cartel <span class="ro">ROJO</span> que titila, pitido y voz: <b>bajá la velocidad</b>.');
    await hasta(() => !camRojo());
    narrar('Bajamos a 75: el cartel vuelve a <span class="am">AMARILLO</span>. Pasamos <b>sin multa</b>. 👍');
    await hasta(() => !camOn());
    await espera(2000);
    narrar('');

    // Cierre
    const fin = $('final');
    fin.style.display = 'flex'; fin.style.opacity = '0';
    await espera(50);
    fin.style.opacity = '1';
    await espera(900);
    S.corre = false;
    window.VIDEO_FIN = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    for (let i = 1; i < RUTA.length; i++) acum.push(acum[i - 1] + m(RUTA[i - 1], RUTA[i]));
    total = acum[acum.length - 1];
    CAMS_KM = CAMS.map(function (c) {
      let mi = 0, md = 1e9;
      for (let i = 0; i < RUTA.length; i++) { const dd = m(RUTA[i], c); if (dd < md) { md = dd; mi = i; } }
      return acum[mi] / 1000;
    });
    // "Avisa 1.049 cámaras que multan, en toda la Argentina." (portada y cierre; el número sale de camaras.js)
    if (typeof CAMARAS !== 'undefined')
      $('port-cams').innerHTML = $('fin-cams').innerHTML =
        'Avisa <b>' + CAMARAS.length.toLocaleString('es-AR') + ' cámaras<br>que multan</b>,<br>en toda la Argentina.';
    paso();                                  // primera posición: el auto parado en el arranque
    mostrarRumbo(rumbo(RUTA[0], RUTA[3]));   // la brújula ya apunta para donde sale la ruta
    guion();
  });
})();
