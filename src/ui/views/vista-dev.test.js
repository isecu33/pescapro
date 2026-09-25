// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { panelDev } from './vista-dev.js';
import { LISTA } from '../../domain/records/logros.js';
import { logroOverride, seguridadOverride, resetOverrides } from '../../domain/dev.js';

describe('panelDev: panel de modo desarrollador', () => {
  afterEach(() => resetOverrides());

  it('renderiza una fila por cada logro definido', () => {
    const cont = panelDev();
    expect(cont.querySelectorAll('.pp-dev-fila').length).toBe(LISTA.length);
  });

  it('renderiza 4 chips de nivel de seguridad (Auto/Ok/Amarillo/Rojo)', () => {
    const cont = panelDev();
    const chips = cont.querySelectorAll('.pp-dev-panel > .pp-card:first-of-type .pp-dev-chips .pp-chip');
    expect(chips.length).toBe(4);
  });

  it('clicar "Rojo" en seguridad fuerza el override y se refleja tras re-render', () => {
    const cont = panelDev();
    const chipsAntes = cont.querySelectorAll('.pp-dev-panel > .pp-card:first-of-type .pp-dev-chips .pp-chip');
    Array.from(chipsAntes).find(b => b.textContent === 'Rojo').click();

    expect(seguridadOverride()).toBe('rojo');
    // el panel se reconstruye por completo en cada cambio: re-consultamos el DOM
    const chipsDespues = cont.querySelectorAll('.pp-dev-panel > .pp-card:first-of-type .pp-dev-chips .pp-chip');
    const btnRojo = Array.from(chipsDespues).find(b => b.textContent === 'Rojo');
    expect(btnRojo.classList.contains('pp-chip-acento')).toBe(true);
  });

  it('clicar "✓" en un logro fuerza conseguido=true para ese id', () => {
    const cont = panelDev();
    const fila = Array.from(cont.querySelectorAll('.pp-dev-fila'))
      .find(f => f.querySelector('.pp-dev-fila-nombre').textContent === LISTA[0].nombre);
    const btnSi = Array.from(fila.querySelectorAll('.pp-chip')).find(b => b.textContent === '✓');
    btnSi.click();

    expect(logroOverride(LISTA[0].id)).toBe(true);
  });

  it('"Quitar todos los overrides" limpia logros y seguridad', () => {
    const cont = panelDev();
    const chipsSeguridad = cont.querySelectorAll('.pp-dev-panel > .pp-card:first-of-type .pp-dev-chips .pp-chip');
    Array.from(chipsSeguridad).find(b => b.textContent === 'Amarillo').click();

    const filas = cont.querySelectorAll('.pp-dev-fila');
    Array.from(filas[0].querySelectorAll('.pp-chip')).find(b => b.textContent === '✗').click();

    const btnReset = Array.from(cont.querySelectorAll('button')).find(b => b.textContent === 'Quitar todos los overrides');
    btnReset.click();

    expect(seguridadOverride()).toBeNull();
    expect(logroOverride(LISTA[0].id)).toBeNull();
  });
});
