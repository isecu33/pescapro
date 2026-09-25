// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import './pp-curva-marea.js';

// happy-dom no implementa el contexto 2D real de <canvas>, así que mockeamos
// getContext('2d') con un objeto que registra las llamadas — el componente
// dibuja con canvas nativo (sin Chart.js), no hay librería que mockear.
function crearCtxMock() {
  return {
    moveTo: vi.fn(), lineTo: vi.fn(), bezierCurveTo: vi.fn(),
    beginPath: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    arc: vi.fn(), fillText: vi.fn(), save: vi.fn(), restore: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
  };
}

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

describe('<pp-curva-marea>: curva de nivel del mar dibujada en canvas', () => {
  let ctx;

  beforeEach(() => {
    ctx = crearCtxMock();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
  });

  it('se registra como custom element', () => {
    expect(customElements.get('pp-curva-marea')).toBeTruthy();
  });

  it('tiene un <canvas> en su DOM interno', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    expect(el.querySelector('canvas')).not.toBeNull();
    el.remove();
  });

  it('no dibuja si hay menos de 4 puntos', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = { puntos: [{ t: 1, nivel: 0 }], extremos: [] };
    expect(ctx.stroke).not.toHaveBeenCalled();
    el.remove();
  });

  it('dibuja la curva (gradiente + línea) al recibir datos suficientes', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalled();
    el.remove();
  });

  it('redibuja al recibir nuevos datos', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    el.data = datosDePrueba();
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(2);
    el.remove();
  });
});
