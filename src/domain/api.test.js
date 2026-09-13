import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchClima, fetchMarino, buscarLugar, fusionar, desdeCache } from './api.js';
import { CONFIG } from './config.js';

describe('api: conversion 1:1 desde www/js/api.js', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fusionar() indexa clima+marino por hora ISO y rellena null si falta el marino', () => {
    const clima = {
      hourly: { time: ['2026-01-01T00:00', '2026-01-01T01:00'], temperature_2m: [10, 11], wind_speed_10m: [5, 6] },
      daily: { sunrise: ['2026-01-01T08:00'] },
      utc_offset_seconds: 3600,
      timezone: 'Europe/Madrid'
    };
    const marino = { hourly: { time: ['2026-01-01T01:00'], wave_height: [1.2], sea_level_height_msl: [0.5] } };
    const r = fusionar(clima, marino);
    expect(r.horas).toHaveLength(2);
    expect(r.horas[0].temp).toBe(10);
    expect(r.horas[0].ola).toBeNull(); // no hay marino para la hora 00:00
    expect(r.horas[1].ola).toBe(1.2);
    expect(r.horas[1].nivelMar).toBe(0.5);
    expect(r.zonaHoraria).toBe('Europe/Madrid');
  });

  it('fusionar() no revienta si marino es null (sin cobertura marina)', () => {
    const clima = { hourly: { time: ['2026-01-01T00:00'], temperature_2m: [10] } };
    const r = fusionar(clima, null);
    expect(r.horas[0].ola).toBeNull();
  });

  it('desdeCache() devuelve null si no coincide el spot cacheado', () => {
    const setItem = vi.fn();
    const getItem = vi.fn(() => JSON.stringify({ lat: 10, lon: 10, obtenido: 1, clima: { hourly: { time: [] } }, marino: null }));
    vi.stubGlobal('localStorage', { setItem, getItem });
    expect(desdeCache(43.29, -2.17)).toBeNull();
  });

  it('desdeCache() devuelve null si localStorage lanza o el JSON esta corrupto', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'no es json valido' });
    expect(desdeCache(43.29, -2.17)).toBeNull();
  });

  it('fetchClima construye la URL con los parametros de CONFIG y llama a getJSON via fetch', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ hourly: { time: [] } }) }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchClima(43.29, -2.17);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain(CONFIG.API.clima);
    expect(url).toContain('latitude=43.2900');
    expect(url).toContain('longitude=-2.1700');
  });

  it('buscarLugar codifica el nombre de busqueda en la URL (encodeURIComponent)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ results: [] }) }));
    vi.stubGlobal('fetch', fetchMock);
    await buscarLugar('San Sebastián');
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('San Sebastián'));
  });

  it('propaga un error legible si la respuesta HTTP no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })));
    await expect(fetchMarino(43.29, -2.17)).rejects.toThrow('HTTP 503');
  });

  it('fix HIGH: aborta con un mensaje claro si la peticion cuelga mas del timeout configurado', async () => {
    vi.useFakeTimers();
    const original = CONFIG.FETCH_TIMEOUT_MS;
    CONFIG.FETCH_TIMEOUT_MS = 1000;
    try {
      vi.stubGlobal('fetch', vi.fn((url, opts) => new Promise((resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })));
      const promesa = fetchClima(43.29, -2.17);
      const aserto = expect(promesa).rejects.toThrow('Tiempo de espera agotado');
      await vi.advanceTimersByTimeAsync(1000);
      await aserto;
    } finally {
      CONFIG.FETCH_TIMEOUT_MS = original;
    }
  });
});
