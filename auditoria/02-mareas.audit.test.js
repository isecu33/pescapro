/* SUPUESTOS de mareas (README "Mareas" + fisica de la marea semidiurna):
   - se extraen pleamares/bajamares de la serie horaria con interpolacion
     parabolica => el instante y la altura deben acercarse a los verdaderos;
   - pleamar y bajamar se alternan, separadas ~6 h 12 min;
   - "media marea = maxima corriente": el flujo es maximo a mitad del
     semiciclo y minimo en los extremos;
   - la amplitud se clasifica en vivas/medias/muertas con MAREA_CLASES.
   La "verdad" es una marea sintetica cuyo resultado se conoce de antemano. */
import { describe, it, expect, afterEach } from 'vitest';
import { extremos, amplitud, estadoEn, analizar } from '../src/domain/mareas.js';
import { MAREA_CLASES } from '../src/domain/config.js';
import { HORA, MIN, PERIODO_M2, tanda, mareaSintetica, prng, local, fijarAhora, soltarReloj } from './util.js';

afterEach(soltarReloj);

const DESDE = local(2026, 7, 1, 0);
const PLEAMAR0 = DESDE.getTime() + 2.3 * HORA; // no cae en hora en punto: obliga a interpolar

function verdaderos(desde, horas, pleamar0, periodo = PERIODO_M2) {
  const fin = desde.getTime() + (horas - 1) * HORA;
  const out = [];
  for (let k = -2; k < 40; k++) {
    const t = pleamar0 + k * periodo / 2;
    if (t > desde.getTime() + HORA && t < fin - HORA) out.push({ tipo: k % 2 === 0 ? 'pleamar' : 'bajamar', t });
  }
  return out;
}

describe('Supuesto: extremos de una marea semidiurna pura', () => {
  const A = 1.5;
  const d = tanda({ desde: DESDE, horas: 120, marea: mareaSintetica({ amplitud: A, pleamar: PLEAMAR0 }) });
  const ex = extremos(d.horas);
  const verdad = verdaderos(DESDE, 120, PLEAMAR0);

  it('detecta todos los extremos verdaderos (ni falta ni sobra ninguno)', () => {
    expect(ex.length).toBe(verdad.length);
  });
  it('pleamar y bajamar se alternan', () => {
    for (let i = 1; i < ex.length; i++) expect(ex[i].tipo).not.toBe(ex[i - 1].tipo);
  });
  it('cada extremo cae a menos de 10 min de su instante real', () => {
    ex.forEach((e, i) => {
      expect(e.tipo).toBe(verdad[i].tipo);
      expect(Math.abs(e.fecha.getTime() - verdad[i].t) / MIN).toBeLessThan(10);
    });
  });
  it('la altura interpolada esta a menos de 3 cm de la real', () => {
    for (const e of ex) expect(Math.abs(Math.abs(e.altura) - A)).toBeLessThan(0.03);
  });
  it('separacion entre extremos consecutivos ~6 h 12 min (±20 min)', () => {
    for (let i = 1; i < ex.length; i++) {
      expect(Math.abs((ex[i].fecha - ex[i - 1].fecha) - PERIODO_M2 / 2) / MIN).toBeLessThan(20);
    }
  });
});

describe('Supuesto: marea mixta (desigualdad diurna) sigue alternando', () => {
  const d = tanda({ desde: DESDE, horas: 120, marea: mareaSintetica({ amplitud: 1.4, diurna: 0.3, pleamar: PLEAMAR0 }) });
  const ex = extremos(d.horas);
  it('alterna pleamar/bajamar y no hay dos extremos a menos de 4 h', () => {
    for (let i = 1; i < ex.length; i++) {
      expect(ex[i].tipo).not.toBe(ex[i - 1].tipo);
      expect(ex[i].fecha - ex[i - 1].fecha).toBeGreaterThan(4 * HORA);
    }
  });
});

describe('Supuesto: el modelo de nivel del mar trae algo de ruido (oleada, redondeo) y no debe inventar mareas', () => {
  // Open-Meteo entrega sea_level_height_msl con 2 decimales y con la
  // componente meteorologica incluida: variaciones de ~1 cm son normales.
  const r = prng(7);
  const m = mareaSintetica({ amplitud: 1.5, pleamar: PLEAMAR0 });
  const d = tanda({ desde: DESDE, horas: 120, marea: m });
  d.horas.forEach(h => { h.nivelMar = Math.round((h.nivelMar + (r() - 0.5) * 0.02) * 100) / 100; });
  const ex = extremos(d.horas);
  it('no aparecen pleamares/bajamares espurias (extremos separados > 4 h)', () => {
    for (let i = 1; i < ex.length; i++) {
      expect(ex[i].fecha - ex[i - 1].fecha, `extremos ${i - 1}->${i}`).toBeGreaterThan(4 * HORA);
    }
  });
  it('siguen alternandose', () => {
    for (let i = 1; i < ex.length; i++) expect(ex[i].tipo).not.toBe(ex[i - 1].tipo);
  });
});

describe('Supuesto: huecos en la serie marina no rompen el calculo', () => {
  const d = tanda({ desde: DESDE, horas: 72 });
  for (let i = 20; i < 24; i++) d.horas[i].nivelMar = null;
  it('no lanza y ningun extremo cae dentro del hueco', () => {
    const ex = extremos(d.horas);
    const ini = d.horas[20].fecha, fin = d.horas[23].fecha;
    for (const e of ex) expect(e.fecha >= ini && e.fecha <= fin).toBe(false);
  });
  it('serie vacia o plana => sin extremos y sin errores', () => {
    expect(extremos([])).toEqual([]);
    const plana = tanda({ desde: DESDE, horas: 24, marea: { nivel: () => 0.5 } });
    expect(extremos(plana.horas)).toEqual([]);
  });
});

describe('Supuesto: amplitud clasificada con MAREA_CLASES y coeficiente 20..120', () => {
  const casos = [1.0, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8, 4.6, 6.0];
  for (const rango of casos) {
    it(`rango ${rango} m -> clase y coeficiente correctos`, () => {
      const d = tanda({ desde: DESDE, horas: 48, marea: mareaSintetica({ amplitud: rango / 2, pleamar: PLEAMAR0 }) });
      const ex = extremos(d.horas);
      const a = amplitud(ex, new Date(DESDE.getTime() + 24 * HORA));
      expect(a.rango).toBeCloseTo(rango, 1);
      const esperada = MAREA_CLASES.find(c => rango - 0.05 <= c.max).clase;
      if (Math.abs(rango - 2.2) > 0.06 && Math.abs(rango - 3.4) > 0.06) expect(a.clase).toBe(esperada);
      expect(a.coef).toBeGreaterThanOrEqual(20);
      expect(a.coef).toBeLessThanOrEqual(120);
    });
  }
  it('el coeficiente nunca baja al aumentar la amplitud', () => {
    let prev = -1;
    for (let r = 0.4; r <= 6; r += 0.2) {
      const d = tanda({ desde: DESDE, horas: 48, marea: mareaSintetica({ amplitud: r / 2, pleamar: PLEAMAR0 }) });
      const c = amplitud(extremos(d.horas), new Date(DESDE.getTime() + 24 * HORA)).coef;
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
  it('sin extremos suficientes => null (no inventa una amplitud)', () => {
    expect(amplitud([], new Date())).toBeNull();
  });
});

describe('Supuesto: "media marea = maxima corriente" y fase coherente', () => {
  const d = tanda({ desde: DESDE, horas: 72, marea: mareaSintetica({ amplitud: 1.5, pleamar: PLEAMAR0 }) });
  const ex = extremos(d.horas);

  it('a mitad de semiciclo el flujo es ~1 y el nivel ~ nivel medio', () => {
    for (let i = 1; i < ex.length; i++) {
      const mitad = new Date((ex[i - 1].fecha.getTime() + ex[i].fecha.getTime()) / 2);
      const s = estadoEn(mitad, d.horas, ex);
      expect(s.flujo).toBeGreaterThan(0.99);
      expect(Math.abs(s.nivel - (ex[i - 1].altura + ex[i].altura) / 2)).toBeLessThan(0.02);
    }
  });
  it('junto a cada extremo el flujo es ~0 y la fase es la del extremo', () => {
    for (const e of ex.slice(0, -1)) {
      const s = estadoEn(new Date(e.fecha.getTime() + 5 * MIN), d.horas, ex);
      if (!s) continue;
      expect(s.flujo).toBeLessThan(0.05);
      expect(s.fase).toBe(e.tipo);
    }
  });
  it('subiendo <=> el siguiente extremo es pleamar; nivel entre ambos extremos', () => {
    for (let t = ex[0].fecha.getTime() + 1; t < ex.at(-1).fecha.getTime(); t += 17 * MIN) {
      const s = estadoEn(new Date(t), d.horas, ex);
      expect(s.subiendo).toBe(s.siguiente.tipo === 'pleamar');
      const lo = Math.min(s.anterior.altura, s.siguiente.altura) - 1e-9;
      const hi = Math.max(s.anterior.altura, s.siguiente.altura) + 1e-9;
      expect(s.nivel).toBeGreaterThanOrEqual(lo);
      expect(s.nivel).toBeLessThanOrEqual(hi);
      expect(s.frac).toBeGreaterThanOrEqual(0);
      expect(s.frac).toBeLessThanOrEqual(1);
      if (s.fase === 'subiendo') expect(s.subiendo).toBe(true);
      if (s.fase === 'bajando') expect(s.subiendo).toBe(false);
    }
  });
  it('el nivel interpolado sigue a la marea real (error < 10 cm)', () => {
    const m = mareaSintetica({ amplitud: 1.5, pleamar: PLEAMAR0 });
    for (let t = ex[0].fecha.getTime() + 1; t < ex.at(-1).fecha.getTime(); t += 23 * MIN) {
      expect(Math.abs(estadoEn(new Date(t), d.horas, ex).nivel - m.nivel(t))).toBeLessThan(0.10);
    }
  });
  it('fuera del rango de datos devuelve null (no extrapola)', () => {
    expect(estadoEn(new Date(DESDE.getTime() - 48 * HORA), d.horas, ex)).toBeNull();
  });
});

describe('Supuesto: analizar() ofrece los proximos extremos a partir de "ahora"', () => {
  it('proximos: como mucho 4, todos futuros y en orden', () => {
    const d = tanda({ desde: local(2026, 7, 1, 0), horas: 96 });
    fijarAhora(local(2026, 7, 2, 10, 17));
    const a = analizar(d);
    expect(a.proximos.length).toBeGreaterThan(0);
    expect(a.proximos.length).toBeLessThanOrEqual(4);
    for (let i = 0; i < a.proximos.length; i++) {
      expect(a.proximos[i].fecha.getTime()).toBeGreaterThan(Date.now());
      if (i) expect(a.proximos[i].fecha > a.proximos[i - 1].fecha).toBe(true);
    }
    expect(a.ahora).not.toBeNull();
  });
});
