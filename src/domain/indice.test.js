import { describe, it, expect } from 'vitest';
import { preparar, factores, indiceHora, serie, mejoresVentanas, diasDisponibles, actividadEspecie, especiesEn, mejoresHorasEspecie } from './indice.js';
import { MODOS, SEGURIDAD } from './config.js';
import { ESPECIES, especiePorId } from './especies.js';
import { generarDatos } from './__fixtures__.js';

// Porta 1:1 los asserts de test/test_indice.js (excepto los 3 de fusionar(),
// ya cubiertos por src/domain/api.test.js, y los 3 solunar-only, ya
// cubiertos por src/domain/solunar.test.js) mas los 7 asserts de
// test/test_especies.js que dependen de PP.indice (diferidos desde Fase1A
// porque mezclan especies.js + indice.js).

describe('indice: conversion 1:1 desde www/js/indice.js', () => {
  const datos = generarDatos({ viento: 10, ola: 1.0, sst: 15 });
  const ctx = preparar(datos);

  it('indice siempre entre 0 y 100, factores siempre entre 0 y 1 (todas horas y modalidades)', () => {
    let enRango = true, factoresOK = true;
    for (const modo of Object.keys(MODOS)) {
      for (const h of datos.horas) {
        const r = indiceHora(h, modo, ctx);
        if (!(r.valor >= 0 && r.valor <= 100)) enRango = false;
        for (const k in r.factores) {
          if (k.startsWith('_')) continue;
          const v = r.factores[k];
          if (typeof v === 'number' && (v < 0 || v > 1.0001)) factoresOK = false;
        }
      }
    }
    expect(enRango).toBe(true);
    expect(factoresOK).toBe(true);
  });

  it('tormenta: seguridad roja y capado en las 3 modalidades', () => {
    const datosT = generarDatos({ tormentaEn: 30 });
    const ctxT = preparar(datosT);
    const hTormenta = datosT.horas[30];
    for (const modo of Object.keys(MODOS)) {
      const r = indiceHora(hTormenta, modo, ctxT);
      expect(r.seguridad.nivel).toBe('rojo');
      expect(r.valor).toBeLessThanOrEqual(SEGURIDAD.capRojo);
    }
  });

  it('eging: factor oleaje mejor en calma que con mar gruesa', () => {
    const hCalma = Object.assign({}, datos.horas[40], { ola: 0.3, viento: 6 });
    const hGruesa = Object.assign({}, datos.horas[40], { ola: 2.4, viento: 6 });
    const fCalma = factores(hCalma, 'eging', ctx);
    const fGruesa = factores(hGruesa, 'eging', ctx);
    expect(fCalma.oleaje).toBeGreaterThan(fGruesa.oleaje);
  });

  it('spinning: mar movido moderado puntua mejor que mar plato', () => {
    const fMovido = factores(Object.assign({}, datos.horas[40], { ola: 1.2 }), 'spinning', ctx);
    const fPlato = factores(Object.assign({}, datos.horas[40], { ola: 0.05 }), 'spinning', ctx);
    expect(fMovido.oleaje).toBeGreaterThan(fPlato.oleaje);
  });

  it('presion bajando suave puntua mejor que subiendo fuerte', () => {
    const hBaja = Object.assign({}, datos.horas[40], { presionTend: -2 });
    const hSube = Object.assign({}, datos.horas[40], { presionTend: 5 });
    expect(factores(hBaja, 'spinning', ctx).presion).toBeGreaterThan(factores(hSube, 'spinning', ctx).presion);
  });

  it('serie() cubre las horas futuras y mejoresVentanas() devuelve <=6 ordenadas', () => {
    const s = serie(ctx, 'spinning');
    expect(s.length).toBeGreaterThan(80);
    const vents = mejoresVentanas(ctx, 'spinning');
    expect(Array.isArray(vents)).toBe(true);
    expect(vents.length).toBeLessThanOrEqual(6);
    for (let i = 1; i < vents.length; i++) expect(vents[i].inicio >= vents[i - 1].inicio).toBe(true);
  });

  it('diasDisponibles() devuelve un dia por cada fecha calendario de la serie, sin huecos ni duplicados', () => {
    const dias = diasDisponibles(ctx, 'spinning');
    expect(dias.length).toBeGreaterThan(0);
    // Cada entrada es medianoche local (para poder usarla como min/max de un date-picker)
    dias.forEach(d => {
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });
    // Orden estrictamente ascendente, sin dias repetidos
    for (let i = 1; i < dias.length; i++) expect(dias[i].getTime()).toBeGreaterThan(dias[i - 1].getTime());
  });

  it('las horas de temporal no aparecen como buenas ventanas', () => {
    const datosT = generarDatos({ tormentaEn: 30 });
    const ctxT = preparar(datosT);
    const ventsT = mejoresVentanas(ctxT, 'spinning');
    const tormentaFuera = ventsT.every(v => Math.abs(v.inicio - datosT.horas[30].fecha) > 0 || v.max <= SEGURIDAD.capRojo);
    expect(tormentaFuera).toBe(true);
  });

  it('fix MEDIUM: factor viento a 0 km/h es ~0 para spinning (antes 0.2 por el -1 fijo)', () => {
    const hCalmaTotal = Object.assign({}, datos.horas[40], { viento: 0 });
    const f = factores(hCalmaTotal, 'spinning', ctx);
    expect(f.viento).toBeLessThan(0.01);
  });

  it('fix MEDIUM: eging sigue dando factor viento maximo a 0 km/h (vientoOK=[0,0,12,22], min===opt1)', () => {
    const hCalmaTotal = Object.assign({}, datos.horas[40], { viento: 0 });
    const f = factores(hCalmaTotal, 'eging', ctx);
    expect(f.viento).toBe(1);
  });
});

describe('indice + especies: asserts de test/test_especies.js diferidos desde Fase1A', () => {
  const datos = generarDatos({ sst: 15, ola: 0.8 });
  const ctx = preparar(datos);

  it('actividad de todas las especies siempre entre 0 y 100', () => {
    let rango = true;
    for (const e of ESPECIES) {
      for (let i = 0; i < datos.horas.length; i += 5) {
        const a = actividadEspecie(e, datos.horas[i], ctx);
        if (!(a.valor >= 0 && a.valor <= 100)) rango = false;
      }
    }
    expect(rango).toBe(true);
  });

  it('calamar: noche de noviembre en calma >> mediodia de julio con mar', () => {
    const calamar = especiePorId('calamar');
    const hOtono = Object.assign({}, datos.horas[10]);
    hOtono.fecha = new Date(new Date().getFullYear(), 10, 15, 20, 0);
    hOtono.sst = 15; hOtono.ola = 0.3;
    const hVerano = Object.assign({}, datos.horas[10]);
    hVerano.fecha = new Date(new Date().getFullYear(), 6, 15, 13, 0);
    hVerano.sst = 22; hVerano.ola = 1.8;
    const aOtono = actividadEspecie(calamar, hOtono, ctx);
    const aVerano = actividadEspecie(calamar, hVerano, ctx);
    expect(aOtono.valor).toBeGreaterThan(aVerano.valor + 25);
  });

  it('lubina: mar movido activa mas que mar plato total', () => {
    const lubina = especiePorId('lubina');
    const hMovida = Object.assign({}, datos.horas[10], { ola: 1.3 });
    const hPlato = Object.assign({}, datos.horas[10], { ola: 0.05 });
    const aMovida = actividadEspecie(lubina, hMovida, ctx);
    const aPlato = actividadEspecie(lubina, hPlato, ctx);
    expect(aMovida.valor).toBeGreaterThan(aPlato.valor);
  });

  it('faneca: enero mas activo que julio', () => {
    const faneca = especiePorId('faneca');
    const hInv = Object.assign({}, datos.horas[10]);
    hInv.fecha = new Date(new Date().getFullYear(), 0, 10, 22, 0); hInv.sst = 12;
    const hVer = Object.assign({}, datos.horas[10]);
    hVer.fecha = new Date(new Date().getFullYear(), 6, 10, 22, 0); hVer.sst = 21;
    expect(actividadEspecie(faneca, hInv, ctx).valor).toBeGreaterThan(actividadEspecie(faneca, hVer, ctx).valor);
  });

  it('especiesEn(): ranking incluye todas las especies, ordenado de mayor a menor', () => {
    const rank = especiesEn(new Date(), ctx);
    expect(rank.length).toBe(ESPECIES.length);
    let ordenado = true;
    for (let i = 1; i < rank.length; i++) if (rank[i].act.valor > rank[i - 1].act.valor) ordenado = false;
    expect(ordenado).toBe(true);
  });

  it('mejoresHorasEspecie(): <=5 resultados, todos futuros', () => {
    const lubina = especiePorId('lubina');
    const mejores = mejoresHorasEspecie(lubina, ctx, 72);
    expect(mejores.length).toBeLessThanOrEqual(5);
    expect(mejores.every(m => m.hora.fecha.getTime() >= Date.now() - 3600e3)).toBe(true);
  });
});
