// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderCuaderno } from './vista-cuaderno.js';
import * as cuaderno from '../../domain/cuaderno.js';

const KEY = 'pp_cuaderno';

function capturaBase(extra) {
  return Object.assign({
    id: 'c1', especie: 'lubina', talla: 42, peso: 1.2,
    fecha: new Date('2026-03-01T10:00:00').toISOString(),
    spot: { nombre: 'Zarautz' }, senuelo: 'jerkbait', modalidad: 'spinning',
    condiciones: { faseMarea: 'subiendo', luna: 'llena', viento: 12, indice: 68 },
    notas: null, fotoId: null
  }, extra || {});
}

function guardarCapturas(...capturas) {
  localStorage.setItem(KEY, JSON.stringify(capturas));
}

function stBase() {
  return {
    spot: { nombre: 'Zarautz', lat: 43.29, lon: -2.17 },
    modo: 'spinning',
    datos: null,
    ctx: null,
    vista: 'cuaderno',
    cargando: false,
    error: null
  };
}

beforeEach(() => {
  localStorage.clear();
  // happy-dom no implementa confirm/prompt/clipboard por defecto -- se
  // definen como no-op para que vi.spyOn() tenga una funcion que espiar.
  if (typeof window.confirm !== 'function') window.confirm = () => true;
  if (typeof window.prompt !== 'function') window.prompt = () => null;
  if (typeof window.alert !== 'function') window.alert = () => {};
});

afterEach(() => {
  document.body.textContent = '';
  delete window.__xss;
});

describe('renderCuaderno: vista Cuaderno (registro, galeria, stats, historial, export/import)', () => {
  it('sin capturas: muestra el boton principal y el mensaje de "aun no hay capturas", sin bloque de estadisticas', () => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    const btn = cont.querySelector('ion-button');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Registrar captura');

    expect(cont.textContent).toContain('Aún no hay capturas');
    // No hay tarjeta de "Tus patrones" porque estadisticas().total === 0
    expect(cont.textContent).not.toContain('Tus patrones');
    expect(cont.querySelectorAll('pp-captura-card')).toHaveLength(0);
  });

  it('con capturas: pinta una <pp-captura-card> por captura y muestra el bloque de estadisticas', () => {
    guardarCapturas(capturaBase());
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    expect(cont.querySelectorAll('pp-captura-card')).toHaveLength(1);
    expect(cont.querySelector('pp-captura-card').captura.id).toBe('c1');
    expect(cont.textContent).toContain('Tus patrones');
  });

  it('FIX CRITICAL: una captura con notas maliciosas en el historial no ejecuta markup ni deja un <img> real', () => {
    const payload = '<img src=x onerror=window.__xss=true>';
    guardarCapturas(capturaBase({ notas: payload }));
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    const tarjeta = cont.querySelector('pp-captura-card');
    expect(tarjeta).not.toBeNull();
    // El payload NO debe aparecer como HTML activo en ningun nivel del arbol.
    expect(cont.querySelector('img[src="x"]')).toBeNull();
    expect(window.__xss).toBeUndefined();
    // Y el componente de verdad recibio el texto (prueba que se usa la
    // propiedad .captura, no un string HTML armado a mano).
    expect(tarjeta.captura.notas).toBe(payload);
    expect(tarjeta.shadowRoot.querySelector('.notas').textContent).toBe(payload);
  });

  it('pulsar borrar en una pp-captura-card, confirmando, borra la captura y re-renderiza sin ella', () => {
    guardarCapturas(capturaBase({ id: 'c1' }), capturaBase({ id: 'c2' }));
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(cont.querySelectorAll('pp-captura-card')).toHaveLength(2);

    const primera = cont.querySelector('pp-captura-card');
    primera.shadowRoot.querySelector('.borrar').click();

    expect(window.confirm).toHaveBeenCalled();
    const restantes = cuaderno.leer();
    expect(restantes).toHaveLength(1);
    expect(restantes[0].id).toBe('c2');
    expect(cont.querySelectorAll('pp-captura-card')).toHaveLength(1);
  });

  it('pulsar borrar sin confirmar no borra nada', () => {
    guardarCapturas(capturaBase({ id: 'c1' }));
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    cont.querySelector('pp-captura-card').shadowRoot.querySelector('.borrar').click();

    expect(cuaderno.leer()).toHaveLength(1);
    expect(cont.querySelectorAll('pp-captura-card')).toHaveLength(1);
  });

  it('galeria: se muestra solo cuando hay capturas con fotoId, con una celda por foto', () => {
    guardarCapturas(capturaBase({ id: 'c1', fotoId: null }));
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());
    expect(cont.querySelectorAll('.pp-galeria-celda')).toHaveLength(0);

    localStorage.clear();
    guardarCapturas(capturaBase({ id: 'c1', fotoId: 'f1' }), capturaBase({ id: 'c2', fotoId: 'f2' }));
    const cont2 = document.createElement('div');
    document.body.appendChild(cont2);
    renderCuaderno(cont2, stBase());
    expect(cont2.querySelectorAll('.pp-galeria-celda')).toHaveLength(2);
  });

  it('exportar: copia el JSON al portapapeles cuando clipboard.writeText esta disponible', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    guardarCapturas(capturaBase());
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    const chips = cont.querySelectorAll('ion-button');
    const exportarChip = Array.from(chips).find(c => c.textContent.includes('Exportar'));
    exportarChip.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(cuaderno.exportar());
    expect(window.alert).toHaveBeenCalled();
  });

  it('importar: JSON invalido muestra un alert de error y no toca el cuaderno existente', () => {
    guardarCapturas(capturaBase({ id: 'c1' }));
    vi.spyOn(window, 'prompt').mockReturnValue('esto no es JSON');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    const chips = cont.querySelectorAll('ion-button');
    const importarChip = Array.from(chips).find(c => c.textContent.includes('Importar'));
    importarChip.click();

    expect(window.alert).toHaveBeenCalled();
    expect(cuaderno.leer()).toHaveLength(1);
  });

  it('importar: JSON valido (array) reemplaza el cuaderno y re-renderiza', () => {
    guardarCapturas(capturaBase({ id: 'c1' }));
    const nuevo = JSON.stringify([capturaBase({ id: 'c9' })]);
    vi.spyOn(window, 'prompt').mockReturnValue(nuevo);
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderCuaderno(cont, stBase());

    const chips = cont.querySelectorAll('ion-button');
    const importarChip = Array.from(chips).find(c => c.textContent.includes('Importar'));
    importarChip.click();

    const lista = cuaderno.leer();
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe('c9');
  });
});
