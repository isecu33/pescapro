/* PescaPro - Orquestación: estado, arranque, navegación, refresco periódico,
   búsqueda de spots, GPS y mapa. */
window.PP = window.PP || {};

PP.app = (function () {
  const $ = (s) => document.querySelector(s);

  const NAV_ICONOS = {
    ahora: 'cana', prevision: 'grafico', mapa: 'mapa',
    especies: 'pez', cuaderno: 'libreta', trofeos: 'trofeo'
  };

  const st = {
    spot: null,
    modo: 'spinning',
    datos: null,
    ctx: null,
    grid: null,
    vista: 'ahora',
    cargando: false,
    mapaIniciado: false,
    timer: null
  };

  /* ---------- Arranque ---------- */

  function iniciar() {
    // Preferencias guardadas
    try {
      const g = JSON.parse(localStorage.getItem('pp_prefs') || '{}');
      if (g.spot) st.spot = g.spot;
      if (g.modo && PP.MODOS[g.modo]) st.modo = g.modo;
    } catch (e) { /* sin prefs */ }
    if (!st.spot) st.spot = Object.assign({}, PP.CONFIG.DEFAULT_SPOT);

    conectarUI();
    PP.ui.renderCabecera(st);

    // Arranque instantáneo desde caché si existe, y refresco en paralelo
    const cache = PP.api.desdeCache(st.spot.lat, st.spot.lon);
    if (cache) {
      st.datos = cache;
      st.ctx = PP.indice.preparar(cache);
      renderVista();
    }
    const viejo = !cache || (Date.now() - cache.obtenido > PP.CONFIG.STALE_MS);
    if (viejo || !cache) refrescar();

    // Refresco periódico + al volver a la app
    st.timer = setInterval(refrescar, PP.CONFIG.REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && st.datos && Date.now() - st.datos.obtenido > PP.CONFIG.STALE_MS) refrescar();
    });
  }

  async function refrescar() {
    if (st.cargando) return;
    st.cargando = true;
    $('#btn-refrescar').classList.add('girando');
    PP.ui.renderCabecera(st);
    try {
      const datos = await PP.api.cargarTodo(st.spot.lat, st.spot.lon);
      st.datos = datos;
      st.ctx = PP.indice.preparar(datos);
      st.error = null;
      renderVista();
      if (st.mapaIniciado) cargarGrid();
    } catch (e) {
      st.error = e.message;
      if (!st.datos) {
        if (st.vista === 'mapa') {
          const est = $('#mapa-estado');
          if (est) est.textContent = 'Sin conexión y sin datos en caché.';
        } else {
          $('#vista-' + st.vista).innerHTML =
            '<div class="pp-card pp-error">Sin conexión y sin datos en caché.<br><small>' + e.message + '</small><br><button class="pp-chip" onclick="PP.app.refrescarManual()">Reintentar</button></div>';
        }
      }
    } finally {
      st.cargando = false;
      $('#btn-refrescar').classList.remove('girando');
      PP.ui.renderCabecera(st);
    }
  }

  function refrescarManual() { refrescar(); }

  function guardarPrefs() {
    try { localStorage.setItem('pp_prefs', JSON.stringify({ spot: st.spot, modo: st.modo })); } catch (e) { }
  }

  /* ---------- Navegación ---------- */

  function irA(vista) {
    st.vista = vista;
    document.querySelectorAll('.pp-vista').forEach(v => v.classList.remove('activa'));
    $('#vista-' + vista).classList.add('activa');
    document.querySelectorAll('.pp-nav button').forEach(b => b.classList.toggle('activo', b.dataset.vista === vista));
    renderVista();
    if (vista === 'mapa') iniciarMapa();
  }

  function renderVista() {
    PP.ui.renderCabecera(st);
    if (st.vista === 'ahora') PP.ui.renderAhora(st);
    else if (st.vista === 'prevision') PP.ui.renderPrevision(st);
    else if (st.vista === 'especies') PP.ui.renderEspecies(st);
    else if (st.vista === 'cuaderno') PP.ui.renderCuaderno(st);
    else if (st.vista === 'trofeos') PP.uiTrofeos.render(st);
    else if (st.vista === 'mapa') actualizarInfoMapa();
  }

  function cambiarModo(m) {
    st.modo = m;
    guardarPrefs();
    renderVista();
  }

  /* ---------- Mapa ---------- */

  function iniciarMapa() {
    if (!st.mapaIniciado) {
      PP.mapa.iniciar('mapa', st.spot, {
        onMoverSpot: (p) => {
          if (confirm('¿Mover el spot aquí y recargar datos?')) {
            cambiarSpot({ nombre: p.lat.toFixed(3) + ', ' + p.lon.toFixed(3), lat: p.lat, lon: p.lon });
          }
        }
      });
      st.mapaIniciado = true;
      $('#mapa-seamark').addEventListener('change', (e) => PP.mapa.toggleSeamark(e.target.checked));
      $('#mapa-slider').addEventListener('input', (e) => {
        const t = PP.mapa.pintarHora(Number(e.target.value));
        pintarEtiquetaHoraMapa(t);
        pintarVientoEnMapa(Number(e.target.value));
      });
      cargarGrid();
    }
    PP.mapa.pintarFavoritos(PP.favoritos.leer(), (f) => cambiarSpot(f));
    PP.mapa.redibujar();
    actualizarInfoMapa();
  }

  async function cargarGrid() {
    try {
      $('#mapa-estado').textContent = 'Cargando corrientes…';
      const grid = await PP.api.fetchCorrientesGrid(st.spot.lat, st.spot.lon);
      st.grid = grid;
      // Coloca el slider en la hora actual
      let idx0 = 0;
      if (grid.length && grid[0].time && grid[0].time.length) {
        const ahora = Date.now();
        idx0 = grid[0].time.findIndex(t => new Date(t).getTime() >= ahora);
        if (idx0 < 0) idx0 = 0;
        $('#mapa-slider').max = grid[0].time.length - 1;
        $('#mapa-slider').value = idx0;
      }
      PP.mapa.setCorrientes(grid);
      const t = PP.mapa.pintarHora(idx0);
      pintarEtiquetaHoraMapa(t);
      pintarVientoEnMapa(idx0);
      $('#mapa-estado').textContent = '';
    } catch (e) {
      $('#mapa-estado').textContent = 'No se pudieron cargar las corrientes (' + e.message + ')';
    }
  }

  function pintarEtiquetaHoraMapa(t) {
    $('#mapa-hora').textContent = t ? (PP.util.fmtDia(t) + ' ' + PP.util.fmtHora(t)) : '—';
  }

  function pintarVientoEnMapa(idxHora) {
    if (!st.datos || !st.grid || !st.grid.length || !st.grid[0].time) return;
    if (!$('#mapa-viento').checked) { PP.mapa.pintarViento(st.spot.lat, st.spot.lon, null, null); return; }
    const iso = st.grid[0].time[Math.min(idxHora, st.grid[0].time.length - 1)];
    const h = PP.indice.horaMasCercana(st.datos.horas, new Date(iso));
    if (h) PP.mapa.pintarViento(st.spot.lat, st.spot.lon, h.viento, h.vientoDir);
  }

  function actualizarInfoMapa() {
    if (st.mapaIniciado && $('#mapa-viento')) pintarVientoEnMapa(Number($('#mapa-slider').value || 0));
  }

  /* ---------- Spot: búsqueda, GPS, favoritos ---------- */

  function cambiarSpot(spot) {
    st.spot = spot;
    st.grid = null;
    guardarPrefs();
    PP.ui.cerrarModal();
    if (st.mapaIniciado) PP.mapa.ponerSpot(spot);
    st.datos = null; st.ctx = null;
    renderVista();
    refrescar().then(() => { if (st.mapaIniciado) cargarGrid(); });
  }

  function modalBuscar() {
    const cuerpo = document.createElement('div');
    cuerpo.innerHTML = '<h3>' + PP.iconos.html('pin') + ' Cambiar spot</h3>';
    const input = document.createElement('input');
    input.className = 'pp-input'; input.placeholder = 'Busca un puerto, playa o pueblo…';
    const res = document.createElement('div');
    cuerpo.appendChild(input); cuerpo.appendChild(res);

    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (input.value.trim().length < 2) { res.innerHTML = ''; return; }
        res.innerHTML = '<p class="pp-nota">Buscando…</p>';
        try {
          const lugares = await PP.api.buscarLugar(input.value.trim());
          res.innerHTML = '';
          if (!lugares.length) res.innerHTML = '<p class="pp-nota">Sin resultados.</p>';
          lugares.forEach(l => {
            const fila = document.createElement('div');
            fila.className = 'pp-lugar';
            fila.innerHTML = '<b>' + l.nombre + '</b><br><small>' + l.detalle + '</small>';
            fila.addEventListener('click', () => cambiarSpot(l));
            res.appendChild(fila);
          });
        } catch (e) { res.innerHTML = '<p class="pp-nota">Error buscando: ' + e.message + '</p>'; }
      }, 350);
    });

    // GPS
    const gps = document.createElement('button');
    gps.className = 'pp-chip';
    const gpsTexto = (t) => { gps.innerHTML = PP.iconos.html('ubicacion') + ' ' + t; };
    gpsTexto('Usar mi ubicación (GPS)');
    gps.addEventListener('click', () => {
      gpsTexto('Localizando…');
      navigator.geolocation.getCurrentPosition(
        (pos) => cambiarSpot({ nombre: 'Mi ubicación', lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => { gpsTexto('Sin permiso o sin señal GPS'); },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
    cuerpo.appendChild(gps);

    // Favoritos
    const favs = PP.favoritos.leer();
    if (favs.length) {
      const t = document.createElement('div');
      t.className = 'pp-campo'; t.innerHTML = '<b>' + PP.iconos.html('estrellaLlena') + ' Favoritos</b>';
      cuerpo.appendChild(t);
      favs.forEach((f, i) => {
        const fila = document.createElement('div');
        fila.className = 'pp-lugar';
        fila.innerHTML = '<b>' + f.nombre + '</b> <button class="pp-borrar">' + PP.iconos.html('cerrar') + '</button>';
        fila.querySelector('.pp-borrar').addEventListener('click', (e) => {
          e.stopPropagation(); PP.favoritos.borrar(i); PP.ui.cerrarModal(); modalBuscar();
        });
        fila.addEventListener('click', () => cambiarSpot(f));
        cuerpo.appendChild(fila);
      });
    }
    PP.ui.modal(cuerpo);
  }

  /* ---------- Cableado inicial ---------- */

  function conectarUI() {
    document.querySelectorAll('.pp-nav button').forEach(b => {
      b.querySelector('span').innerHTML = PP.iconos.svg(NAV_ICONOS[b.dataset.vista]);
      b.addEventListener('click', () => irA(b.dataset.vista));
    });
    $('#hdr-spot').addEventListener('click', modalBuscar);
    $('#btn-refrescar').innerHTML = PP.iconos.svg('refrescar');
    $('#btn-refrescar').addEventListener('click', refrescar);
    const btnFav = $('#btn-fav');
    btnFav.innerHTML = PP.iconos.svg('estrella');
    btnFav.addEventListener('click', () => {
      PP.favoritos.anadir(st.spot);
      btnFav.innerHTML = PP.iconos.svg('estrellaLlena');
      btnFav.classList.add('activo');
      setTimeout(() => { btnFav.innerHTML = PP.iconos.svg('estrella'); btnFav.classList.remove('activo'); }, 1200);
    });
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  return { cambiarModo, cambiarSpot, refrescarManual, irA, get estado() { return st; } };
})();
