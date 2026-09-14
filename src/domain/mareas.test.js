import { describe, it, expect } from 'vitest';
import { extremos, amplitud, analizar } from './mareas.js';
import { generarDatos } from './__fixtures__.js';

describe('mareas: conversion 1:1 desde www/js/mareas.js (portado de test/test_mareas.js)', () => {
  const datos = generarDatos({ amplitudMarea: 2.0, horasFuturas: 96 });
  const exts = extremos(datos.horas);

  it('numero de extremos plausible en ~108h', () => {
    expect(exts.length).toBeGreaterThanOrEqual(14);
    expect(exts.length).toBeLessThanOrEqual(20);
  });

  it('pleamares y bajamares alternan', () => {
    for (let i = 1; i < exts.length; i++) expect(exts[i].tipo).not.toBe(exts[i - 1].tipo);
  });

  it('separacion media ~6.21h entre extremos', () => {
    const seps = [];
    for (let i = 1; i < exts.length; i++) seps.push((exts[i].fecha - exts[i - 1].fecha) / 3600e3);
    const sepMedia = seps.reduce((a, b) => a + b, 0) / seps.length;
    expect(Math.abs(sepMedia - 6.21)).toBeLessThan(0.35);
  });

  it('altura de pleamar aprox +2.0m con interpolacion parabolica', () => {
    const pleas = exts.filter(e => e.tipo === 'pleamar');
    for (const p of pleas) expect(Math.abs(p.altura - 2.0)).toBeLessThan(0.06);
  });

  it('rango de amplitud aprox 4.0m clasificado como vivas, coef alto', () => {
    const amp = amplitud(exts, new Date());
    expect(amp).not.toBeNull();
    expect(Math.abs(amp.rango - 4.0)).toBeLessThan(0.15);
    expect(amp.clase).toBe('vivas');
    expect(amp.coef).toBeGreaterThanOrEqual(95);
    expect(amp.coef).toBeLessThanOrEqual(120);
  });

  it('flujo maximo a media marea, bajo cerca del extremo; fase valida', () => {
    const m = analizar(datos);
    expect(m.ahora).not.toBeNull();
    const medio = new Date((m.ahora.anterior.fecha.getTime() + m.ahora.siguiente.fecha.getTime()) / 2);
    const estMedio = m.estadoEn(medio);
    expect(estMedio.flujo).toBeGreaterThan(0.95);
    const casiExtremo = new Date(m.ahora.siguiente.fecha.getTime() - 15 * 60e3);
    const estExt = m.estadoEn(casiExtremo);
    expect(estExt.flujo).toBeLessThan(0.35);
    expect(['subiendo', 'bajando', 'pleamar', 'bajamar']).toContain(m.ahora.fase);
    expect(m.proximos.length).toBeGreaterThanOrEqual(3);
  });

  it('mareas muertas: rango pequeno clasificado como muertas', () => {
    const datos2 = generarDatos({ amplitudMarea: 0.9 });
    const amp2 = amplitud(extremos(datos2.horas), new Date());
    expect(amp2.clase).toBe('muertas');
  });

  it('serie con huecos (null) no lanza errores', () => {
    const datos3 = generarDatos({});
    datos3.horas.forEach((h, i) => { if (i % 7 === 3) h.nivelMar = null; });
    const exts3 = extremos(datos3.horas);
    expect(Array.isArray(exts3)).toBe(true);
  });
});
