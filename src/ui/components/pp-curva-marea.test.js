// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import './pp-curva-marea.js';

function datosDePrueba() {
  const ahora = Date.now();
  const puntos = [];
  for (let i = -6; i <= 30; i++) {
    puntos.push({ t: ahora + i * 3600e3, nivel: Math.sin(i / 6) * 2 });
  }
  const extremos = [
    { tipo: 'pleamar', t: ahora + 3 * 3600e3, altura: 2.0 },
    { tipo: 'bajamar', t: ahora + 9 * 3600e3, altura: -2.0 }
  ];
  return { puntos, extremos, ahora };
}

describe('<pp-curva-marea>: reemplaza curvaMarea() de www/js/ui.js sin innerHTML', () => {
  it('se registra como custom element', () => {
    expect(customElements.get('pp-curva-marea')).toBeTruthy();
  });

  it('no renderiza nada si hay menos de 4 puntos (igual que el original)', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = { puntos: [{ t: 1, nivel: 0 }], extremos: [] };
    expect(el.shadowRoot.querySelector('svg')).toBeNull();
    el.remove();
  });

  it('renderiza un svg con un path de la curva y una linea vertical "ahora"', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll('path')).toHaveLength(2); // area + linea
    expect(svg.querySelector('line')).not.toBeNull();
    el.remove();
  });

  it('dibuja un marcador (circulo) por cada extremo dentro de la ventana', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg.querySelectorAll('circle')).toHaveLength(2);
    el.remove();
  });

  it('no construye el SVG via innerHTML: usa createElementNS (namespaceURI SVG)', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    const svg = el.shadowRoot.querySelector('svg');
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    el.remove();
  });

  it('re-renderizar con datos nuevos limpia el svg anterior (sin duplicar)', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    el.data = datosDePrueba();
    expect(el.shadowRoot.querySelectorAll('svg')).toHaveLength(1);
    el.remove();
  });
});
