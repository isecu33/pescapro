// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./ui/views/vista-ahora.js', () => ({ renderAhora: vi.fn() }));
vi.mock('./ui/views/vista-prevision.js', () => ({ renderPrevision: vi.fn() }));
vi.mock('./ui/views/vista-especies.js', () => ({ renderEspecies: vi.fn() }));
vi.mock('./ui/views/vista-cuaderno.js', () => ({ renderCuaderno: vi.fn() }));
vi.mock('./ui/views/vista-trofeos.js', () => ({
  renderTrofeos: vi.fn(),
  crearIcoLogro: vi.fn(() => document.createElement('span'))
}));
vi.mock('./ui/views/vista-mapa.js', () => ({
  crearVistaMapa: vi.fn(() => ({
    elemento: document.createElement('div'),
    actualizarSpot: vi.fn(),
    actualizarFavoritos: vi.fn(),
    cargarCorrientes: vi.fn(async () => []),
    onCambioHora: vi.fn(),
    redibujar: vi.fn()
  }))
}));
vi.mock('./domain/api.js', () => ({
  cargarTodo: vi.fn(async () => ({ horas: [], lat: 0, lon: 0, obtenido: Date.now() })),
  desdeCache: vi.fn(() => null),
  buscarLugar: vi.fn(async () => [])
}));

import { crearApp } from './app.js';
import { renderAhora } from './ui/views/vista-ahora.js';
import { renderCuaderno } from './ui/views/vista-cuaderno.js';
import { crearVistaMapa } from './ui/views/vista-mapa.js';
import { cargarTodo, desdeCache } from './domain/api.js';

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

function crearShellFalso() {
  const contenido = document.createElement('div');
  document.body.appendChild(contenido);
  const listeners = {};
  return {
    contenido,
    _valores: {},
    set spot(v) { this._valores.spot = v; },
    get spot() { return this._valores.spot; },
    set actualizado(v) { this._valores.actualizado = v; },
    set seguridad(v) { this._valores.seguridad = v; },
    set refrescando(v) { this._valores.refrescando = v; },
    addEventListener(tipo, fn) { (listeners[tipo] = listeners[tipo] || []).push(fn); },
    emit(tipo, detail) { (listeners[tipo] || []).forEach(fn => fn({ detail })); }
  };
}

describe('app.js: orquestacion (reemplaza www/js/app.js)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeLocalStorage());
    vi.clearAllMocks();
    cargarTodo.mockImplementation(async () => ({ horas: [], lat: 0, lon: 0, obtenido: Date.now() }));
    desdeCache.mockReturnValue(null);
  });

  it('iniciar() usa el spot por defecto si no hay preferencias guardadas, y refresca', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());
    expect(app.estado.spot.nombre).toBe('Zarautz');
  });

  it('irA() muestra solo el contenedor de la vista activa y llama al render correspondiente', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());

    app.irA('cuaderno');
    expect(app.estado.vista).toBe('cuaderno');
    expect(shell.contenido.querySelector('[data-vista="cuaderno"]').style.display).not.toBe('none');
    expect(shell.contenido.querySelector('[data-vista="ahora"]').style.display).toBe('none');
    expect(renderCuaderno).toHaveBeenCalled();
  });

  it('irA("mapa") inicializa el componente de mapa una sola vez', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());

    app.irA('mapa');
    app.irA('ahora');
    app.irA('mapa');
    expect(crearVistaMapa).toHaveBeenCalledTimes(1);
  });

  it('cambiarModo() persiste en localStorage y re-renderiza la vista activa', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());

    renderAhora.mockClear();
    app.cambiarModo('eging');
    expect(app.estado.modo).toBe('eging');
    expect(renderAhora).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('pp_prefs')).modo).toBe('eging');
  });

  it('fix HIGH: cambiar de spot durante un refresco en curso descarta el resultado del refresco viejo', async () => {
    let resolverPrimera;
    const primera = new Promise((res) => { resolverPrimera = res; });
    const datosA = { horas: [], lat: 1, lon: 1, obtenido: 1 };
    const datosB = { horas: [], lat: 2, lon: 2, obtenido: 2 };

    cargarTodo
      .mockImplementationOnce(() => primera)      // refresco inicial (spot por defecto): se queda colgado
      .mockImplementationOnce(async () => datosB); // refresco tras cambiarSpot: resuelve ya

    const shell = crearShellFalso();
    const app = crearApp(shell); // dispara el primer refrescar(), que queda pendiente en `primera`

    app.cambiarSpot({ nombre: 'B', lat: 2, lon: 2 });
    await vi.waitFor(() => expect(app.estado.datos).toBe(datosB));

    // Resuelve el refresco viejo DESPUES de que el nuevo ya gano
    resolverPrimera(datosA);
    await new Promise((r) => setTimeout(r, 0));

    expect(app.estado.datos).toBe(datosB); // el resultado viejo NO debe haber sobrescrito el nuevo
    expect(app.estado.spot.nombre).toBe('B');
  });

  it('pp-cambiar-modo emitido desde una vista (burbujeo) cambia la modalidad', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());

    shell.contenido.dispatchEvent(new CustomEvent('pp-cambiar-modo', { detail: { modo: 'surfcasting' }, bubbles: true, composed: true }));
    expect(app.estado.modo).toBe('surfcasting');
  });

  it('pp-cambiar-vista emitido por el shell llama a irA()', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());

    shell.emit('pp-cambiar-vista', { vista: 'especies' });
    expect(app.estado.vista).toBe('especies');
  });

  it('pp-abrir-dev emitido por el shell abre el panel de modo desarrollador', async () => {
    const shell = crearShellFalso();
    const app = crearApp(shell);
    await vi.waitFor(() => expect(app.estado.datos).not.toBeNull());

    shell.emit('pp-abrir-dev');
    // modalDev() usa import() dinamico (para que produccion no empaquete
    // vista-dev.js), asi que el modal aparece de forma asincrona.
    await vi.waitFor(() => expect(document.getElementById('pp-modal')).not.toBeNull());
    const modal = document.getElementById('pp-modal');
    expect(modal.querySelector('.pp-dev-panel')).not.toBeNull();
  });

  it('un fallo de red sin datos previos ni cache deja un error visible en la vista activa', async () => {
    desdeCache.mockReturnValue(null);
    cargarTodo.mockRejectedValue(new Error('sin red'));
    const shell = crearShellFalso();
    const app = crearApp(shell);

    await vi.waitFor(() => expect(app.estado.error).toBe('sin red'));
    const cont = shell.contenido.querySelector('[data-vista="ahora"]');
    expect(cont.textContent).toContain('Sin conexión');
    expect(cont.querySelector('ion-button')).not.toBeNull();
  });
});
