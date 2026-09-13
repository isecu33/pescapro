import { describe, it, expect } from 'vitest';
import { evaluar } from './logros.js';

// Porta la seccion "Logros" de test/test_records.js (10 asserts).
describe('logros: conversion 1:1 desde www/js/records.js (PP.logros)', () => {
  const hoy = new Date();
  const iso = (diasOffset, hora) => {
    const d = new Date(hoy.getTime() + diasOffset * 86400e3);
    d.setHours(hora != null ? hora : 12, 30, 0, 0);
    return d.toISOString();
  };
  const caps = [
    { especie: 'lubina', talla: 54, peso: 1.8, fecha: iso(0, 6), fotoId: 'f1', spot: { nombre: 'Zarautz' }, condiciones: { indice: 22 } },
    { especie: 'lubina', talla: 40, peso: 0.9, fecha: iso(0, 20), spot: { nombre: 'Zarautz' } },
    { especie: 'calamar', talla: 22, fecha: iso(-1, 23), spot: { nombre: 'Getaria' } },
    { especie: 'sargo', talla: 28, fecha: iso(-1, 9), spot: { nombre: 'Orio' } },
    { especie: 'dorada', talla: 35, peso: 1.1, fecha: iso(0, 12), spot: { nombre: 'Zarautz' } },
    { especie: 'faneca', fecha: iso(0, 22), spot: { nombre: 'Zarautz' } }
  ];
  const logros = evaluar(caps);
  const porId = {};
  logros.forEach(l => { porId[l.id] = l; });

  it('logro "primera captura" conseguido', () => expect(porId.primera.conseguido).toBe(true));
  it('logro "5 capturas" conseguido', () => expect(porId.cinco.conseguido).toBe(true));
  it('logro "5 especies" conseguido', () => expect(porId.coleccionista.conseguido).toBe(true));
  it('logro "10 especies" pendiente con progreso 5/10', () => {
    expect(porId.maestro.conseguido).toBe(false);
    expect(porId.maestro.progreso[0]).toBe(5);
  });
  it('logro "lubina >=50cm" conseguido', () => expect(porId['trofeo-lubina'].conseguido).toBe(true));
  it('logro madrugador (captura a las 6:30)', () => expect(porId.madrugador.conseguido).toBe(true));
  it('logro nocturno NO conseguido (23:xx no cuenta como 0-5h)', () => expect(porId.nocturno.conseguido).toBe(false));
  it('logro "contra pronostico" (indice 22)', () => expect(porId.contracorriente.conseguido).toBe(true));
  it('logro viajero (3 spots) conseguido', () => expect(porId.viajero.conseguido).toBe(true));
  it('hay al menos 14 logros definidos', () => expect(logros.length).toBeGreaterThanOrEqual(14));
});
