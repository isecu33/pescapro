// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearVistaMapa } from './vista-mapa.js';
import { PpMapa } from '../components/pp-mapa.js';
import { util } from '../../domain/config.js';

/* Las cadenas de hora se calculan con util.fmtDia/fmtHora (hora LOCAL de
   la maquina que corre el test, ver config.js) en vez de compararse
   contra un literal fijo -- fmtHora usa Date#toTimeString(), que depende
   de la zona horaria del proceso, y no queremos que el test dependa de
   que CI corra en Europe/Madrid. */
function etiquetaEsperada(iso) {
  const d = new Date(iso);
  return util.fmtDia(d) + ' ' + util.fmtHora(d);
}

/* Nota sobre Leaflet + happy-dom: al contrario de lo esperado (Leaflet
   suele necesitar medidas reales de layout -- getBoundingClientRect,
   tiles...), se comprobo empiricamente (ver historial de este cambio)
   que con las versiones de leaflet/happy-dom/vitest de este proyecto
   `mapaEl.iniciar()` NO revienta bajo happy-dom: crea la instancia de
   L.map sin lanzar excepcion y el resto de metodos (ponerSpot,
   setCorrientes, pintarHora...) funcionan con normalidad porque no
   dependen de que los tiles lleguen a pintarse. Por eso aqui SI se deja
   que crearVistaMapa() llame de verdad a mapaEl.iniciar() en cada test
   (no se mockea) -- lo que no se puede verificar aqui es el resultado
   VISUAL real (tiles cargados, zoom, iconos por pantalla): ese criterio
   de aceptacion queda para "funciona en npm run dev", igual que ya
   documenta pp-mapa.test.js para el propio componente. Para la
   interaccion con el mapa vía click (mover spot), en vez de disparar un
   evento Leaflet real sobre el mapa interno (detalle privado de
   <pp-mapa> al que esta vista no deberia necesitar acceder), se
   espia PpMapa.prototype.iniciar para capturar el objeto de callbacks
   que crearVistaMapa() le pasa y así confirmar el reenvío hacia
   callbacks.onMoverSpot sin acoplarse a implementación interna. */

function crearStBase() {
  return {
    spot: { nombre: 'Zarautz', lat: 43.28, lon: -2.17 },
    modo: 'spinning',
    datos: {
      horas: [
        { fecha: new Date('2026-09-14T00:00:00Z'), viento: 12, vientoDir: 300 },
        { fecha: new Date('2026-09-14T01:00:00Z'), viento: 18, vientoDir: 310 },
        { fecha: new Date('2026-09-14T02:00:00Z'), viento: 22, vientoDir: 320 }
      ]
    },
    ctx: null,
    grid: null,
    vista: 'mapa',
    cargando: false,
    error: null
  };
}

describe('crearVistaMapa: construccion del DOM (init-once)', () => {
  let contenedor, st;

  beforeEach(() => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    st = crearStBase();
  });

  afterEach(() => {
    contenedor.remove();
    vi.restoreAllMocks();
  });

  it('monta un <pp-mapa>, ion-range, dos ion-checkbox y la leyenda de colores', () => {
    crearVistaMapa(contenedor, st, {});
    expect(contenedor.querySelector('pp-mapa')).not.toBeNull();
    expect(contenedor.querySelector('ion-range')).not.toBeNull();
    expect(contenedor.querySelectorAll('ion-checkbox')).toHaveLength(2);
    const leyenda = contenedor.querySelector('.pp-leyenda');
    expect(leyenda).not.toBeNull();
    expect(leyenda.textContent).toContain('débil');
    expect(leyenda.textContent).toContain('muy fuerte');
  });

  it('el ion-range arranca en min=0, max=71, value=0 (igual que el original mapa-slider)', () => {
    crearVistaMapa(contenedor, st, {});
    const range = contenedor.querySelector('ion-range');
    expect(range.min).toBe(0);
    expect(range.max).toBe(71);
    expect(range.value).toBe(0);
  });

  it('el checkbox de viento arranca marcado y el de carta nautica desmarcado', () => {
    crearVistaMapa(contenedor, st, {});
    const checks = contenedor.querySelectorAll('ion-checkbox');
    expect(checks[0].checked).toBe(true); // viento
    expect(checks[1].checked).toBe(false); // carta nautica
  });

  it('la etiqueta de hora y el estado arrancan vacios/con guion', () => {
    crearVistaMapa(contenedor, st, {});
    expect(contenedor.querySelector('#pp-mapa-hora').textContent).toBe('—');
    expect(contenedor.querySelector('#pp-mapa-estado').textContent).toBe('');
  });

  it('el controlador devuelto expone .elemento === contenedor', () => {
    const controlador = crearVistaMapa(contenedor, st, {});
    expect(controlador.elemento).toBe(contenedor);
  });

  it('llama a mapaEl.iniciar(st.spot, {...}) exactamente una vez al construir', () => {
    const spy = vi.spyOn(PpMapa.prototype, 'iniciar');
    crearVistaMapa(contenedor, st, {});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual(st.spot);
  });

  it('reenvia el click de mover-spot hacia callbacks.onMoverSpot sin confirm() propio', () => {
    const spy = vi.spyOn(PpMapa.prototype, 'iniciar');
    const onMoverSpot = vi.fn();
    crearVistaMapa(contenedor, st, { onMoverSpot });
    const callbacksPasados = spy.mock.calls[0][1];
    callbacksPasados.onMoverSpot({ lat: 43.3, lon: -2.2 });
    expect(onMoverSpot).toHaveBeenCalledWith({ lat: 43.3, lon: -2.2 });
  });

  it('no revienta si no se pasan callbacks', () => {
    const spy = vi.spyOn(PpMapa.prototype, 'iniciar');
    crearVistaMapa(contenedor, st, undefined);
    const callbacksPasados = spy.mock.calls[0][1];
    expect(() => callbacksPasados.onMoverSpot({ lat: 1, lon: 1 })).not.toThrow();
  });
});

describe('crearVistaMapa: controlador -- actualizarSpot / actualizarFavoritos / redibujar', () => {
  let contenedor, st, controlador;

  beforeEach(() => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    st = crearStBase();
    controlador = crearVistaMapa(contenedor, st, {});
  });

  afterEach(() => {
    contenedor.remove();
    vi.restoreAllMocks();
  });

  it('actualizarSpot() delega en mapaEl.ponerSpot()', () => {
    const mapaEl = contenedor.querySelector('pp-mapa');
    const spy = vi.spyOn(mapaEl, 'ponerSpot');
    const nuevoSpot = { nombre: 'Getaria', lat: 43.3, lon: -2.2 };
    controlador.actualizarSpot(nuevoSpot);
    expect(spy).toHaveBeenCalledWith(nuevoSpot);
  });

  it('actualizarFavoritos() delega en mapaEl.pintarFavoritos()', () => {
    const mapaEl = contenedor.querySelector('pp-mapa');
    const spy = vi.spyOn(mapaEl, 'pintarFavoritos');
    const favs = [{ nombre: 'Fav', lat: 1, lon: 1 }];
    const onIr = vi.fn();
    controlador.actualizarFavoritos(favs, onIr);
    expect(spy).toHaveBeenCalledWith(favs, onIr);
  });

  it('actualizarFavoritos() sin lista no revienta (usa [] por defecto)', () => {
    const mapaEl = contenedor.querySelector('pp-mapa');
    const spy = vi.spyOn(mapaEl, 'pintarFavoritos');
    controlador.actualizarFavoritos(undefined, vi.fn());
    expect(spy).toHaveBeenCalledWith([], expect.any(Function));
  });

  it('redibujar() delega en mapaEl.redibujar()', () => {
    const mapaEl = contenedor.querySelector('pp-mapa');
    const spy = vi.spyOn(mapaEl, 'redibujar');
    controlador.redibujar();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('crearVistaMapa: controlador -- onCambioHora (listener del ion-range)', () => {
  let contenedor, st, controlador, mapaEl;

  beforeEach(() => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    st = crearStBase();
    st.grid = [{
      lat: 43.28, lon: -2.17,
      time: ['2026-09-14T00:00:00Z', '2026-09-14T01:00:00Z', '2026-09-14T02:00:00Z'],
      vel: [0.1, 0.3, 0.5], dir: [90, 120, 150], ola: [0.4, 0.5, 0.6]
    }];
    controlador = crearVistaMapa(contenedor, st, {});
    mapaEl = contenedor.querySelector('pp-mapa');
    // El controlador no llama a setCorrientes() por si solo (eso lo hace
    // cargarCorrientes(), probado aparte) -- para testear onCambioHora()
    // de forma aislada hay que darle datos de rejilla al <pp-mapa> real
    // primero, igual que haria cargarCorrientes() antes de que el usuario
    // pueda mover el slider.
    mapaEl.setCorrientes(st.grid);
  });

  afterEach(() => {
    contenedor.remove();
    vi.restoreAllMocks();
  });

  it('onCambioHora() pinta la hora en el mapa y actualiza la etiqueta de hora', () => {
    const spyHora = vi.spyOn(mapaEl, 'pintarHora');
    controlador.onCambioHora(1, st);
    expect(spyHora).toHaveBeenCalledWith(1);
    expect(contenedor.querySelector('#pp-mapa-hora').textContent).toBe(etiquetaEsperada('2026-09-14T01:00:00Z'));
  });

  it('onCambioHora() repinta el viento con la hora mas cercana de st.datos.horas', () => {
    const spyViento = vi.spyOn(mapaEl, 'pintarViento');
    controlador.onCambioHora(1, st); // 01:00 -> coincide exacto con la 2a hora de datos
    expect(spyViento).toHaveBeenCalledWith(st.spot.lat, st.spot.lon, 18, 310);
  });

  it('onCambioHora() no pinta viento si el checkbox de viento esta desmarcado', () => {
    contenedor.querySelectorAll('ion-checkbox')[0].checked = false;
    const spyViento = vi.spyOn(mapaEl, 'pintarViento');
    controlador.onCambioHora(1, st);
    expect(spyViento).toHaveBeenCalledWith(st.spot.lat, st.spot.lon, null, null);
  });

  it('el listener "ionInput" del ion-range llama a onCambioHora con el indice correcto', () => {
    const spyHora = vi.spyOn(mapaEl, 'pintarHora');
    const range = contenedor.querySelector('ion-range');
    range.value = 2;
    range.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 2 } }));
    expect(spyHora).toHaveBeenCalledWith(2);
  });
});

describe('crearVistaMapa: controlador -- toggles de viento y carta nautica', () => {
  let contenedor, st, mapaEl;

  beforeEach(() => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    st = crearStBase();
    crearVistaMapa(contenedor, st, {});
    mapaEl = contenedor.querySelector('pp-mapa');
  });

  afterEach(() => {
    contenedor.remove();
    vi.restoreAllMocks();
  });

  it('el checkbox de carta nautica llama a mapaEl.toggleSeamark() con el valor marcado', () => {
    const spy = vi.spyOn(mapaEl, 'toggleSeamark');
    const checkSeamark = contenedor.querySelectorAll('ion-checkbox')[1];
    checkSeamark.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: true } }));
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('desmarcar el checkbox de viento limpia la flecha de viento en el mapa', () => {
    const spy = vi.spyOn(mapaEl, 'pintarViento');
    const checkViento = contenedor.querySelectorAll('ion-checkbox')[0];
    checkViento.checked = false;
    checkViento.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: false } }));
    expect(spy).toHaveBeenCalledWith(st.spot.lat, st.spot.lon, null, null);
  });
});

describe('crearVistaMapa: controlador -- cargarCorrientes()', () => {
  let contenedor, st, controlador, mapaEl;

  beforeEach(() => {
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    st = crearStBase();
    controlador = crearVistaMapa(contenedor, st, {});
    mapaEl = contenedor.querySelector('pp-mapa');
  });

  afterEach(() => {
    contenedor.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('carga la rejilla, la pinta en el mapa, ajusta el slider y pinta hora/viento inicial', async () => {
    // Se estuba solo Date.now() (no vi.useFakeTimers()) para no arriesgar
    // que el shim de "fake timers" altere el calculo de zona horaria de
    // Date#toTimeString() -- solo nos interesa fijar "el instante actual"
    // para el calculo de idx0, no congelar el reloj entero.
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-14T00:30:00Z').getTime());
    const respuesta = [{
      hourly: {
        time: ['2026-09-14T00:00:00Z', '2026-09-14T01:00:00Z', '2026-09-14T02:00:00Z'],
        ocean_current_velocity: [0.1, 0.3, 0.5],
        ocean_current_direction: [90, 120, 150],
        wave_height: [0.4, 0.5, 0.6]
      }
    }];
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => respuesta })));
    const spySetCorrientes = vi.spyOn(mapaEl, 'setCorrientes');

    const grid = await controlador.cargarCorrientes(st);

    expect(st.grid).toBe(grid);
    expect(spySetCorrientes).toHaveBeenCalledWith(grid);
    // "ahora" (00:30) cae entre la hora 0 (00:00) y la 1 (01:00) -> idx0 = 1
    const range = contenedor.querySelector('ion-range');
    expect(range.value).toBe(1);
    expect(range.max).toBe(2);
    expect(contenedor.querySelector('#pp-mapa-hora').textContent).toBe(etiquetaEsperada('2026-09-14T01:00:00Z'));
    expect(contenedor.querySelector('#pp-mapa-estado').textContent).toBe('');
  });

  it('muestra un mensaje de error en el estado si fetch falla, y relanza el error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red'); }));
    await expect(controlador.cargarCorrientes(st)).rejects.toThrow('sin red');
    expect(contenedor.querySelector('#pp-mapa-estado').textContent).toContain('No se pudieron cargar las corrientes');
  });

  it('muestra "Cargando corrientes…" mientras la peticion esta en curso', async () => {
    let resolver;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((res) => { resolver = res; })));
    const promesa = controlador.cargarCorrientes(st);
    expect(contenedor.querySelector('#pp-mapa-estado').textContent).toBe('Cargando corrientes…');
    resolver({ ok: true, json: async () => ([{ hourly: { time: [], ocean_current_velocity: [], ocean_current_direction: [], wave_height: [] } }]) });
    await promesa;
  });
});
