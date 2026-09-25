/* SUPUESTOS astronomicos (README "Astronomia"): sol y luna calculados en
   local, fases lunares correctas, periodos solunares mayores = transitos
   (3 h) y menores = orto/ocaso lunar (1.5 h), "1 = periodo mayor".
   Referencias externas: efemerides publicadas (fases de sept. 2025) y
   horarios de sol aproximados de la costa cantabrica. */
import { describe, it, expect } from 'vitest';
import { sol, luna, transitosLuna, periodos, factorSolunar, momentoDelDia, curvaSolunar } from '../src/domain/solunar.js';
import { HORA, MIN, local } from './util.js';

const ZARAUTZ = { lat: 43.29, lon: -2.17 };

describe('Supuesto: fases lunares correctas (efemerides sept. 2025)', () => {
  const casos = [
    { utc: '2025-09-07T18:09:00Z', nombre: 'Luna llena', ilum: [97, 100] },
    { utc: '2025-09-14T10:33:00Z', nombre: 'Cuarto menguante', ilum: [40, 60] },
    { utc: '2025-09-21T19:54:00Z', nombre: 'Luna nueva', ilum: [0, 3] },
    { utc: '2025-09-29T23:54:00Z', nombre: 'Cuarto creciente', ilum: [40, 60] },
  ];
  for (const c of casos) {
    it(`${c.utc} -> ${c.nombre}`, () => {
      const l = luna(new Date(c.utc), ZARAUTZ.lat, ZARAUTZ.lon);
      expect(l.nombre).toBe(c.nombre);
      expect(l.iluminacion).toBeGreaterThanOrEqual(c.ilum[0]);
      expect(l.iluminacion).toBeLessThanOrEqual(c.ilum[1]);
    });
  }
  it('idx (usado por especies.luna[idx]) coincide con el nombre de la fase', () => {
    const esperado = { 'Luna nueva': 0, 'Creciente': 1, 'Cuarto creciente': 1, 'Gibosa creciente': 1, 'Luna llena': 2, 'Gibosa menguante': 3, 'Cuarto menguante': 3, 'Menguante': 3 };
    for (let d = 0; d < 30; d += 0.5) {
      const l = luna(new Date(Date.UTC(2025, 8, 1) + d * 24 * HORA), ZARAUTZ.lat, ZARAUTZ.lon);
      expect(l.idx).toBe(esperado[l.nombre]);
    }
  });
});

describe('Supuesto: amanecer/ocaso realistas en la costa cantabrica', () => {
  it('solsticio de verano en Zarautz: amanecer 6:00-7:00, ocaso 21:30-22:30 (hora local)', () => {
    const s = sol(local(2026, 6, 21, 12), ZARAUTZ.lat, ZARAUTZ.lon);
    const hA = s.amanecer.getHours() + s.amanecer.getMinutes() / 60;
    const hO = s.ocaso.getHours() + s.ocaso.getMinutes() / 60;
    expect(hA).toBeGreaterThan(6); expect(hA).toBeLessThan(7);
    expect(hO).toBeGreaterThan(21.5); expect(hO).toBeLessThan(22.5);
  });
  it('solsticio de invierno: amanecer 8:15-9:00, ocaso 17:00-17:45', () => {
    const s = sol(local(2026, 12, 21, 12), ZARAUTZ.lat, ZARAUTZ.lon);
    const hA = s.amanecer.getHours() + s.amanecer.getMinutes() / 60;
    const hO = s.ocaso.getHours() + s.ocaso.getMinutes() / 60;
    expect(hA).toBeGreaterThan(8.25); expect(hA).toBeLessThan(9);
    expect(hO).toBeGreaterThan(17); expect(hO).toBeLessThan(17.75);
  });
  it('orden: alba civil < amanecer < ocaso < crepusculo civil', () => {
    const s = sol(local(2026, 3, 15, 12), ZARAUTZ.lat, ZARAUTZ.lon);
    expect(s.albaCivil < s.amanecer && s.amanecer < s.ocaso && s.ocaso < s.crepusculoCivil).toBe(true);
  });
});

describe('Supuesto: momento del dia (amanecer/dia/atardecer/noche)', () => {
  const dia = local(2026, 9, 10, 12);
  const s = sol(dia, ZARAUTZ.lat, ZARAUTZ.lon);
  it('mediodia = dia, 3:00 = noche', () => {
    expect(momentoDelDia(local(2026, 9, 10, 14), ZARAUTZ.lat, ZARAUTZ.lon)).toBe('dia');
    expect(momentoDelDia(local(2026, 9, 10, 3), ZARAUTZ.lat, ZARAUTZ.lon)).toBe('noche');
  });
  it('en el instante del amanecer/ocaso = amanecer/atardecer', () => {
    expect(momentoDelDia(s.amanecer, ZARAUTZ.lat, ZARAUTZ.lon)).toBe('amanecer');
    expect(momentoDelDia(s.ocaso, ZARAUTZ.lat, ZARAUTZ.lon)).toBe('atardecer');
  });
  it('recorrido de 24 h: solo 4 valores y en el orden natural noche->amanecer->dia->atardecer->noche', () => {
    const seq = [];
    for (let t = local(2026, 9, 10, 0).getTime(); t < local(2026, 9, 11, 0).getTime(); t += 5 * MIN) {
      const m = momentoDelDia(new Date(t), ZARAUTZ.lat, ZARAUTZ.lon);
      if (seq.at(-1) !== m) seq.push(m);
    }
    expect(seq).toEqual(['noche', 'amanecer', 'dia', 'atardecer', 'noche']);
  });
});

describe('Supuesto: transitos lunares (culminaciones) y periodos solunares', () => {
  it('cada dia hay entre 1 y 3 culminaciones (superiores + inferiores)', () => {
    for (let d = 1; d <= 30; d++) {
      const tr = transitosLuna(local(2026, 4, d, 12), ZARAUTZ.lat, ZARAUTZ.lon);
      expect(tr.length).toBeGreaterThanOrEqual(1);
      expect(tr.length).toBeLessThanOrEqual(3);
    }
  });
  it('superiores de dias consecutivos separadas ~24 h 50 min (±30 min)', () => {
    const sup = [];
    for (let d = 1; d <= 10; d++) {
      transitosLuna(local(2026, 4, d, 12), ZARAUTZ.lat, ZARAUTZ.lon)
        .filter(t => t.tipo === 'superior').forEach(t => sup.push(t.fecha.getTime()));
    }
    for (let i = 1; i < sup.length; i++) {
      expect(Math.abs(sup[i] - sup[i - 1] - 24.84 * HORA) / MIN).toBeLessThan(30);
    }
  });
  it('mayor = 3 h centrado en el transito; menor = 1.5 h; ordenados por inicio', () => {
    const ps = periodos(local(2026, 4, 10, 12), ZARAUTZ.lat, ZARAUTZ.lon);
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const dur = (p.fin - p.inicio) / MIN;
      expect(dur).toBe(p.tipo === 'mayor' ? 180 : 90);
      expect((p.inicio.getTime() + p.fin.getTime()) / 2).toBe(p.centro.getTime());
      if (i) expect(p.inicio >= ps[i - 1].inicio).toBe(true);
    }
  });
});

describe('Supuesto: factor solunar "1 = periodo mayor", menor intermedio, fuera bajo', () => {
  const h = (hh, mm = 0) => local(2026, 4, 10, hh, mm);
  it('valores por tipo de periodo', () => {
    const ps = [
      { tipo: 'mayor', inicio: h(10), fin: h(13), centro: h(11, 30) },
      { tipo: 'menor', inicio: h(18), fin: h(19, 30), centro: h(18, 45) },
    ];
    expect(factorSolunar(h(11), ps)).toBe(1);
    expect(factorSolunar(h(19), ps)).toBe(0.75);
    expect(factorSolunar(h(15), ps)).toBeLessThan(0.75);
  });
  it('con periodos reales de todo 2026, dentro de un periodo mayor el factor siempre es 1', () => {
    // factorSolunar devuelve el primer periodo que contiene la hora; si un
    // menor empezara antes y se solapara con un mayor, puntuaria 0.75. Se
    // comprueba con datos reales en costas espanolas (norte, sur, Canarias).
    const SPOTS = [[43.29, -2.17], [36.53, -6.3], [28.1, -15.43]];
    for (const [lat, lon] of SPOTS) {
      for (let d = 0; d < 365; d += 3) {
        const ps = periodos(local(2026, 1, 1 + d, 12), lat, lon);
        for (const p of ps.filter(x => x.tipo === 'mayor')) {
          for (let t = p.inicio.getTime(); t <= p.fin.getTime(); t += 15 * MIN) {
            expect(factorSolunar(new Date(t), ps)).toBe(1);
          }
        }
      }
    }
  });
});

describe('Supuesto: curva solunar de 24 h para la grafica', () => {
  const c = curvaSolunar(local(2026, 6, 21, 12), ZARAUTZ.lat, ZARAUTZ.lon);
  it('73 puntos cubriendo 24 h exactas', () => {
    expect(c.xData.length).toBe(73);
    expect(c.xData.at(-1) - c.xData[0]).toBe(24 * 3600);
  });
  it('altitudes en [-90, 90] y el sol culmina cerca del mediodia solar (13:30-14:45 CEST en Zarautz)', () => {
    for (const a of [...c.solData, ...c.lunaData]) { expect(a).toBeGreaterThanOrEqual(-90); expect(a).toBeLessThanOrEqual(90); }
    const iMax = c.solData.indexOf(Math.max(...c.solData));
    const t = new Date(c.xData[iMax] * 1000);
    const hh = t.getHours() + t.getMinutes() / 60;
    expect(hh).toBeGreaterThan(13.5); expect(hh).toBeLessThan(14.75);
    expect(Math.max(...c.solData)).toBeGreaterThan(65); // 90-43.3+23.4 ~ 70
  });
});
