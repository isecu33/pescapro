/* SUPUESTOS del indice de pesca (README "Indice de pesca" y "Seguridad"):
   - cada factor se puntua 0..1 y se pondera: indice entero en 0..100;
   - "con viento > 45 km/h, rachas > 60, olas > 3 m o tormenta, el indice
     se capa y aparece un aviso rojo";
   - salir del rango optimo de viento/oleaje nunca mejora el indice;
   - bajada suave de presion = actividad, caida brusca = temporal;
   - la tira de dias empieza HOY y resume cada dia calendario;
   - las "mejores ventanas" son tramos seguidos por encima del umbral.
   Se comprueba a varias horas del dia porque el resultado no debe depender
   de a que hora abre el usuario la app. */
import { describe, it, expect, afterEach } from 'vitest';
import { preparar, factores, indiceHora, seguridad, serie, diasDisponibles, resumenDias, mejoresVentanas } from '../src/domain/indice.js';
import { MODOS, SEGURIDAD, WMO, util } from '../src/domain/config.js';
import { HORA, tanda, horaBase, prng, entre, local, fijarAhora, soltarReloj } from './util.js';

afterEach(soltarReloj);

const MODALIDADES = Object.keys(MODOS);
const CODIGOS = Object.keys(WMO).map(Number);

function contexto(opts) {
  const desde = opts?.desde || local(2026, 7, 1, 0);
  return preparar(tanda({ desde, horas: opts?.horas || 144, porHora: opts?.porHora }));
}

describe('Supuesto: indice entero en 0..100 y factores en 0..1 para cualquier entrada', () => {
  const ctx = contexto();
  const r = prng(42);
  it('fuzz de 1500 horas con valores extremos y nulos', () => {
    for (let i = 0; i < 1500; i++) {
      const fecha = ctx.datos.horas[Math.floor(r() * ctx.datos.horas.length)].fecha;
      const nulo = () => r() < 0.1;
      const h = horaBase(fecha, {
        viento: nulo() ? null : entre(r, 0, 90),
        racha: nulo() ? null : entre(r, 0, 130),
        ola: nulo() ? null : entre(r, 0, 8),
        sst: nulo() ? null : entre(r, 4, 30),
        nubes: nulo() ? null : entre(r, 0, 100),
        lluvia: nulo() ? null : entre(r, 0, 30),
        codigo: nulo() ? null : CODIGOS[Math.floor(r() * CODIGOS.length)],
        corriente: nulo() ? null : entre(r, 0, 2),
        presionTend: nulo() ? null : entre(r, -15, 15),
      });
      for (const modo of MODALIDADES) {
        const res = indiceHora(h, modo, ctx);
        expect(Number.isInteger(res.valor), JSON.stringify(h)).toBe(true);
        expect(res.valor).toBeGreaterThanOrEqual(0);
        expect(res.valor).toBeLessThanOrEqual(100);
        for (const k of Object.keys(MODOS[modo].pesos)) {
          expect(res.factores[k], k).toBeGreaterThanOrEqual(0);
          expect(res.factores[k], k).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it('cada peso de la modalidad tiene su factor calculado (no se cuela el 0.5 por defecto)', () => {
    const h = ctx.datos.horas[30];
    for (const modo of MODALIDADES) {
      const f = factores(h, modo, ctx);
      for (const k of Object.keys(MODOS[modo].pesos)) expect(f[k], `${modo}.${k}`).toBeTypeOf('number');
    }
  });
});

describe('Supuesto de seguridad del README (aviso rojo + indice capado)', () => {
  const ctx = contexto();
  const fecha = ctx.datos.horas[40].fecha;
  const peligrosos = {
    'viento 46 km/h': { viento: 46, racha: 50 },
    'racha 61 km/h': { racha: 61 },
    'ola 3.1 m': { ola: 3.1 },
    'tormenta (95)': { codigo: 95 },
    'tormenta con granizo (96)': { codigo: 96 },
    'tormenta fuerte (99)': { codigo: 99 },
  };
  for (const [nombre, extra] of Object.entries(peligrosos)) {
    it(`${nombre}: rojo con motivo, e indice <= ${SEGURIDAD.capRojo} en todas las modalidades`, () => {
      const h = horaBase(fecha, extra);
      const s = seguridad(h);
      expect(s.nivel).toBe('rojo');
      expect(s.motivos.length).toBeGreaterThan(0);
      for (const modo of MODALIDADES) expect(indiceHora(h, modo, ctx).valor).toBeLessThanOrEqual(SEGURIDAD.capRojo);
    });
  }
  it('justo por debajo de rojo no se capa ni da rojo', () => {
    const h = horaBase(fecha, { viento: 44, racha: 59, ola: 2.9 });
    expect(seguridad(h).nivel).toBe('amarillo');
  });
  it('condiciones tranquilas: nivel ok y sin motivos', () => {
    const s = seguridad(horaBase(fecha));
    expect(s).toEqual({ nivel: 'ok', motivos: [] });
  });
  it('umbral exacto: README dice "viento > 45, rachas > 60, olas > 3 m" (estricto)', () => {
    expect(seguridad(horaBase(fecha, { viento: 45 })).nivel).not.toBe('rojo');
    expect(seguridad(horaBase(fecha, { racha: 60 })).nivel).not.toBe('rojo');
    expect(seguridad(horaBase(fecha, { ola: 3.0 })).nivel).not.toBe('rojo');
  });
  it('amarillo por viento, racha, ola o lluvia fuerte', () => {
    expect(seguridad(horaBase(fecha, { viento: 35 })).nivel).toBe('amarillo');
    expect(seguridad(horaBase(fecha, { racha: 50 })).nivel).toBe('amarillo');
    expect(seguridad(horaBase(fecha, { ola: 2.5 })).nivel).toBe('amarillo');
    for (const c of SEGURIDAD.codigosLluviaFuerte) expect(seguridad(horaBase(fecha, { codigo: c })).nivel).toBe('amarillo');
  });
  it('rojo manda sobre amarillo aunque coincidan', () => {
    expect(seguridad(horaBase(fecha, { viento: 35, ola: 3.5 })).nivel).toBe('rojo');
  });
});

describe('Supuesto: fuera del rango optimo, mas viento/mas mar nunca mejora el indice', () => {
  const ctx = contexto();
  const fecha = ctx.datos.horas[50].fecha;
  for (const modo of MODALIDADES) {
    const M = MODOS[modo];
    it(`${modo}: viento por encima de ${M.vientoOK[2]} km/h`, () => {
      let prev = Infinity;
      for (let v = M.vientoOK[2]; v <= 44; v += 1) {
        const x = indiceHora(horaBase(fecha, { viento: v, racha: Math.min(v, 44) }), modo, ctx).valor;
        expect(x, `viento ${v}`).toBeLessThanOrEqual(prev);
        prev = x;
      }
    });
    it(`${modo}: oleaje por encima de ${M.oleajeOK[2]} m`, () => {
      let prev = Infinity;
      for (let o = M.oleajeOK[2]; o <= 2.95; o += 0.05) {
        const x = indiceHora(horaBase(fecha, { ola: o }), modo, ctx).valor;
        expect(x, `ola ${o}`).toBeLessThanOrEqual(prev);
        prev = x;
      }
    });
    it(`${modo}: una tormenta nunca sube el indice`, () => {
      const sin = indiceHora(horaBase(fecha), modo, ctx).valor;
      const con = indiceHora(horaBase(fecha, { codigo: 95 }), modo, ctx).valor;
      expect(con).toBeLessThan(sin);
    });
  }
  it('eging (calamar/sepia, "agua en calma y clara"): mar en calma puntua mas que mar movido', () => {
    const calma = indiceHora(horaBase(fecha, { ola: 0.3 }), 'eging', ctx).valor;
    const movido = indiceHora(horaBase(fecha, { ola: 1.6 }), 'eging', ctx).valor;
    expect(calma).toBeGreaterThan(movido);
  });
  it('spinning ("mar movido moderado activa a los depredadores"): 1 m puntua mas que plato', () => {
    const plato = indiceHora(horaBase(fecha, { ola: 0.05 }), 'spinning', ctx).valor;
    const movido = indiceHora(horaBase(fecha, { ola: 1.0 }), 'spinning', ctx).valor;
    expect(movido).toBeGreaterThan(plato);
  });
});

describe('Supuesto: tendencia de presion (bajada suave = pre-frente = actividad)', () => {
  const ctx = contexto();
  const fecha = ctx.datos.horas[60].fecha;
  const v = (t) => indiceHora(horaBase(fecha, { presionTend: t }), 'spinning', ctx).factores.presion;
  it('bajada suave > estable > subida fuerte, y caida brusca penaliza', () => {
    expect(v(-3)).toBeGreaterThan(v(0));
    expect(v(0)).toBeGreaterThan(v(5));
    expect(v(-3)).toBeGreaterThan(v(-8));
  });
  it('preparar() anota la tendencia como p(t) - p(t-6h)', () => {
    const c = contexto({ porHora: (f, i) => ({ presion: 1000 + i * 0.5 }) });
    const hs = c.datos.horas;
    expect(hs[0].presionTend).toBeNull();
    expect(hs[10].presionTend).toBeCloseTo(3, 9);
  });
});

/* ---- tira de dias y serie: dependen de "ahora" ---- */
const HORAS_DEL_DIA = [[0, 30], [1, 30], [6, 0], [12, 0], [18, 30], [23, 30]];

describe('Supuesto: la serie cubre las horas futuras (y 2 h pasadas), en orden', () => {
  for (const [hh, mm] of HORAS_DEL_DIA) {
    it(`a las ${hh}:${String(mm).padStart(2, '0')}`, () => {
      const ctx = contexto({ desde: local(2026, 7, 1, 0) });
      fijarAhora(local(2026, 7, 3, hh, mm));
      const s = serie(ctx, 'spinning');
      const futuras = ctx.datos.horas.filter(h => h.fecha.getTime() >= Date.now()).length;
      expect(s.length).toBeGreaterThanOrEqual(futuras);
      for (let i = 0; i < s.length; i++) {
        expect(s[i].hora.fecha.getTime()).toBeGreaterThanOrEqual(Date.now() - 2 * HORA);
        if (i) expect(s[i].hora.fecha > s[i - 1].hora.fecha).toBe(true);
      }
    });
  }
});

describe('Supuesto: la tira de proximos dias empieza HOY y resume cada dia calendario', () => {
  for (const [hh, mm] of HORAS_DEL_DIA) {
    describe(`abriendo la app a las ${hh}:${String(mm).padStart(2, '0')}`, () => {
      const hoy = local(2026, 7, 3);
      const manana = local(2026, 7, 4);
      // tormenta SOLO manana de 14:00 a 16:00
      const porHora = (f) => (util.esMismoDia(f, manana) && f.getHours() >= 14 && f.getHours() <= 16)
        ? { codigo: 95, viento: 55, racha: 75 } : {};
      const preparar_ = () => {
        const ctx = contexto({ desde: local(2026, 7, 1, 0), porHora });
        fijarAhora(local(2026, 7, 3, hh, mm));
        return ctx;
      };
      it('el primer dia es hoy y los dias son consecutivos sin repetir', () => {
        const ctx = preparar_();
        const dias = diasDisponibles(ctx, 'spinning');
        expect(util.esMismoDia(dias[0], hoy), `primer dia = ${dias[0].toDateString()}`).toBe(true);
        for (let i = 1; i < dias.length; i++) {
          const esperado = new Date(dias[i - 1]); esperado.setDate(esperado.getDate() + 1);
          expect(util.esMismoDia(dias[i], esperado)).toBe(true);
        }
      });
      it('el aviso rojo aparece en manana (la tormenta) y NO en hoy', () => {
        const ctx = preparar_();
        const res = resumenDias(ctx, 'spinning');
        const rHoy = res.find(x => util.esMismoDia(x.fecha, hoy));
        const rManana = res.find(x => util.esMismoDia(x.fecha, manana));
        expect(rHoy?.aviso).toBe(false);
        expect(rManana?.aviso).toBe(true);
      });
      it('el pico de cada dia es el maximo de la serie de ese dia', () => {
        const ctx = preparar_();
        const s = serie(ctx, 'spinning');
        for (const r of resumenDias(ctx, 'spinning')) {
          const max = Math.max(...s.filter(x => util.esMismoDia(x.hora.fecha, r.fecha)).map(x => x.valor));
          expect(r.max).toBe(max);
        }
      });
    });
  }
});

describe('Supuesto: mejores ventanas = tramos seguidos >= umbral, sin horas en rojo', () => {
  for (const [hh, mm] of HORAS_DEL_DIA) {
    it(`invariantes a las ${hh}:${String(mm).padStart(2, '0')}`, () => {
      const r = prng(hh * 100 + mm);
      const ctx = contexto({
        desde: local(2026, 7, 1, 0),
        porHora: () => ({ viento: entre(r, 0, 50), ola: entre(r, 0.1, 3.5), codigo: r() < 0.05 ? 95 : 2 }),
      });
      fijarAhora(local(2026, 7, 3, hh, mm));
      const umbral = 45;
      const s = serie(ctx, 'spinning');
      const v = mejoresVentanas(ctx, 'spinning', { umbral, horas: 72, maxVentanas: 6 });
      expect(v.length).toBeLessThanOrEqual(6);
      for (let i = 0; i < v.length; i++) {
        const w = v[i];
        if (i) expect(w.inicio > v[i - 1].fin).toBe(true); // ordenadas y sin solaparse
        const dentro = s.filter(x => x.hora.fecha >= w.inicio && x.hora.fecha <= w.fin);
        expect(dentro.length).toBe(w.n);
        for (const x of dentro) {
          expect(x.valor).toBeGreaterThanOrEqual(umbral);
          expect(x.seguridad.nivel).not.toBe('rojo');
        }
        expect(w.max).toBe(Math.max(...dentro.map(x => x.valor)));
        expect(w.media).toBeGreaterThanOrEqual(umbral);
        expect(w.media).toBeLessThanOrEqual(w.max);
        expect(w.fin.getTime()).toBeLessThanOrEqual(Date.now() + 72 * HORA);
      }
    });
  }
});
