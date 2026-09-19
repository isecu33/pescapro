// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Chart.js no puede renderizar en happy-dom (sin canvas real), así que lo
// mock-eamos a nivel de módulo — solo verificamos el ciclo de vida del
// componente, no el rendering interno de Chart.js.
vi.mock('chart.js', () => {
  const Chart = vi.fn(function () {
    this.destroy = vi.fn();
  });
  Chart.register = vi.fn();
  return { Chart, registerables: [] };
});

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

describe('<pp-curva-marea>: curva Chart.js con área suave', () => {
  it('se registra como custom element', () => {
    expect(customElements.get('pp-curva-marea')).toBeTruthy();
  });

  it('tiene un <canvas> en el shadowRoot', () => {
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    expect(el.shadowRoot.querySelector('canvas')).not.toBeNull();
    el.remove();
  });

  it('no crea un Chart si hay menos de 4 puntos', async () => {
    const { Chart } = await import('chart.js');
    Chart.mockClear();
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = { puntos: [{ t: 1, nivel: 0 }], extremos: [] };
    expect(Chart).not.toHaveBeenCalled();
    el.remove();
  });

  it('crea un Chart al recibir datos suficientes', async () => {
    const { Chart } = await import('chart.js');
    Chart.mockClear();
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    expect(Chart).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('destruye el Chart anterior al re-renderizar', async () => {
    const { Chart } = await import('chart.js');
    Chart.mockClear();
    const el = document.createElement('pp-curva-marea');
    document.body.appendChild(el);
    el.data = datosDePrueba();
    const destroyFn = el._chart?.destroy;
    el.data = datosDePrueba();
    // destroyFn fue llamado antes de crear el nuevo chart
    if (destroyFn) expect(destroyFn).toHaveBeenCalled();
    expect(Chart).toHaveBeenCalledTimes(2);
    el.remove();
  });
});
