/* Utilidades de la auditoria. Independientes de src/domain/__fixtures__.js:
   los datos sinteticos se construyen aqui con una "verdad" conocida (p.ej.
   una marea sinusoidal cuyas pleamares sabemos exactamente cuando ocurren)
   para poder comprobar el resultado contra la fisica, no contra la salida
   actual del codigo. */
import { vi } from 'vitest';

export const MIN = 60e3;
export const HORA = 3600e3;
export const PERIODO_M2 = 12.4206 * HORA; // semidiurna lunar principal

/* localStorage en memoria. `fallarAlEscribir` simula almacenamiento lleno. */
export function almacenFalso() {
  const m = new Map();
  return {
    fallarAlEscribir: false,
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) {
      if (this.fallarAlEscribir) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      m.set(k, String(v));
    },
    removeItem(k) { m.delete(k); },
    clear() { m.clear(); },
    key(i) { return [...m.keys()][i] ?? null; },
    get length() { return m.size; },
  };
}

/* Instala un almacen nuevo como localStorage global y lo devuelve. Llamar
   varias veces simula varios dispositivos (ver usarDispositivo). */
export function instalarAlmacen() {
  const a = almacenFalso();
  globalThis.localStorage = a;
  return a;
}
export function usarDispositivo(almacen) { globalThis.localStorage = almacen; }

/* Congela el reloj (solo Date; los timers siguen siendo reales). */
export function fijarAhora(fecha) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(fecha);
}
export function soltarReloj() { vi.useRealTimers(); }

/* PRNG determinista (mulberry32) para fuzzing reproducible. */
export function prng(semilla) {
  let a = semilla >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const entre = (r, a, b) => a + (b - a) * r();

/* Hora "de manual": condiciones templadas, sin ningun umbral de seguridad. */
export function horaBase(fecha, extra) {
  return Object.assign({
    iso: fecha.toISOString(), fecha,
    temp: 16, lluvia: 0, codigo: 1, nubes: 50, visibilidad: 20000,
    viento: 10, racha: 15, vientoDir: 270,
    presion: 1015, presionMsl: 1015,
    ola: 1.0, olaDir: 300, olaPeriodo: 9, mardefondo: 0.6, mardefondoPeriodo: 10,
    sst: 16, corriente: 0.2, corrienteDir: 90, nivelMar: 0,
  }, extra || {});
}

/* Marea sintetica: nivel = A*cos(2*pi*(t - pleamar)/periodo) [+ diurna].
   Devuelve tambien los extremos verdaderos para comparar. */
export function mareaSintetica({ amplitud = 1.5, pleamar, periodo = PERIODO_M2, diurna = 0 }) {
  const nivel = (t) => amplitud * Math.cos(2 * Math.PI * (t - pleamar) / periodo)
    + diurna * Math.cos(2 * Math.PI * (t - pleamar) / (2 * periodo));
  return { nivel };
}

/* Tanda de datos con la forma de api.fusionar() + lat/lon. */
export function tanda({ desde, horas = 120, lat = 43.29, lon = -2.17, marea, porHora }) {
  const lista = [];
  const t0 = desde.getTime();
  const m = marea || mareaSintetica({ pleamar: t0 + 2.3 * HORA });
  for (let i = 0; i < horas; i++) {
    const f = new Date(t0 + i * HORA);
    const h = horaBase(f, { nivelMar: m.nivel(f.getTime()) });
    if (porHora) Object.assign(h, porHora(f, i));
    lista.push(h);
  }
  return { horas: lista, lat, lon, diario: {}, utcOffset: 0, zonaHoraria: 'Europe/Madrid' };
}

/* Fecha local (TZ del proceso) sin ambiguedad. */
export const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);
