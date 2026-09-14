import { describe, it, expect } from 'vitest';
import { periodos, factorSolunar, momentoDelDia, luna, sol } from './solunar.js';

// test/test_indice.js (vanilla) prueba PP.solunar a traves de PP.indice.preparar()
// (ctx.periodosDe). Aqui se prueba solunar.js de forma aislada, directamente,
// ya que no depende de indice.js ni especies.js -- solo de SunCalc vendored.
const LAT = 43.29, LON = -2.17;

describe('solunar: conversion 1:1 desde www/js/solunar.js', () => {
  it('periodos() del dia: entre 2 y 5, todos con fin > inicio', () => {
    const per = periodos(new Date(), LAT, LON);
    expect(per.length).toBeGreaterThanOrEqual(2);
    expect(per.length).toBeLessThanOrEqual(5);
    expect(per.every(p => p.fin > p.inicio)).toBe(true);
  });

  it('factorSolunar es maximo (1.0 mayor / 0.75 menor) dentro de un periodo', () => {
    const per = periodos(new Date(), LAT, LON);
    const f = factorSolunar(per[0].centro, per);
    expect(f === 1.0 || f === 0.75).toBe(true);
  });

  it('factorSolunar es 0.3 fuera de cualquier periodo', () => {
    const per = periodos(new Date(), LAT, LON);
    const lejos = new Date(Math.min(...per.map(p => p.inicio.getTime())) - 6 * 3600e3);
    expect(factorSolunar(lejos, per)).toBe(0.3);
  });

  it('momentoDelDia devuelve una de las 4 categorias validas', () => {
    const m = momentoDelDia(new Date(), LAT, LON);
    expect(['amanecer', 'dia', 'atardecer', 'noche']).toContain(m);
  });

  it('luna() devuelve fase 0..1, iluminacion 0..100 y nombre/icono coherentes', () => {
    const l = luna(new Date(), LAT, LON);
    expect(l.fase).toBeGreaterThanOrEqual(0);
    expect(l.fase).toBeLessThan(1);
    expect(l.iluminacion).toBeGreaterThanOrEqual(0);
    expect(l.iluminacion).toBeLessThanOrEqual(100);
    expect(typeof l.nombre).toBe('string');
    expect(typeof l.icono).toBe('string');
  });

  it('sol() devuelve amanecer/ocaso como Date', () => {
    const s = sol(new Date(), LAT, LON);
    expect(s.amanecer).toBeInstanceOf(Date);
    expect(s.ocaso).toBeInstanceOf(Date);
  });
});
