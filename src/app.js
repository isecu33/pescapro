/* PescaPro - Orquestacion: estado, arranque, navegacion, refresco
   periodico, busqueda de spots, GPS y mapa. Reemplaza www/js/app.js,
   adaptado para trabajar con el shell Ionic (<pp-app-shell>, Fase3) y
   los modulos de vista (src/ui/views/*.js) en vez de globals PP.*. */
import { CONFIG } from './domain/config.js';
import { cargarTodo, desdeCache, buscarLugar } from './domain/api.js';
import { preparar, indiceHora, horaMasCercana } from './domain/indice.js';
import { favoritos } from './domain/cuaderno.js';
import { abrirModal, cerrarModal } from './ui/util/modal.js';
import { renderAhora } from './ui/views/vista-ahora.js';
import { renderPrevision } from './ui/views/vista-prevision.js';
import { crearVistaMapa } from './ui/views/vista-mapa.js';
import { renderEspecies } from './ui/views/vista-especies.js';
import { renderCuaderno } from './ui/views/vista-cuaderno.js';
import { renderTrofeos } from './ui/views/vista-trofeos.js';

const PREFS_KEY = 'pp_prefs';
const PICO_KEY = 'pp_pico';
const VISTAS = ['ahora', 'prevision', 'mapa', 'especies', 'cuaderno', 'trofeos'];

/* Crea la app conectada a un <pp-app-shell> ya montado en el DOM.
   Devuelve un pequeno API publico (cambiarModo/cambiarSpot/irA/refrescar/
   estado) principalmente para poder testear/depurar desde fuera. */
export function crearApp(shell) {
  const st = {
    spot: null,
    modo: 'spinning',
    datos: null,
    ctx: null,
    grid: null,
    vista: 'ahora',
    cargando: false,
    error: null,
    mapaIniciado: false
  };

  const contenedores = crearContenedoresDeVista();
  let vistaMapaCtrl = null;
  let timer = null;

  // Fix HIGH de auditoria (race condition): antes refrescar() se
  // descartaba por completo si ya habia uno en vuelo (`if (st.cargando)
  // return`), lo que dejaba cambiarSpot() sin efecto real mientras un
  // refresco anterior seguia pendiente -- la UI acababa mostrando datos
  // del spot viejo con el nombre del spot nuevo ya en la cabecera. Aqui
  // cada refrescar() saca un token; solo el resultado de la peticion mas
  // reciente (la de mayor token) se aplica a `st`. Los refrescos viejos
  // que resuelven tarde se descartan sin tocar el estado ni la UI.
  let peticionActual = 0;

  function crearContenedoresDeVista() {
    const mapa = {};
    VISTAS.forEach(id => {
      const div = document.createElement('div');
      div.dataset.vista = id;
      div.style.display = 'none';
      if (id === 'mapa') { div.style.height = '100%'; }
      shell.contenido.appendChild(div);
      mapa[id] = div;
    });
    return mapa;
  }

  function mostrarVista(id) {
    VISTAS.forEach(k => { contenedores[k].style.display = k === id ? '' : 'none'; });
  }

  /* ---------- Arranque ---------- */

  function iniciar() {
    try {
      const g = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (g.spot) st.spot = g.spot;
      if (g.modo) st.modo = g.modo;
    } catch (e) { /* sin prefs */ }
    if (!st.spot) st.spot = Object.assign({}, CONFIG.DEFAULT_SPOT);

    conectarUI();
    actualizarCabecera();
    mostrarVista(st.vista);

    const cache = desdeCache(st.spot.lat, st.spot.lon);
    if (cache) {
      st.datos = cache;
      st.ctx = preparar(cache);
      renderVistaActiva();
    }
    const viejo = !cache || (Date.now() - cache.obtenido > CONFIG.STALE_MS);
    if (viejo || !cache) refrescar();

    timer = setInterval(refrescar, CONFIG.REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && st.datos && Date.now() - st.datos.obtenido > CONFIG.STALE_MS) refrescar();
    });
  }

  async function refrescar() {
    const miPeticion = ++peticionActual;
    const spotAlPedir = st.spot;
    st.cargando = true;
    actualizarCabecera();
    try {
      const datos = await cargarTodo(spotAlPedir.lat, spotAlPedir.lon);
      if (miPeticion !== peticionActual) return; // una peticion mas reciente ya gano
      st.datos = datos;
      st.ctx = preparar(datos);
      st.error = null;
      _guardarPicoDia(st.modo);
      renderVistaActiva();
      if (st.mapaIniciado && vistaMapaCtrl) vistaMapaCtrl.cargarCorrientes(st).catch(() => {});
    } catch (e) {
      if (miPeticion !== peticionActual) return;
      st.error = e.message;
      if (!st.datos) mostrarErrorVistaActiva(e.message);
    } finally {
      if (miPeticion === peticionActual) {
        st.cargando = false;
        actualizarCabecera();
      }
    }
  }

  function refrescarManual() { refrescar(); }

  function _guardarPicoDia(modo) {
    if (!st.datos || !st.ctx) return;
    const hoyStr = new Date().toISOString().slice(0, 10);
    try {
      const r = JSON.parse(localStorage.getItem(PICO_KEY) || '{}');
      const valorHoy = Math.max(...st.datos.horas.map(h => indiceHora(h, modo, st.ctx).valor));
      if (r.fecha !== hoyStr) {
        r.ayer = r.hoy ?? null;
        r.hoy = valorHoy;
        r.fecha = hoyStr;
      } else {
        r.hoy = Math.max(r.hoy ?? 0, valorHoy);
      }
      localStorage.setItem(PICO_KEY, JSON.stringify(r));
    } catch (_) { /* noop */ }
  }

  function picoDelta() {
    try {
      const r = JSON.parse(localStorage.getItem(PICO_KEY) || '{}');
      if (r.hoy == null || r.ayer == null) return null;
      return { hoy: r.hoy, ayer: r.ayer, delta: Math.round(r.hoy - r.ayer) };
    } catch (_) { return null; }
  }

  function guardarPrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ spot: st.spot, modo: st.modo })); }
    catch (e) { /* sin espacio: seguimos sin persistir preferencias */ }
  }

  /* ---------- Navegacion ---------- */

  function irA(vista) {
    if (!VISTAS.includes(vista)) return;
    st.vista = vista;
    mostrarVista(vista);
    if (vista === 'mapa') iniciarMapa();
    renderVistaActiva();
  }

  function renderVistaActiva() {
    actualizarCabecera();
    const cont = contenedores[st.vista];
    if (st.vista === 'ahora') renderAhora(cont, st, picoDelta());
    else if (st.vista === 'prevision') renderPrevision(cont, st);
    else if (st.vista === 'especies') renderEspecies(cont, st);
    else if (st.vista === 'cuaderno') renderCuaderno(cont, st);
    else if (st.vista === 'trofeos') renderTrofeos(cont, st);
    // 'mapa' no se reconstruye por render: es un componente persistente
    // (ver iniciarMapa/vistaMapaCtrl), solo se actualiza via sus metodos.
  }

  function mostrarErrorVistaActiva(mensaje) {
    if (st.vista === 'mapa') return; // el estado de error del mapa lo gestiona vistaMapaCtrl.cargarCorrientes()
    const cont = contenedores[st.vista];
    cont.replaceChildren();
    const tarjeta = document.createElement('div');
    tarjeta.className = 'pp-card pp-error';
    const texto = document.createElement('div');
    texto.textContent = 'Sin conexión y sin datos en caché.';
    const detalle = document.createElement('small');
    detalle.textContent = mensaje;
    const btn = document.createElement('ion-button');
    btn.textContent = 'Reintentar';
    btn.addEventListener('click', refrescarManual);
    tarjeta.append(texto, document.createElement('br'), detalle, document.createElement('br'), btn);
    cont.appendChild(tarjeta);
  }

  function cambiarModo(m) {
    st.modo = m;
    guardarPrefs();
    renderVistaActiva();
  }

  /* ---------- Mapa ---------- */

  function iniciarMapa() {
    if (!st.mapaIniciado) {
      vistaMapaCtrl = crearVistaMapa(contenedores.mapa, st, {
        onMoverSpot: (p) => {
          if (window.confirm('¿Mover el spot aquí y recargar datos?')) {
            cambiarSpot({ nombre: p.lat.toFixed(3) + ', ' + p.lon.toFixed(3), lat: p.lat, lon: p.lon });
          }
        }
      });
      st.mapaIniciado = true;
      vistaMapaCtrl.cargarCorrientes(st).catch(() => {});
    }
    vistaMapaCtrl.actualizarFavoritos(favoritos.leer(), (f) => cambiarSpot(f));
    vistaMapaCtrl.redibujar();
  }

  /* ---------- Spot: busqueda, GPS, favoritos ---------- */

  function cambiarSpot(spot) {
    st.spot = spot;
    st.grid = null;
    st.datos = null;
    st.ctx = null;
    guardarPrefs();
    cerrarModal();
    if (st.mapaIniciado && vistaMapaCtrl) vistaMapaCtrl.actualizarSpot(spot);
    renderVistaActiva();
    refrescar();
  }

  function modalBuscar() {
    const cuerpo = document.createElement('div');
    const titulo = document.createElement('h3');
    titulo.textContent = '📍 Cambiar spot';
    const input = document.createElement('ion-input');
    input.placeholder = 'Busca un puerto, playa o pueblo…';
    const res = document.createElement('div');
    cuerpo.append(titulo, input, res);

    let timerBusqueda = null;
    input.addEventListener('ionInput', (e) => {
      clearTimeout(timerBusqueda);
      const valor = (e.detail.value || '').trim();
      timerBusqueda = setTimeout(async () => {
        res.replaceChildren();
        if (valor.length < 2) return;
        const cargando = document.createElement('p');
        cargando.className = 'pp-nota';
        cargando.textContent = 'Buscando…';
        res.appendChild(cargando);
        try {
          const lugares = await buscarLugar(valor);
          res.replaceChildren();
          if (!lugares.length) {
            const p = document.createElement('p');
            p.className = 'pp-nota';
            p.textContent = 'Sin resultados.';
            res.appendChild(p);
          }
          lugares.forEach(l => {
            const fila = document.createElement('div');
            fila.className = 'pp-lugar';
            const b = document.createElement('b');
            b.textContent = l.nombre;
            const small = document.createElement('small');
            small.textContent = l.detalle;
            fila.append(b, document.createElement('br'), small);
            fila.addEventListener('click', () => cambiarSpot(l));
            res.appendChild(fila);
          });
        } catch (e) {
          res.replaceChildren();
          const p = document.createElement('p');
          p.className = 'pp-nota';
          p.textContent = 'Error buscando: ' + e.message;
          res.appendChild(p);
        }
      }, 350);
    });

    const gps = document.createElement('ion-button');
    gps.setAttribute('fill', 'outline');
    gps.textContent = '🛰️ Usar mi ubicación (GPS)';
    gps.addEventListener('click', () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        gps.textContent = '🛰️ GPS no disponible';
        return;
      }
      gps.textContent = '🛰️ Localizando…';
      navigator.geolocation.getCurrentPosition(
        (pos) => cambiarSpot({ nombre: 'Mi ubicación', lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => { gps.textContent = '🛰️ Sin permiso o sin señal GPS'; },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
    cuerpo.appendChild(gps);

    const favs = favoritos.leer();
    if (favs.length) {
      const t = document.createElement('div');
      t.className = 'pp-campo';
      const b = document.createElement('b');
      b.textContent = '⭐ Favoritos';
      t.appendChild(b);
      cuerpo.appendChild(t);
      favs.forEach((f, i) => {
        const fila = document.createElement('div');
        fila.className = 'pp-lugar';
        const nombre = document.createElement('b');
        nombre.textContent = f.nombre;
        const borrar = document.createElement('button');
        borrar.className = 'pp-borrar';
        borrar.textContent = '✕';
        borrar.addEventListener('click', (e) => {
          e.stopPropagation();
          favoritos.borrar(i);
          cerrarModal();
          modalBuscar();
        });
        fila.append(nombre, borrar);
        fila.addEventListener('click', () => cambiarSpot(f));
        cuerpo.appendChild(fila);
      });
    }
    abrirModal(cuerpo);
  }

  /* ---------- Cabecera ---------- */

  function actualizarCabecera() {
    shell.spot = st.spot;
    shell.actualizado = textoActualizado();
    shell.refrescando = st.cargando;
    if (st.ctx && st.datos) {
      const h = horaMasCercana(st.datos.horas, new Date());
      if (h) shell.seguridad = indiceHora(h, st.modo, st.ctx).seguridad;
    } else {
      shell.seguridad = null;
    }
  }

  function textoActualizado() {
    if (!st.datos || !st.datos.obtenido) return st.cargando ? 'cargando…' : 'sin datos';
    if (st.cargando) return 'actualizando…';
    const min = Math.round((Date.now() - st.datos.obtenido) / 60000);
    return min <= 1 ? 'ahora mismo' : 'hace ' + (min < 60 ? min + ' min' : Math.round(min / 60) + ' h');
  }

  /* ---------- Cableado inicial ---------- */

  function conectarUI() {
    shell.addEventListener('pp-cambiar-vista', (e) => irA(e.detail.vista));
    shell.addEventListener('pp-cambiar-spot', modalBuscar);
    shell.addEventListener('pp-refrescar', refrescarManual);
    shell.addEventListener('pp-favorito', () => {
      favoritos.anadir(st.spot);
    });
    shell.contenido.addEventListener('pp-cambiar-modo', (e) => cambiarModo(e.detail.modo));
  }

  // crearApp() se invoca desde main.js dentro de su propio
  // DOMContentLoaded (tras montar <pp-app-shell>) -- el DOM ya esta listo
  // en este punto, así que se arranca directamente en vez de volver a
  // escuchar DOMContentLoaded (ese evento ya se disparo y no volveria a
  // hacerlo, dejando la app sin arrancar).
  iniciar();

  return {
    cambiarModo, cambiarSpot, refrescarManual, irA, picoDelta,
    get estado() { return st; }
  };
}
