/* SUPUESTOS de la capa de datos (README "Datos" y cabecera de api.js):
   - Open-Meteo sin API key; clima y marino se fusionan por hora;
   - las horas corresponden a la hora local DEL SPOT (timezone=auto);
   - la app funciona sin cobertura: cachea y recupera para el mismo spot;
   - las peticiones no se cuelgan (timeout);
   - la CSP del index.html permite todos los hosts a los que se llama. */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fusionar, fetchClima, fetchMarino, fetchCorrientesGrid, buscarLugar, cargarTodo, desdeCache } from '../src/domain/api.js';
import { preparar, serie } from '../src/domain/indice.js';
import { CONFIG } from '../src/domain/config.js';
import { instalarAlmacen, fijarAhora, soltarReloj, HORA } from './util.js';

const RAIZ = new URL('..', import.meta.url);
const pad = (n) => String(n).padStart(2, '0');
/* Horas en formato Open-Meteo con timezone=auto: "YYYY-MM-DDTHH:MM", sin
   sufijo de zona, expresadas en la hora local del spot. */
function horasOM(y, m, d, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(Date.UTC(y, m - 1, d, i));
    out.push(`${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:00`);
  }
  return out;
}
function climaOM(time, offset = 7200, tz = 'Europe/Madrid') {
  const n = time.length, rep = (v) => Array(n).fill(v);
  return {
    utc_offset_seconds: offset, timezone: tz,
    hourly: { time, temperature_2m: rep(18), precipitation: rep(0), weather_code: rep(1), cloud_cover: rep(40),
      visibility: rep(20000), wind_speed_10m: rep(12), wind_gusts_10m: rep(18), wind_direction_10m: rep(300),
      surface_pressure: time.map((_, i) => 1015 + Math.sin(i / 10)), pressure_msl: rep(1016) },
    daily: { sunrise: [], sunset: [] },
  };
}
function marinoOM(time) {
  return { hourly: { time,
    wave_height: time.map((_, i) => 1 + i / 1000), wave_direction: time.map(() => 300), wave_period: time.map(() => 9),
    swell_wave_height: time.map(() => 0.7), swell_wave_period: time.map(() => 11), sea_surface_temperature: time.map(() => 17),
    ocean_current_velocity: time.map(() => 0.2), ocean_current_direction: time.map(() => 90),
    sea_level_height_msl: time.map((_, i) => 1.5 * Math.cos(2 * Math.PI * i / 12.42)) } };
}

afterEach(() => { soltarReloj(); vi.restoreAllMocks(); delete globalThis.fetch; });
beforeEach(() => { instalarAlmacen(); });

describe('Supuesto: clima y marino se fusionan por hora, aunque no esten alineados', () => {
  it('marino desplazado 3 h: cada hora recibe el dato marino de SU hora', () => {
    const tc = horasOM(2026, 7, 1, 48);
    const tm = horasOM(2026, 7, 1, 51).slice(3); // empieza 3 h despues
    const m = marinoOM(tm);
    const f = fusionar(climaOM(tc), m);
    expect(f.horas).toHaveLength(48);
    f.horas.forEach((h) => {
      const j = tm.indexOf(h.iso);
      if (j < 0) expect(h.ola).toBeNull();
      else expect(h.ola).toBe(m.hourly.wave_height[j]);
    });
  });
  it('sin datos marinos: campos marinos a null y sin errores', () => {
    const f = fusionar(climaOM(horasOM(2026, 7, 1, 24)), null);
    expect(f.horas.every(h => h.ola === null && h.nivelMar === null && h.sst === null)).toBe(true);
  });
});

describe('Supuesto: las horas son las del SPOT, no las del movil', () => {
  // Usuario con el movil en hora peninsular consultando un spot en Canarias
  // (una hora menos). Open-Meteo con timezone=auto devuelve "12:00" en hora
  // canaria + utc_offset_seconds=3600 (verano). Ese instante es 11:00 UTC.
  it('spot en Canarias visto desde un movil en Madrid: 12:00 canarias = 11:00 UTC', () => {
    const f = fusionar(climaOM(['2026-07-01T12:00'], 3600, 'Atlantic/Canary'), null);
    expect(f.horas[0].fecha.toISOString()).toBe('2026-07-01T11:00:00.000Z');
  });
  it('spot en la peninsula desde un movil en Madrid: sin desfase', () => {
    const f = fusionar(climaOM(['2026-07-01T12:00'], 7200), null);
    expect(f.horas[0].fecha.toISOString()).toBe('2026-07-01T10:00:00.000Z');
  });
});

describe('Supuesto: peticiones a Open-Meteo sin API key, con los parametros del producto', () => {
  it('clima y marino: host correcto, sin key, timezone=auto, dias pasados/futuros de CONFIG', async () => {
    const urls = [];
    globalThis.fetch = vi.fn(async (u) => { urls.push(u); return { ok: true, json: async () => ({}) }; });
    await fetchClima(43.29, -2.17);
    await fetchMarino(43.29, -2.17);
    const [c, m] = urls.map(u => new URL(u));
    expect(c.host).toBe('api.open-meteo.com');
    expect(m.host).toBe('marine-api.open-meteo.com');
    for (const u of [c, m]) {
      expect(u.search).not.toMatch(/apikey|api_key|token/i);
      expect(u.searchParams.get('timezone')).toBe('auto');
      expect(u.searchParams.get('forecast_days')).toBe(String(CONFIG.DIAS_PREVISION));
      expect(u.searchParams.get('latitude')).toBe('43.2900');
      expect(u.searchParams.get('longitude')).toBe('-2.1700');
    }
    expect(m.searchParams.get('cell_selection')).toBe('sea');
    for (const v of CONFIG.HOURLY_MARINO) expect(m.searchParams.get('hourly').split(',')).toContain(v);
  });
  it('HTTP de error => rechaza con mensaje util', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(fetchClima(43, -2)).rejects.toThrow(/503/);
  });
  it('error del API en JSON => rechaza con el motivo', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ error: true, reason: 'Parameter X is invalid' }) }));
    await expect(fetchClima(43, -2)).rejects.toThrow('Parameter X is invalid');
  });
  it('sin respuesta => se corta a los FETCH_TIMEOUT_MS (no se queda colgado)', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn((u, { signal }) => new Promise((_, rej) => {
      signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); });
    }));
    const p = fetchClima(43, -2);
    const atrapado = expect(p).rejects.toThrow(/Tiempo de espera/);
    await vi.advanceTimersByTimeAsync(CONFIG.FETCH_TIMEOUT_MS + 10);
    await atrapado;
  });
});

describe('Supuesto: la rejilla de corrientes rodea el spot', () => {
  it(`${CONFIG.GRID_N}x${CONFIG.GRID_N} puntos centrados en el spot con paso GRID_STEP`, async () => {
    let url;
    globalThis.fetch = vi.fn(async (u) => { url = u; return { ok: true, json: async () => [] }; });
    const pts = await fetchCorrientesGrid(43.29, -2.17);
    const q = new URL(url).searchParams;
    const lats = q.get('latitude').split(',').map(Number), lons = q.get('longitude').split(',').map(Number);
    expect(lats).toHaveLength(CONFIG.GRID_N ** 2);
    const mediaLat = lats.reduce((s, x) => s + x, 0) / lats.length;
    const mediaLon = lons.reduce((s, x) => s + x, 0) / lons.length;
    expect(mediaLat).toBeCloseTo(43.29, 3);
    expect(mediaLon).toBeCloseTo(-2.17, 3);
    const span = (CONFIG.GRID_N - 1) * CONFIG.GRID_STEP;
    expect(Math.max(...lats) - Math.min(...lats)).toBeCloseTo(span, 3);
    expect(Array.isArray(pts)).toBe(true);
  });
});

describe('Supuesto: el buscador de lugares devuelve resultados utilizables', () => {
  it('mapea nombre/lat/lon numericos, tolera address ausente y limita a 8', async () => {
    const r = Array.from({ length: 12 }, (_, i) => ({ name: i === 0 ? '' : 'Playa ' + i, display_name: 'Playa de Zarautz, Gipuzkoa, España', lat: '43.2' + i, lon: '-2.1' + i, address: i % 2 ? undefined : { town: 'Zarautz', state: 'Euskadi', country: 'España' } }));
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => r }));
    const res = await buscarLugar('zarautz', { lat: 43.29, lon: -2.17 });
    expect(res.length).toBeLessThanOrEqual(8);
    expect(res[0].nombre).toBe('Playa de Zarautz');
    for (const x of res) { expect(Number.isFinite(x.lat)).toBe(true); expect(Number.isFinite(x.lon)).toBe(true); expect(x.nombre).toBeTruthy(); }
  });
});

describe('Supuesto: funciona sin cobertura gracias a la cache del ultimo spot', () => {
  const tc = horasOM(2026, 7, 1, 24);
  const responder = () => { globalThis.fetch = vi.fn(async (u) => ({ ok: true, json: async () => (u.includes('marine') ? marinoOM(tc) : climaOM(tc)) })); };
  it('cargarTodo guarda y desdeCache devuelve lo mismo para el mismo spot', async () => {
    responder();
    const d = await cargarTodo(43.29, -2.17);
    const c = desdeCache(43.29, -2.17);
    expect(c.horas.map(h => [h.iso, h.ola, h.nivelMar])).toEqual(d.horas.map(h => [h.iso, h.ola, h.nivelMar]));
    expect(c.obtenido).toBe(d.obtenido);
  });
  it('spot a ~1 km => usa cache; spot lejano => null (no mezcla spots)', async () => {
    responder();
    await cargarTodo(43.29, -2.17);
    expect(desdeCache(43.30, -2.17)).not.toBeNull();
    expect(desdeCache(43.50, -2.17)).toBeNull();
  });
  it('cache corrupta => null sin excepcion', () => {
    localStorage.setItem('pp_datos', '{no es json');
    expect(desdeCache(43.29, -2.17)).toBeNull();
  });
  it('cache llena => cargarTodo sigue devolviendo datos (README: "seguimos sin cachear")', async () => {
    responder();
    localStorage.fallarAlEscribir = true;
    await expect(cargarTodo(43.29, -2.17)).resolves.toHaveProperty('horas');
  });
});

describe('Supuesto: flujo completo Open-Meteo -> fusion -> mareas -> indice', () => {
  it('con datos reales de forma Open-Meteo hay mareas detectadas e indice para cada hora futura', () => {
    const tc = horasOM(2026, 7, 1, 120);
    const d = fusionar(climaOM(tc), marinoOM(tc));
    d.lat = 43.29; d.lon = -2.17;
    fijarAhora(new Date(d.horas[30].fecha));
    const ctx = preparar(d);
    expect(ctx.mareas.extremos.length).toBeGreaterThan(10);
    const s = serie(ctx, 'surfcasting');
    expect(s.length).toBeGreaterThan(80);
    for (const x of s) expect(Number.isFinite(x.valor)).toBe(true);
    expect(ctx.mareas.ahora).not.toBeNull();
  });
});

describe('Supuesto: la CSP de index.html permite todos los hosts que la app consulta', () => {
  const html = readFileSync(new URL('index.html', RAIZ), 'utf8');
  const csp = (html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/) || [])[1] || '';
  const connect = (csp.match(/connect-src([^;]*)/) || [])[1] || '';
  const permitidos = connect.trim().split(/\s+/).filter(x => x.startsWith('https://')).map(x => new URL(x).host);
  const fuenteApi = readFileSync(new URL('src/domain/api.js', RAIZ), 'utf8');
  const hosts = new Set([
    ...Object.values(CONFIG.API).map(u => new URL(u).host),
    ...[...fuenteApi.matchAll(/'(https:\/\/[^'/]+)[^']*'/g)].map(m => new URL(m[1]).host),
  ]);
  for (const h of hosts) {
    it(`connect-src incluye ${h}`, () => {
      expect(permitidos, `fetch a ${h} sera bloqueado por la CSP`).toContain(h);
    });
  }
});
