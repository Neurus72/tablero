// VIDEO PARA YOUTUBE: simulación de un auto por la Ruta 2 (Samborombón → Chascomús) que reemplaza el GPS del celular,
// con el "guion" del video: carteles de explicación y el dedito que toca los botones.
// Pruebas: ?rapido=N hace todo N veces más rápido; ?auto=1 arranca sin tocar la portada; ?mudo=1 sin voz (tiempos estimados).
window.SIMULACION = true;
window.VOZ_LOG = [];
window.SIN_VOZ = new URLSearchParams(location.search).has('mudo');
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
    // v15: parado y sin cartel, en ese lugar va el botón CÁMARAS DE MI RUTA (como en la app); andando, el dato de la simulación
    $('btnRuta').className = !camOn() && S.v < 10 ? 'ver' : '';
    $('siminfo').style.visibility = camOn() || S.v < 10 ? 'hidden' : 'visible';
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
  // Texto para la voz: sin etiquetas ni dibujitos (si no, lee "pulgar arriba")
  function textoPlano(html) {
    const d = document.createElement('div'); d.innerHTML = html;
    return d.textContent.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
  }
  // Dice un texto y avisa cuando terminó. Si la voz de la app está hablando, espera su turno (fila).
  // Por si el celular no avisa el final, hay un tiempo máximo calculado por el largo del texto.
  function hablar(t) {
    return new Promise(r => {
      let listo = false; const fin = () => { if (!listo) { listo = true; r(); } };
      const est = 700 + t.length * 72;             // ~14 letras por segundo
      window.VOZ_LOG.push('NARRA: ' + t);
      if (!('speechSynthesis' in window) || window.SIN_VOZ) { setTimeout(fin, est / RAP); return; }
      try {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'es-AR'; u.rate = 1.05; u.onend = fin; u.onerror = fin;
        speechSynthesis.speak(u);
        setTimeout(fin, est * 2 + 6000);
      } catch (e) { setTimeout(fin, est); }
    });
  }
  // Muestra el cartel celeste y lo dice en voz; la promesa termina cuando terminó de hablar
  function narrar(html) {
    const n = $('narra');
    if (!html) { n.className = ''; return Promise.resolve(); }
    n.innerHTML = '<div>' + html + '</div>'; n.className = 'on';   // un div adentro: si no, cada parte queda en una columna
    return hablar(textoPlano(html));
  }
  // Espera a que termine cualquier voz (la de la app incluida)
  function silencio() {
    if (!('speechSynthesis' in window) || window.SIN_VOZ) return espera(1500);
    return hasta(() => !speechSynthesis.speaking && !speechSynthesis.pending);
  }
  function marcar(id, on) { $(id).classList.toggle('marca', on); }
  // El dedito va hasta el botón, lo aprieta (con una onda) y lo toca de verdad
  async function tocar(el, seguir, viaje) {
    const mano = $('mano'), marco = $('marco');
    const r = el.getBoundingClientRect(), f = marco.getBoundingClientRect(), tam = mano.offsetHeight;
    const cx = r.left - f.left + r.width * 0.5, cy = r.top - f.top + r.height * 0.5;
    const ms = viaje || 800;                          // v16: cuánto tarda el dedito en llegar
    mano.style.transitionDuration = (ms / 1000 / RAP) + 's, ' + (ms / 1000 / RAP) + 's, .15s';
    mano.style.left = (cx - tam * 0.42) + 'px';     // la punta del dedo queda en el medio del botón
    mano.style.top = (cy - tam * 0.06) + 'px';
    await espera(ms + 150);
    mano.classList.add('aprieta');
    const o = document.createElement('div'); o.className = 'onda';
    o.style.left = cx + 'px'; o.style.top = cy + 'px'; marco.appendChild(o);
    setTimeout(() => o.remove(), 700);
    await espera(200);
    if (seguir) return;            // v15: se queda apretando (SALIR)
    el.click();
    await espera(250);
    mano.classList.remove('aprieta');
  }
  // v15: escribir letra por letra en un "campo" (como si tipeara)
  async function escribir(el, txt) {
    el.classList.remove('vacio'); el.textContent = '';
    for (const c of txt) { el.textContent += c; await espera(110); }
  }
  // v15: el dedito mantiene apretado SALIR: se llena de rojo y aparece el cartel SALIENDO… con la barra
  async function mantener(el, ms) {
    await tocar(el, true, 1500);
    $('salir-cartel').classList.add('on');
    [$('salir-lleno'), document.querySelector('#salir-barra i')].forEach(function (f) {
      f.style.transition = 'none'; f.style.width = '0'; void f.offsetWidth;
      f.style.transition = 'width ' + (ms / RAP) + 'ms linear'; f.style.width = '100%';
    });
    await espera(ms + 300);
    $('mano').classList.remove('aprieta');
  }
  // v20: CÁMARAS DE MI RUTA hasta PINAMAR (pedido de Ricar: un viaje de verdad). Calculado el 20-nov-2026 igual que la app
  // (servidor /ruta desde la largada de la simulación + cámaras a ≤60 m, juntando las de cada mano). Fijo: no pide nada a internet.
  const RT_PINAMAR = {"km": 265.5, "min": 191, "cams": [{"km": 7.7, "max": 120, "lugar": "El Mirador", "ruta": "RP 2"}, {"km": 17.1, "max": 80, "lugar": "Chascomús", "ruta": "RP 2"}, {"km": 26.8, "max": 100, "lugar": "Chascomús", "ruta": "RP 2"}, {"km": 27.3, "max": 80, "lugar": "Chascomús", "ruta": "RP 2"}, {"km": 29.6, "max": 80, "lugar": "Chascomús", "ruta": "RP 2"}, {"km": 31.1, "max": 100, "lugar": "Chascomús", "ruta": "RP 2"}, {"km": 66.2, "max": 120, "lugar": "Lezama", "ruta": "RP 2"}, {"km": 69.9, "max": 60, "lugar": "Lezama", "ruta": "RP 2"}, {"km": 93.3, "max": 80, "lugar": "Centro Guerrero", "ruta": "RP 2", "dos": true}, {"km": 95.7, "max": 80, "lugar": "Castelli", "ruta": "RP 2", "dos": true}, {"km": 109.6, "max": 80, "lugar": "Sevigné", "ruta": "RP 2", "dos": true}, {"km": 116.8, "max": 100, "lugar": "Dolores", "ruta": "RP 2", "dos": true}, {"km": 121.1, "max": 60, "lugar": "Dolores", "ruta": "RP 63", "dos": true}, {"km": 129.1, "max": 110, "lugar": "Dolores", "ruta": "RP 63"}, {"km": 134.2, "max": 110, "lugar": "Dolores", "ruta": "RP 63"}, {"km": 168.6, "max": 110, "lugar": "Villa Roch", "ruta": "RP 11"}, {"km": 174, "max": 80, "lugar": "General Conesa", "ruta": "RP 11", "dos": true}, {"km": 238.8, "max": 60, "lugar": "General Madariaga", "ruta": "RP 74"}, {"km": 243.7, "max": 110, "lugar": "General Madariaga", "ruta": "RP 74"}]};
  function rtTiempo(min) { const h = Math.floor(min / 60), m = min % 60; return h ? h + ' h ' + (m < 10 ? '0' : '') + m + ' min' : m + ' min'; }
  function rtForm() {
    $('rt-cuerpo').innerHTML = '<div class="lbl">¿ADÓNDE VAS?</div><div class="campo vacio" id="rt-hasta">Ej.: Mar del Plata</div>' +
      '<button class="azul" id="rt-buscar">BUSCAR</button>' +
      '<div class="lbl">SALGO DESDE</div><div><span class="desde">📍 Donde estoy ahora</span></div><div id="rt-lugares"></div>';
  }
  function rtLugares() {
    $('rt-lugares').innerHTML = '<div class="lbl">ELEGÍ EL LUGAR</div><button class="lug" id="rt-lug">Pinamar<small>Partido de Pinamar, Buenos Aires</small></button>';
  }
  function rtLista() {
    const g = RT_PINAMAR, cams = g.cams;   // igual que rtMostrar() de la app
    $('rt-cuerpo').innerHTML = '<div class="rt-res"><div class="dest">Pinamar</div><div>' + Math.round(g.km) + ' km · unas ' + rtTiempo(g.min) +
      ' de manejo</div><div class="tot">' + cams.length + ' cámaras en el camino</div></div>' +
      cams.map(c => '<div class="rt-cam"><div class="km">' + (c.km < 1 ? '0' : Math.round(c.km)) + '<small>km</small></div><div class="mx">' + (c.max || '?') +
        '</div><div class="lu">' + c.ruta + '<small>' + c.lugar + (c.dos ? ' · una para cada mano' : '') + '</small></div></div>').join('') +
      '<button class="gris" id="rt-cerrar">CERRAR</button>';
  }

  function manoFuera() { $('mano').style.left = '110%'; $('mano').style.top = '110%'; }

  // ----- EL GUION DEL VIDEO (menos de 1,5 minutos) -----
  async function guion() {
    // Portada: al tocarla arranca enseguida (el toque habilita el sonido)
    const portada = $('portada');
    if (!Q.get('auto')) await new Promise(r => portada.addEventListener('click', r, { once: true }));
    $('comenzar').style.display = 'none';
    if (typeof contarVisita === 'function') contarVisita('video');           // estadística: empezó a mirarlo
    portada.className = 'tapa fuera';
    S.corre = true;   // GPS andando, auto parado
    await espera(600);

    // Audio 1
    await narrar('Comenzamos desde <b>Samborombón</b>, por la <b>Ruta 2</b>, rumbo a <b>Pinamar</b>.');

    // v15: antes de salir, CÁMARAS DE MI RUTA
    const n0 = narrar('Si querés saber qué cámaras hay hasta tu destino, tocá <span class="az">🗺 ¿HAY CÁMARAS HASTA MI DESTINO?</span>');
    await espera(400);
    rtForm();
    await tocar($('btnRuta'));
    $('ruta').className = 'on';
    await espera(500);
    await escribir($('rt-hasta'), 'Pinamar');
    await tocar($('rt-buscar'));
    rtLugares();
    await espera(400);
    await tocar($('rt-lug'));
    rtLista();
    manoFuera();
    await n0;
    // v20: mientras lo dice, la lista baja despacio para que se vean las 19 cámaras
    const cu = $('rt-cuerpo'); cu.scrollTop = 0;
    let baja = null;
    setTimeout(() => { baja = setInterval(() => { cu.scrollTop += 2; }, 16 / RAP); }, 1800 / RAP);   // primero se ve "Pinamar · 266 km · 19 cámaras"
    await narrar('Te muestra las cámaras del camino y la <b>máxima</b> de cada una.');
    await espera(1200);
    clearInterval(baja); cu.scrollTop = cu.scrollHeight;
    await espera(500);
    await tocar($('rt-cerrar'));
    $('ruta').className = '';
    await narrar('<b>No hace falta hacerlo:</b> InfoCam te avisa igual cada cámara en el camino.');   // v22: es opcional (Ricar)
    manoFuera();
    viajeEmpezar();   // v22: sin botón de viaje (como la app v21): cuenta desde que arranca

    S.obj = 110; S.x = 8;
    await narrar('Los números cambian de color con la velocidad. Arriba está la <b>referencia</b>.');
    await hasta(() => S.v >= 110);

    S.x = 40;
    await narrar('Lejos de las cámaras, <b>adelantamos el tiempo</b>.');
    if (!camOn()) S.x = 80;          // terminada la frase, más rápido todavía (antes se pasaba la cámara hablando)
    await hasta(camOn);
    // Audio 2: primera cámara (primero habla la app, después el cartel celeste)
    S.x = 3;
    await narrar('Cartel <span class="am">AMARILLO</span> y voz: la distancia y la máxima.');
    S.x = 8;
    await hasta(() => !camOn());
    S.x = 4;
    await narrar('A 110, con máxima 120: <b>sin multa</b>. 👍');

    // Avisar una cámara que no estaba en la lista
    S.x = 2;
    const n2 = narrar('¿Ves una cámara que InfoCam no tiene? Tocá <span class="az">📷 INFORMAR CÁMARA</span>.');
    await espera(1800);
    await tocar($('btnAviso'));
    await n2;
    const n3 = narrar('Elegís qué viste: <b>cámara</b>, <b>policía</b>, <b>accidente</b> o <b>manifestación</b>.');
    await espera(600);
    await tocar($('av-fija'));
    manoFuera();
    await n3;
    await silencio();   // "Gracias, cámara anotada" (la app)
    await narrar('Así, <b>entre todos</b>, nos avisamos a los que vienen atrás.');

    // Segunda cámara, yendo pasado
    S.obj = 125; S.x = 80;
    await hasta(camOn);
    S.x = 2;
    await hasta(camRojo);
    await narrar('¡Vamos pasados! Cartel <span class="ro">ROJO</span>, pitido y voz: hay que frenar.');
    await hasta(() => !camRojo());
    S.x = 3;
    await narrar('Bajamos a 75: cartel <span class="am">AMARILLO</span>. Pasamos <b>sin multa</b>. 👍');

    // v15: SALIR se mantiene apretado · v16: más tranquilo (Ricar: "el final pasa muy rápido")
    await silencio();                                   // que termine la voz anterior (la de la cámara)
    const n9 = narrar('Para salir, mantené apretado <span class="ro">SALIR</span>, hasta que se llene la barra.');
    await espera(1300);
    await mantener($('btnSalir'), 1500);
    await n9;
    await espera(1500);                                 // la barra llena queda a la vista
    manoFuera();
    narrar('');

    // Cierre
    const fin = $('final');
    fin.style.display = 'flex'; fin.style.opacity = '0';
    await espera(50);
    fin.style.opacity = '1';
    await espera(900);
    S.corre = false;
    await hablar('Entre todos evitamos multas. Instalá InfoCam en tu celu.');   // último audio (texto de Ricar)
    window.VIDEO_FIN = true;
    if (typeof contarVisita === 'function') contarVisita('video_fin');       // estadística: lo vio hasta el final
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
