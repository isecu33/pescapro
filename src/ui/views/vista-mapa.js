/* Vista Mapa -- a diferencia del resto de vistas de la app (que se
   reconstruyen enteras en cada refresco), esta NO puede permitirse eso:
   el <pp-mapa> envuelve una instancia real de Leaflet y recrearla en cada
   render tendria un coste (recarga de tiles, pierde zoom/posicion...) que
   no tiene sentido pagar. Por eso sigue el patron init-once + metodos de
   actualizacion puntual que en el original (www/js/app.js:
   iniciarMapa/cargarGrid/pintarEtiquetaHoraMapa/pintarVientoEnMapa/
   actualizarInfoMapa, ~lineas 114-175) vivia disperso en app.js porque el
   mapa era un singleton global (PP.mapa) al que cualquier funcion de
   arranque podia llamar. Ahora que el mapa es un Custom Element
   encapsulado, tiene mas sentido que sea la propia vista de mapa quien
   controle esa orquestacion (carga de la rejilla de corrientes, slider de
   hora, viento, estado de carga/error) y que la capa de arranque (Fase 4)
   solo llame a los metodos publicos del controlador que devuelve
   crearVistaMapa(), una vez para construir y luego en cada evento
   relevante (cambio de spot, refresco, cambio de pestana).

   Diseno elegido: crearVistaMapa(contenedor, st, callbacks) monta el DOM
   una sola vez dentro de `contenedor` (el <pp-mapa> + los controles
   Ionic: ion-range para la hora, ion-checkbox para viento/carta nautica,
   texto de estado y la leyenda de colores de corriente) y llama a
   mapaEl.iniciar(st.spot, {...}) una unica vez ahi mismo -- se asume que
   Fase 4 invoca crearVistaMapa() una sola vez durante la vida de la app
   para esta vista en concreto (no en cada render, como si hace con el
   resto). Devuelve un objeto controlador con metodos idempotentes que
   Fase 4 puede llamar cuantas veces haga falta despues.

   El controlador NO reproduce el confirm() que el original mostraba antes
   de mover el spot al hacer click en el mapa -- eso es una decision de
   flujo de UI que no le corresponde a esta vista. En su lugar reenvia el
   punto crudo {lat, lon} hacia arriba via callbacks.onMoverSpot(p) y deja
   que quien orquesta (Fase 4) decida si confirma y como. */
import { fetchCorrientesGrid } from '../../domain/api.js';
import { util } from '../../domain/config.js';
import { horaMasCercana } from '../../domain/indice.js';
import { svg } from '../../domain/iconos.js';
import '../components/pp-mapa.js';

function crearFilaToggle(iconNombre, texto, marcadoPorDefecto) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pp-mapa-toggle-btn' + (marcadoPorDefecto ? ' activo' : '');
  const ico = svg(iconNombre);
  if (ico) {
    ico.style.cssText = 'width:14px;height:14px;flex:none;pointer-events:none';
    btn.appendChild(ico);
  }
  const lbl = document.createElement('span');
  lbl.textContent = texto;
  btn.appendChild(lbl);
  let _checked = !!marcadoPorDefecto;
  Object.defineProperty(btn, 'checked', {
    get() { return _checked; },
    set(v) { _checked = !!v; btn.classList.toggle('activo', _checked); }
  });
  btn.addEventListener('click', () => {
    _checked = !_checked;
    btn.classList.toggle('activo', _checked);
    btn.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: _checked }, bubbles: false }));
  });
  const check = {
    get checked() { return _checked; },
    set checked(v) { _checked = !!v; btn.classList.toggle('activo', _checked); },
    addEventListener: (ev, fn) => btn.addEventListener(ev, fn)
  };
  return { item: btn, check };
}

function crearLeyenda() {
  const leyenda = document.createElement('div');
  leyenda.className = 'pp-leyenda';
  const fila = document.createElement('div');
  fila.className = 'pp-leyenda-fila';
  [
    ['#666666', 'débil'],
    ['#cc6600', 'moderada'],
    ['#ff7200', 'fuerte'],
    ['#e03131', 'muy fuerte']
  ].forEach(([color, texto]) => {
    const item = document.createElement('span');
    item.className = 'pp-leyenda-item';
    const dot = document.createElement('span');
    dot.className = 'pp-leyenda-dot';
    dot.style.background = color;
    const lbl = document.createElement('span');
    lbl.textContent = texto;
    item.append(dot, lbl);
    fila.appendChild(item);
  });
  const nota = document.createElement('p');
  nota.className = 'pp-leyenda-nota';
  nota.textContent = 'Desliza para ver el patrón con la marea';
  leyenda.append(fila, nota);
  return leyenda;
}

export function crearVistaMapa(contenedor, st, callbacks) {
  const cbs = callbacks || {};
  contenedor.textContent = '';
  contenedor.classList.add('pp-vista-mapa');

  const mapaEl = document.createElement('pp-mapa');
  mapaEl.className = 'pp-vista-mapa-lienzo';

  const filaHora = document.createElement('div');
  filaHora.className = 'pp-mapa-fila';
  const icoHora = svg('reloj');
  if (icoHora) icoHora.style.cssText = 'width:16px;height:16px;flex:none;color:var(--pp-texto2)';
  const range = document.createElement('ion-range');
  range.min = 0;
  range.max = 71;
  range.step = 1;
  range.value = 0;
  const etiquetaHora = document.createElement('span');
  etiquetaHora.id = 'pp-mapa-hora';
  etiquetaHora.textContent = '-';
  if (icoHora) filaHora.append(icoHora, range, etiquetaHora);
  else filaHora.append(range, etiquetaHora);

  const { item: itemViento, check: checkViento } = crearFilaToggle('viento', 'Viento', true);
  const { item: itemSeamark, check: checkSeamark } = crearFilaToggle('ancla', 'Carta náutica', false);

  const estado = document.createElement('span');
  estado.id = 'pp-mapa-estado';

  const filaToggles = document.createElement('div');
  filaToggles.className = 'pp-mapa-fila';
  filaToggles.append(itemViento, itemSeamark, estado);

  const leyenda = crearLeyenda();

  const controles = document.createElement('div');
  controles.className = 'pp-mapa-controles';
  controles.append(filaHora, filaToggles, leyenda);

  contenedor.append(mapaEl, controles);

  /* Estado local puramente de UI (que hora tiene seleccionado el slider);
     el resto de datos de dominio (spot, datos, grid) viven en `st`, que
     Fase 4 pasa de nuevo en cada llamada relevante -- ver cabecera del
     modulo. */
  function pintarEtiquetaHora(t) {
    etiquetaHora.textContent = t ? (util.fmtDia(t) + ' ' + util.fmtHora(t)) : '—';
  }

  function pintarVientoSegunHora(indiceHora, stActual) {
    if (!checkViento.checked) {
      mapaEl.pintarViento(stActual.spot.lat, stActual.spot.lon, null, null);
      return;
    }
    if (!stActual.datos || !stActual.grid || !stActual.grid.length || !stActual.grid[0].time) return;
    const serieTiempo = stActual.grid[0].time;
    const iso = serieTiempo[Math.min(indiceHora, serieTiempo.length - 1)];
    const h = horaMasCercana(stActual.datos.horas, new Date(iso));
    if (h) mapaEl.pintarViento(stActual.spot.lat, stActual.spot.lon, h.viento, h.vientoDir);
  }

  const controlador = {
    elemento: contenedor,

    actualizarSpot(spot) {
      mapaEl.ponerSpot(spot);
    },

    actualizarFavoritos(favs, onIr) {
      mapaEl.pintarFavoritos(favs || [], onIr);
    },

    async cargarCorrientes(stActual) {
      estado.textContent = 'Cargando corrientes…';
      try {
        const grid = await fetchCorrientesGrid(stActual.spot.lat, stActual.spot.lon);
        stActual.grid = grid;
        let idx0 = 0;
        if (grid.length && grid[0].time && grid[0].time.length) {
          const ahora = Date.now();
          idx0 = grid[0].time.findIndex(t => new Date(t).getTime() >= ahora);
          if (idx0 < 0) idx0 = 0;
          range.max = grid[0].time.length - 1;
          range.value = idx0;
        }
        // setCorrientes() guarda la rejilla y pinta por defecto la hora 0
        // interna del componente; hay que repintar explicitamente en idx0
        // (igual que el original: PP.mapa.setCorrientes(grid) seguido de
        // PP.mapa.pintarHora(idx0)) o el mapa/la etiqueta muestran la
        // primera hora de la serie en vez de la hora actual.
        mapaEl.setCorrientes(grid);
        const t = mapaEl.pintarHora(idx0);
        pintarEtiquetaHora(t);
        pintarVientoSegunHora(idx0, stActual);
        estado.textContent = '';
        return grid;
      } catch (e) {
        estado.textContent = 'No se pudieron cargar las corrientes (' + e.message + ')';
        throw e;
      }
    },

    onCambioHora(indiceHora, stActual) {
      const t = mapaEl.pintarHora(indiceHora);
      pintarEtiquetaHora(t);
      pintarVientoSegunHora(indiceHora, stActual);
    },

    redibujar() {
      mapaEl.redibujar();
    }
  };

  mapaEl.iniciar(st.spot, {
    onMoverSpot: (p) => { if (cbs.onMoverSpot) cbs.onMoverSpot(p); }
  });

  range.addEventListener('ionInput', (e) => {
    controlador.onCambioHora(Number(e.detail.value), st);
  });
  checkSeamark.addEventListener('ionChange', (e) => {
    mapaEl.toggleSeamark(!!e.detail.checked);
  });
  checkViento.addEventListener('ionChange', () => {
    pintarVientoSegunHora(Number(range.value || 0), st);
  });

  return controlador;
}
