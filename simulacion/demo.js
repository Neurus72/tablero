// SIMULACIÓN: un auto por la Ruta 2 hacia Chascomús. Reemplaza el GPS del celular.
(function(){
  const CAMS = [[-35.34343,-58.04990],[-35.42651,-58.04962],[-35.51097,-58.02383],[-35.51479,-58.02253],[-35.53139,-58.00814],[-35.53981,-57.99581]];
  let CAMS_KM = [];   // dónde quedan las cámaras sobre el recorrido (se calcula al cargar)
  const CRUCERO = 125;                                    // el "conductor" va a 125 km/h
  let cb = null;
  navigator.geolocation.watchPosition = function(ok){ cb = ok; return 1; };
  function m(a, b){ const r = Math.PI/180; return 6371000*Math.hypot((b[1]-a[1])*r*Math.cos(a[0]*r), (b[0]-a[0])*r); }
  function rumbo(a, b){ const r = Math.PI/180, y = Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),
    x = Math.cos(a[0]*r)*Math.sin(b[0]*r) - Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);
    return (Math.atan2(y, x)/r + 360) % 360; }
  document.addEventListener('DOMContentLoaded', function(){
    const acum = [0];
    for (let i = 1; i < RUTA.length; i++) acum.push(acum[i-1] + m(RUTA[i-1], RUTA[i]));
    const total = acum[acum.length-1];
    CAMS_KM = CAMS.map(function(c){ let mi = 0, md = 1e9;
      for (let i = 0; i < RUTA.length; i++) { const dd = m(RUTA[i], c); if (dd < md) { md = dd; mi = i; } }
      return acum[mi] / 1000; });
    const tapa = document.createElement('div');
    tapa.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:20;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-size:22px;text-align:center;padding:20px';
    tapa.innerHTML = '<b style="font-size:28px">TABLERO AUTO · SIMULACIÓN RUTA 2</b><div>Así avisa las cámaras de velocidad en el celular.<br>Vamos a 125 km/h desde Ángel Etcheverry hasta Chascomús:<br>6 cámaras, en El Mirador (120) y Chascomús (80, 100, 80, 80 y 100).</div><div style="color:#ffb300;font-size:18px">🔊 Subí el volumen: también avisa con voz.</div><div style="color:#aaa;font-size:16px">Lejos de las cámaras el tiempo pasa más rápido (×12);<br>cerca de las cámaras, ×2 para que se vea y se escuche bien.</div><button style="flex:none;font-size:24px;padding:18px 30px;background:#3ddc84;color:#000;border:none">▶ ARRANCAR</button><a href="../" style="color:#9be7ff;font-size:16px">Abrir el Tablero Auto de verdad (con el GPS del celular)</a>';
    document.body.appendChild(tapa);
    const cartel = document.createElement('div');
    // v5: la franja va debajo de la velocidad (abajo tapaba el botón del viaje)
    cartel.style.cssText = 'margin-top:14px;text-align:center;font-size:14px;color:#000;background:#9be7ff;border-radius:8px;padding:4px 10px';
    document.querySelector('.vel').appendChild(cartel);
    let d = 4000, v = CRUCERO, t = Date.now(), frenarDesde = null, terminado = false;
    tapa.querySelector('button').onclick = function(){ tapa.remove(); document.getElementById('btnViaje').click(); paso(); };
    // Sólo para probar: ?hasta=METROS corre de golpe hasta ahí (sin esperar)
    const hasta = Number(new URLSearchParams(location.search).get('hasta') || 0);
    if (hasta) { tapa.remove(); window.setTimeout = function(){}; document.getElementById('btnViaje').click(); while (d < hasta) paso(); }
    function paso(){
      if (d >= total) { cartel.innerHTML = 'FIN DE LA SIMULACIÓN · llegamos a Chascomús · <a href="">ver de nuevo</a>'; return; }
      const caja = document.getElementById('cam');
      const rojo = caja.className.indexOf('pasado') >= 0, hayCam = caja.className.indexOf('on') >= 0;
      const max = Number(document.getElementById('cam-max').textContent) || 0;
      // El conductor: si el cartel está rojo, a los 3 s empieza a frenar hasta 5 km/h menos que la máxima;
      // pasada la cámara vuelve a acelerar a 125.
      if (rojo) { if (frenarDesde == null) frenarDesde = 0; frenarDesde++; if (frenarDesde > 3) v = Math.max(max - 5, v - 4); }
      else if (hayCam && max && v > max - 5) v = Math.max(max - 5, v - 4);
      else if (!hayCam) { frenarDesde = null; v = Math.min(CRUCERO, v + 2); }
      d += v / 3.6; t += 1000;
      let i = 1; while (i < acum.length - 1 && acum[i] < d) i++;
      const f = (d - acum[i-1]) / (acum[i] - acum[i-1] || 1);
      const a = RUTA[i-1], b = RUTA[i];
      const lat = a[0] + (b[0]-a[0])*f, lon = a[1] + (b[1]-a[1])*f;
      cb && cb({ timestamp: t, coords: { latitude: lat, longitude: lon, speed: v/3.6, heading: rumbo(a, b), accuracy: 5, altitude: 12 } });
      const km = d / 1000, prox = CAMS_KM.find(k => k > km - 0.3);
      const x = (prox == null || prox - km > 2.5) && !hayCam ? 12 : 2;
      cartel.textContent = 'SIMULACIÓN · Ruta 2, km ' + km.toFixed(1) + ' de ' + (total/1000).toFixed(1) + ' · tiempo ×' + x +
        (prox != null && prox > km ? ' · próxima cámara en ' + (prox - km).toFixed(1) + ' km' : '');
      setTimeout(paso, 1000 / x);
    }
  });
})();
