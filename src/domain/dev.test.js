import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  activo, logroOverride, setLogroOverride,
  seguridadOverride, setSeguridadOverride, resetOverrides
} from './dev.js';

function mockLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k)
  };
}

describe('dev: overrides de modo desarrollador', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage());
  });

  it('activo es true en vitest (import.meta.env.DEV)', () => {
    expect(activo).toBe(true);
  });

  it('logroOverride() devuelve null cuando no hay override', () => {
    expect(logroOverride('captura-bronce')).toBeNull();
  });

  it('setLogroOverride() fuerza y logroOverride() lo refleja', () => {
    setLogroOverride('captura-bronce', true);
    expect(logroOverride('captura-bronce')).toBe(true);
    setLogroOverride('captura-bronce', false);
    expect(logroOverride('captura-bronce')).toBe(false);
  });

  it('setLogroOverride(id, null) vuelve a automatico', () => {
    setLogroOverride('viajero', true);
    setLogroOverride('viajero', null);
    expect(logroOverride('viajero')).toBeNull();
  });

  it('overrides de logros distintos no se pisan entre si', () => {
    setLogroOverride('faro', true);
    setLogroOverride('nocturno', false);
    expect(logroOverride('faro')).toBe(true);
    expect(logroOverride('nocturno')).toBe(false);
  });

  it('seguridadOverride() devuelve null por defecto y refleja lo que se fuerza', () => {
    expect(seguridadOverride()).toBeNull();
    setSeguridadOverride('rojo');
    expect(seguridadOverride()).toBe('rojo');
    setSeguridadOverride(null);
    expect(seguridadOverride()).toBeNull();
  });

  it('resetOverrides() limpia logros y seguridad de una vez', () => {
    setLogroOverride('captura-bronce', true);
    setSeguridadOverride('amarillo');
    resetOverrides();
    expect(logroOverride('captura-bronce')).toBeNull();
    expect(seguridadOverride()).toBeNull();
  });

  it('no lanza si localStorage no esta disponible', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => setLogroOverride('captura-bronce', true)).not.toThrow();
    expect(logroOverride('captura-bronce')).toBeNull();
  });
});
