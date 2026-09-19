// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { colorPorVelocidad, calcularFlecha, crearPopupFavorito, PpMapa } from './pp-mapa.js';

// Nota: la inicializacion real de Leaflet (L.map(...)) hace mucho uso de
// medidas de layout reales del navegador (getBoundingClientRect, tiles,
// paneles) que happy-dom no reproduce con fidelidad -- por eso el plan de
// migracion fija como criterio de aceptacion de este componente "funciona
// visualmente en npm run dev" para la parte de mapa real, y aqui se
// testea exhaustivamente la parte que SI es pura y es exactamente donde
// vivia el bug de seguridad: la geometria de las flechas y, sobre todo,
// la construccion del popup de favoritos (fix CRITICAL).

describe('pp-mapa: funciones puras extraidas de www/js/mapa.js', () => {
  it('colorPorVelocidad reproduce los mismos umbrales que dibujarFlecha()', () => {
    expect(colorPorVelocidad(0.10)).toBe('#666666');
    expect(colorPorVelocidad(0.20)).toBe('#cc6600');
    expect(colorPorVelocidad(0.45)).toBe('#ff7200');
    expect(colorPorVelocidad(0.80)).toBe('#e03131');
  });

  it('calcularFlecha() devuelve p1/p2 centrados en (lat,lon) y 2 puntas de flecha', () => {
    const { p1, p2, puntas, color } = calcularFlecha(43.29, -2.17, 0.4, 90);
    expect(color).toBe('#f59f00');
    const centroLat = (p1[0] + p2[0]) / 2, centroLon = (p1[1] + p2[1]) / 2;
    expect(centroLat).toBeCloseTo(43.29, 3);
    expect(centroLon).toBeCloseTo(-2.17, 3);
    expect(puntas).toHaveLength(2);
  });

  it('calcularFlecha() con velocidad mayor da un vector mas largo (escala creciente)', () => {
    const corta = calcularFlecha(43.29, -2.17, 0.05, 90);
    const larga = calcularFlecha(43.29, -2.17, 1.0, 90);
    const largo = (v) => Math.hypot(v.p2[0] - v.p1[0], v.p2[1] - v.p1[1]);
    expect(largo(larga)).toBeGreaterThan(largo(corta));
  });
});

describe('pp-mapa: crearPopupFavorito -- fix CRITICAL de XSS (mapa.js:53)', () => {
  it('construye un Node real (no un string) con el nombre como texto plano', () => {
    const nodo = crearPopupFavorito({ nombre: 'Zarautz', lat: 1, lon: 1 });
    expect(nodo).toBeInstanceOf(HTMLElement);
    expect(nodo.querySelector('b').textContent).toBe('Zarautz');
  });

  it('FIX CRITICAL: un nombre de favorito malicioso nunca se ejecuta ni se convierte en HTML activo', () => {
    const payload = '<img src=x onerror=window.__xssMapa=true>';
    const nodo = crearPopupFavorito({ nombre: payload, lat: 1, lon: 1 });
    expect(nodo.querySelector('img')).toBeNull();
    expect(window.__xssMapa).toBeUndefined();
    expect(nodo.querySelector('b').textContent).toBe(payload);
  });

  it('usa "Favorito" como nombre por defecto si no hay nombre', () => {
    const nodo = crearPopupFavorito({ lat: 1, lon: 1 });
    expect(nodo.querySelector('b').textContent).toBe('Favorito');
  });

  it('el enlace "Usar este spot" llama a onIr(f) al hacer click, sin recargar la pagina', () => {
    const f = { nombre: 'Getaria', lat: 43.3, lon: -2.2 };
    const onIr = vi.fn();
    const nodo = crearPopupFavorito(f, onIr);
    const a = nodo.querySelector('a');
    expect(a.textContent).toBe('Usar este spot');
    const ev = new MouseEvent('click', { cancelable: true });
    a.dispatchEvent(ev);
    expect(onIr).toHaveBeenCalledWith(f);
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe('pp-mapa: <pp-mapa> Custom Element', () => {
  it('se registra como custom element', () => {
    expect(customElements.get('pp-mapa')).toBeTruthy();
  });

  it('los metodos publicos no revientan si se llaman antes de iniciar()', () => {
    const el = document.createElement('pp-mapa');
    document.body.appendChild(el);
    expect(() => el.ponerSpot({ lat: 1, lon: 1 })).not.toThrow();
    expect(() => el.pintarFavoritos([], () => {})).not.toThrow();
    expect(() => el.toggleSeamark(true)).not.toThrow();
    expect(el.pintarHora(0)).toBeNull();
    expect(() => el.pintarViento(1, 1, 10, 90)).not.toThrow();
    expect(() => el.redibujar()).not.toThrow();
    el.remove();
  });
});
