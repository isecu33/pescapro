import { describe, it, expect } from 'vitest';
import { CONFIG, MODOS, SEGURIDAD, MAREA_CLASES, WMO, util } from './config.js';

describe('config: conversion 1:1 desde www/js/config.js', () => {
  it('CONFIG mantiene el spot por defecto y los endpoints de Open-Meteo', () => {
    expect(CONFIG.DEFAULT_SPOT).toEqual({ nombre: 'Zarautz', lat: 43.290, lon: -2.170 });
    expect(CONFIG.API.clima).toBe('https://api.open-meteo.com/v1/forecast');
    expect(CONFIG.API.marino).toBe('https://marine-api.open-meteo.com/v1/marine');
    expect(CONFIG.API.geo).toBe('https://geocoding-api.open-meteo.com/v1/search');
  });

  it('MODOS define las 3 modalidades con pesos que suman 1', () => {
    for (const id of ['spinning', 'eging', 'surfcasting']) {
      const suma = Object.values(MODOS[id].pesos).reduce((s, x) => s + x, 0);
      expect(suma).toBeCloseTo(1, 2);
    }
  });

  it('SEGURIDAD define umbrales rojo/amarillo', () => {
    expect(SEGURIDAD.rojo.viento).toBe(45);
    expect(SEGURIDAD.amarillo.viento).toBe(30);
    expect(SEGURIDAD.capRojo).toBe(15);
  });

  it('MAREA_CLASES clasifica por amplitud creciente', () => {
    expect(MAREA_CLASES.map(c => c.clase)).toEqual(['muertas', 'medias', 'vivas']);
  });

  it('WMO mapea codigos de tormenta a texto+icono', () => {
    expect(WMO[95][0]).toBe('Tormenta');
  });

  it('util.trap: 0 fuera de rango, 1 en el optimo, rampa lineal en los bordes', () => {
    expect(util.trap(-5, 0, 4, 18, 32)).toBe(0);
    expect(util.trap(10, 0, 4, 18, 32)).toBe(1);
    expect(util.trap(40, 0, 4, 18, 32)).toBe(0);
    expect(util.trap(2, 0, 4, 18, 32)).toBeCloseTo(0.5, 5);
  });

  it('util.colorIndice y util.etiquetaIndice son consistentes por umbral', () => {
    expect(util.etiquetaIndice(75)).toBe('Excelente');
    expect(util.etiquetaIndice(10)).toBe('Malo');
    expect(util.colorIndice(70)).toBe('#ff9500');
  });

  it('util.colorIndice degrada dentro del tramo 70-100 en vez de un naranja plano (fix ux-audit prevision)', () => {
    // Antes de este fix, cualquier v>=70 devolvia el mismo '#ff9500' -- con
    // datos reales (84-94) todas las barras/badges eran indistinguibles.
    expect(util.colorIndice(84)).not.toBe(util.colorIndice(94));
    expect(util.colorIndice(94)).not.toBe(util.colorIndice(70));
    expect(util.colorIndice(100)).toBe('#ffd83d');
  });
});
