/* SUPUESTOS de especies (README "Especies" y cabecera de especies.js):
   - cada especie define temporada (12 meses), agua (SST), mar, marea, luz y
     luna, y su actividad es una media geometrica ponderada => 0..100;
   - fuera de temporada la actividad es 0;
   - mejores condiciones en un factor (a igualdad del resto) nunca bajan la
     actividad;
   - eging = "Calamar y sepia" (config.js);
   - los textos visibles se muestran bien (sin caracteres corruptos). */
import { describe, it, expect, afterEach } from 'vitest';
import { ESPECIES, especiePorId } from '../src/domain/especies.js';
import { MODOS } from '../src/domain/config.js';
import { preparar, actividadEspecie, especiesEn, mejoresHorasEspecie } from '../src/domain/indice.js';
import { HORA, tanda, horaBase, prng, entre, local, fijarAhora, soltarReloj } from './util.js';

afterEach(soltarReloj);

const FASES = ['subiendo', 'bajando', 'pleamar', 'bajamar'];
const MOMENTOS = ['amanecer', 'dia', 'atardecer', 'noche'];
const MOJIBAKE = /Ã.|â€|Â[^\w]|�/;

describe('Supuesto: ficha de especie completa y coherente', () => {
  it('ids unicos y especiePorId los encuentra; id desconocido => null', () => {
    const ids = ESPECIES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(especiePorId(id).id).toBe(id);
    expect(especiePorId('no-existe')).toBeNull();
  });
  for (const e of ESPECIES) {
    describe(e.id, () => {
      it('temporada: 12 meses en 0..1 y algun mes con actividad', () => {
        expect(e.meses).toHaveLength(12);
        for (const m of e.meses) { expect(m).toBeGreaterThanOrEqual(0); expect(m).toBeLessThanOrEqual(1); }
        expect(Math.max(...e.meses)).toBeGreaterThan(0.5);
      });
      it('trapecios SST y oleaje ordenados', () => {
        for (const k of ['sst', 'oleaje']) {
          const [a, b, c, d] = e[k];
          expect(a <= b && b <= c && c <= d && a < d, `${k}=${e[k]}`).toBe(true);
        }
      });
      it('preferencias de marea para las 4 fases que produce mareas.js', () => {
        expect(Object.keys(e.marea).sort()).toEqual([...FASES].sort());
      });
      it('preferencias de momento para los 4 momentos que produce solunar.js', () => {
        expect(Object.keys(e.momento).sort()).toEqual([...MOMENTOS].sort());
      });
      it('luna: 4 valores (nueva, creciente, llena, menguante) en 0..1', () => {
        expect(e.luna).toHaveLength(4);
        for (const v of e.luna) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      });
      it('modalidades existentes', () => {
        expect(e.modos.length).toBeGreaterThan(0);
        for (const m of e.modos) expect(Object.keys(MODOS)).toContain(m);
      });
      it('talla/peso minimos positivos o nulos', () => {
        const r = e.reglamento || {};
        if (r.tallaMin != null) expect(r.tallaMin).toBeGreaterThan(0);
        if (r.pesoMin != null) expect(r.pesoMin).toBeGreaterThan(0);
      });
      it('textos visibles sin caracteres corruptos (mojibake)', () => {
        const textos = [];
        (function recoger(o) {
          for (const v of Object.values(o)) {
            if (typeof v === 'string') textos.push(v);
            else if (v && typeof v === 'object') recoger(v);
          }
        })(e);
        for (const t of textos) expect(t, t).not.toMatch(MOJIBAKE);
      });
    });
  }
  it('eging es la modalidad de calamar y sepia (config.js: "Calamar y sepia")', () => {
    expect(especiePorId('calamar').modos).toContain('eging');
    expect(especiePorId('sepia').modos).toContain('eging');
  });
});

describe('Supuesto: actividad por especie 0..100, 0 fuera de temporada', () => {
  const ctx = preparar(tanda({ desde: local(2026, 7, 1, 0), horas: 120 }));
  const r = prng(3);
  it('fuzz: siempre entero en 0..100 con motivo', () => {
    for (let i = 0; i < 800; i++) {
      const f = ctx.datos.horas[Math.floor(r() * ctx.datos.horas.length)].fecha;
      const h = horaBase(f, { sst: r() < 0.1 ? null : entre(r, 4, 30), ola: r() < 0.1 ? null : entre(r, 0, 6) });
      for (const e of ESPECIES) {
        const a = actividadEspecie(e, h, ctx);
        expect(Number.isInteger(a.valor)).toBe(true);
        expect(a.valor).toBeGreaterThanOrEqual(0);
        expect(a.valor).toBeLessThanOrEqual(100);
        expect(a.motivo).toBeTruthy();
      }
    }
  });
  it('mes con temporada 0 => actividad 0 "Fuera de temporada"', () => {
    const esp = { ...ESPECIES[0], meses: Array(12).fill(0) };
    const a = actividadEspecie(esp, ctx.datos.horas[30], ctx);
    expect(a.valor).toBe(0);
    expect(a.motivo).toMatch(/temporada/i);
  });
});

describe('Supuesto: mejores condiciones en un factor nunca bajan la actividad', () => {
  const ctx = preparar(tanda({ desde: local(2026, 7, 1, 0), horas: 120 }));
  const h = ctx.datos.horas[40];
  for (const e of ESPECIES) {
    it(`${e.id}: SST dentro de su optimo >= SST fuera de rango`, () => {
      const dentro = actividadEspecie(e, { ...h, sst: (e.sst[1] + e.sst[2]) / 2 }, ctx).valor;
      const fuera = actividadEspecie(e, { ...h, sst: e.sst[3] + 3 }, ctx).valor;
      expect(dentro).toBeGreaterThanOrEqual(fuera);
    });
    it(`${e.id}: mas temporada => mas actividad`, () => {
      const mes = h.fecha.getMonth();
      const baja = { ...e, meses: e.meses.map((v, i) => (i === mes ? 0.3 : v)) };
      const alta = { ...e, meses: e.meses.map((v, i) => (i === mes ? 1.0 : v)) };
      expect(actividadEspecie(alta, h, ctx).valor).toBeGreaterThan(actividadEspecie(baja, h, ctx).valor);
    });
  }
  it('la fase de marea preferida da mas actividad que la no preferida (resto igual)', () => {
    const esp = { ...ESPECIES[0], marea: { subiendo: 1, bajando: 0.5, pleamar: 0.5, bajamar: 0.1 },
      momento: { amanecer: 1, dia: 1, atardecer: 1, noche: 1 }, luna: [1, 1, 1, 1] };
    const porFase = {};
    for (const hh of ctx.datos.horas) {
      const em = ctx.mareas.estadoEn(hh.fecha);
      if (em && !porFase[em.fase]) porFase[em.fase] = hh;
    }
    expect(porFase.subiendo && porFase.bajamar).toBeTruthy();
    expect(actividadEspecie(esp, porFase.subiendo, ctx).valor).toBeGreaterThan(actividadEspecie(esp, porFase.bajamar, ctx).valor);
  });
});

describe('Supuesto: ranking de especies y mejores horas', () => {
  it('especiesEn incluye todas las especies ordenadas de mas a menos activa', () => {
    const ctx = preparar(tanda({ desde: local(2026, 7, 1, 0), horas: 120 }));
    const rk = especiesEn(local(2026, 7, 2, 7), ctx);
    expect(rk.length).toBe(ESPECIES.length);
    for (let i = 1; i < rk.length; i++) expect(rk[i].act.valor).toBeLessThanOrEqual(rk[i - 1].act.valor);
  });
  it('mejoresHorasEspecie: <= 5, futuras dentro de la ventana, en orden y realmente las mejores', () => {
    const ctx = preparar(tanda({ desde: local(2026, 7, 1, 0), horas: 144 }));
    fijarAhora(local(2026, 7, 2, 9, 20));
    for (const e of ESPECIES) {
      const mh = mejoresHorasEspecie(e, ctx, 48);
      expect(mh.length).toBeLessThanOrEqual(5);
      const candidatas = ctx.datos.horas.filter(h => h.fecha.getTime() >= Date.now() && h.fecha.getTime() <= Date.now() + 48 * HORA);
      const peorElegida = Math.min(...mh.map(x => x.act.valor));
      const elegidas = new Set(mh.map(x => x.hora));
      for (const h of candidatas) if (!elegidas.has(h)) expect(actividadEspecie(e, h, ctx).valor).toBeLessThanOrEqual(peorElegida);
      for (let i = 0; i < mh.length; i++) {
        expect(mh[i].hora.fecha.getTime()).toBeGreaterThanOrEqual(Date.now());
        if (i) expect(mh[i].hora.fecha > mh[i - 1].hora.fecha).toBe(true);
      }
    }
  });
});
