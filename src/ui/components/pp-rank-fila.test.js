// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import './pp-rank-fila.js';

describe('<pp-rank-fila>: reemplaza el innerHTML de modalLiga (trofeos.js:228-235)', () => {
  it('se registra como custom element', () => {
    expect(customElements.get('pp-rank-fila')).toBeTruthy();
  });

  it('muestra medalla para las 3 primeras posiciones y "Nº" a partir de la 4a', () => {
    const el = document.createElement('pp-rank-fila');
    document.body.appendChild(el);
    el.entrada = { posicion: 1, nombre: 'Iker', esYo: true, detalle: '48 cm' };
    expect(el.shadowRoot.querySelector('.pos').textContent).toBe('🥇');
    el.entrada = { posicion: 4, nombre: 'Ander', esYo: false, detalle: '30 cm' };
    expect(el.shadowRoot.querySelector('.pos').textContent).toBe('4º');
    el.remove();
  });

  it('anade "(tú)" solo cuando esYo es true, y marca la clase .yo en el host', () => {
    const el = document.createElement('pp-rank-fila');
    document.body.appendChild(el);
    el.entrada = { posicion: 1, nombre: 'Iker', esYo: true, detalle: '48 cm' };
    expect(el.shadowRoot.querySelector('.nombre').textContent).toBe('Iker (tú)');
    expect(el.classList.contains('yo')).toBe(true);
    el.remove();
  });

  it('FIX: nombre/detalle con markup malicioso quedan como texto plano (defensa en profundidad, ya se escapaban con esc() en el original)', () => {
    const el = document.createElement('pp-rank-fila');
    document.body.appendChild(el);
    el.entrada = { posicion: 2, nombre: '<img src=x onerror=alert(1)>', esYo: false, detalle: '<script>alert(2)</script>' };
    expect(el.shadowRoot.querySelector('img')).toBeNull();
    expect(el.shadowRoot.querySelector('script')).toBeNull();
    expect(el.shadowRoot.querySelector('.nombre').textContent).toContain('<img src=x onerror=alert(1)>');
    el.remove();
  });
});
