/* SUPUESTOS de configuracion (README "Como funciona", comentarios de
   contrato en src/domain/config.js y documentacion de Open-Meteo). */
import { describe, it, expect } from 'vitest';
import { CONFIG, MODOS, SEGURIDAD, MAREA_CLASES, WMO, util } from '../src/domain/config.js';
import { WMO_ICO } from '../src/ui/util/icons.js';
import { prng, entre } from './util.js';

describe('Supuesto: "los pesos de cada factor suman 1" (config.js)', () => {
  for (const [id, m] of Object.entries(MODOS)) {
    it(`${id}: suma de pesos = 1 y ningun peso negativo`, () => {
      const pesos = Object.values(m.pesos);
      expect(pesos.every(p => p >= 0)).toBe(true);
      expect(pesos.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 9);
    });
    it(`${id}: los trapecios de viento/oleaje/corriente estan ordenados [min<=opt1<=opt2<=max]`, () => {
      for (const k of ['vientoOK', 'oleajeOK', 'corrienteOK']) {
        const [a, b, c, d] = m[k];
        expect(a <= b && b <= c && c <= d && a < d, `${k} = ${m[k]}`).toBe(true);
      }
    });
    it(`${id}: el factor nocturno esta en 0..1`, () => {
      expect(m.noche).toBeGreaterThanOrEqual(0);
      expect(m.noche).toBeLessThanOrEqual(1);
    });
  }
});

describe('Supuesto: umbrales de seguridad coherentes (README "Seguridad")', () => {
  it('README: rojo con viento ≥ 45, rachas ≥ 60, olas ≥ 3 m', () => {
    expect(SEGURIDAD.rojo).toEqual({ viento: 45, racha: 60, ola: 3.0 });
  });
  it('amarillo es estrictamente menos severo que rojo en cada magnitud', () => {
    for (const k of ['viento', 'racha', 'ola']) expect(SEGURIDAD.amarillo[k]).toBeLessThan(SEGURIDAD.rojo[k]);
  });
  it('un dia de "no salir" nunca puede etiquetarse mejor que Flojo', () => {
    expect(['Malo', 'Flojo']).toContain(util.etiquetaIndice(SEGURIDAD.capRojo));
  });
  it('los codigos de tormenta y lluvia fuerte existen en la tabla WMO y significan eso', () => {
    for (const c of SEGURIDAD.codigosTormenta) expect(WMO[c]?.[0]).toMatch(/Tormenta/);
    for (const c of SEGURIDAD.codigosLluviaFuerte) expect(WMO[c]?.[0]).toMatch(/fuerte/i);
  });
});

describe('Supuesto: la app entiende todo weather_code que devuelve Open-Meteo', () => {
  // Lista oficial de codigos WMO documentada por Open-Meteo (/v1/forecast).
  const OFICIALES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
  for (const c of OFICIALES) {
    it(`codigo ${c} tiene texto e icono`, () => {
      expect(WMO[c], `WMO[${c}] no definido: la UI muestra "—" en vez del tiempo`).toBeDefined();
      expect(WMO[c][0]).toBeTruthy();
      expect(WMO[c][1]).toBeTruthy();
      expect(WMO_ICO[c], `WMO_ICO[${c}] no definido: la tira de dias cae al icono generico`).toBeDefined();
    });
  }
});

describe('Supuesto: clases de marea (vivas/medias/muertas) cubren cualquier amplitud', () => {
  it('umbrales crecientes y la ultima clase cubre todo', () => {
    for (let i = 1; i < MAREA_CLASES.length; i++) expect(MAREA_CLASES[i].max).toBeGreaterThan(MAREA_CLASES[i - 1].max);
    expect(MAREA_CLASES.at(-1).max).toBeGreaterThanOrEqual(10);
  });
  it('el rango medio del Cantabrico (~2.8 m, config.js) cae en "medias"', () => {
    expect(MAREA_CLASES.find(c => 2.8 <= c.max).clase).toBe('medias');
  });
});

describe('Supuesto: trap() puntua 0..1 "lo optimo" (config.js)', () => {
  const r = prng(1);
  it('siempre en [0,1] y 1 dentro de la meseta, 0 fuera del soporte', () => {
    for (let i = 0; i < 2000; i++) {
      const pts = [entre(r, -10, 10), entre(r, -10, 10), entre(r, -10, 10), entre(r, -10, 10)].sort((a, b) => a - b);
      const [a, b, c, d] = pts;
      if (!(a < b && c < d)) continue;
      const x = entre(r, -15, 15);
      const v = util.trap(x, a, b, c, d);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      if (x >= b && x <= c) expect(v).toBe(1);
      if (x <= a || x >= d) expect(v).toBe(0);
    }
  });
  it('sin dato devuelve neutro 0.5', () => {
    expect(util.trap(null, 0, 1, 2, 3)).toBe(0.5);
    expect(util.trap(NaN, 0, 1, 2, 3)).toBe(0.5);
  });
  it('es continua (sin saltos en las rampas)', () => {
    const [a, b, c, d] = [0, 4, 18, 32];
    let prev = util.trap(a, a, b, c, d);
    for (let x = a; x <= d; x += 0.01) {
      const v = util.trap(x, a, b, c, d);
      expect(Math.abs(v - prev)).toBeLessThan(0.01);
      prev = v;
    }
  });
});

describe('Supuesto: etiqueta y color del indice son coherentes en 0..100', () => {
  const orden = ['Malo', 'Flojo', 'Regular', 'Bueno', 'Excelente'];
  it('la etiqueta nunca empeora al subir el indice', () => {
    let prev = 0;
    for (let v = 0; v <= 100; v++) {
      const rank = orden.indexOf(util.etiquetaIndice(v));
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
    }
  });
  it('etiqueta y color cambian en los mismos umbrales', () => {
    for (let v = 1; v <= 100; v++) {
      const cambiaEtiqueta = util.etiquetaIndice(v) !== util.etiquetaIndice(v - 1);
      const cambiaColor = util.colorIndice(v) !== util.colorIndice(v - 1);
      expect(cambiaColor, `v=${v}`).toBe(cambiaEtiqueta);
    }
  });
});

describe('Supuesto: rumbos cardinales correctos para 0..360 grados', () => {
  it('cualquier rumbo devuelve una de las 16 direcciones', () => {
    for (let g = 0; g <= 360; g += 0.25) expect(util.gradosACardinal(g)).toMatch(/^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSO|SO|OSO|O|ONO|NO|NNO)$/);
  });
  it('puntos cardinales exactos', () => {
    expect(util.gradosACardinal(0)).toBe('N');
    expect(util.gradosACardinal(90)).toBe('E');
    expect(util.gradosACardinal(180)).toBe('S');
    expect(util.gradosACardinal(270)).toBe('O');
    expect(util.gradosACardinal(360)).toBe('N');
    expect(util.gradosACardinal(350)).toBe('N');
  });
  it('sin dato muestra guion', () => expect(util.gradosACardinal(null)).toBe('—'));
});

describe('Supuesto: refresco cada 30 min y caché "vieja" antes de eso (README)', () => {
  it('REFRESH_MS = 30 min', () => expect(CONFIG.REFRESH_MS).toBe(30 * 60 * 1000));
  it('STALE_MS no supera REFRESH_MS', () => expect(CONFIG.STALE_MS).toBeLessThanOrEqual(CONFIG.REFRESH_MS));
  it('hay timeout de red finito y razonable', () => {
    expect(CONFIG.FETCH_TIMEOUT_MS).toBeGreaterThan(0);
    expect(CONFIG.FETCH_TIMEOUT_MS).toBeLessThanOrEqual(60e3);
  });
  it('sin API key en ninguna URL (README: "sin API key")', () => {
    for (const u of Object.values(CONFIG.API)) expect(u).not.toMatch(/key|token/i);
  });
});
