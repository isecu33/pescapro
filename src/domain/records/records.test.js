import { describe, it, expect } from 'vitest';
import { calcular } from './records.js';

// Porta la seccion "Records" de test/test_records.js (6 asserts).
describe('records: conversion 1:1 desde www/js/records.js (PP.records)', () => {
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
  const r = calcular(caps);

  it('total de capturas: 6', () => expect(r.total).toBe(6));
  it('especies distintas: 5', () => expect(r.especiesDistintas).toBe(5));
  it('record de talla de lubina: 54 cm', () => expect(r.porEspecie.lubina.talla.valor).toBe(54));
  it('record de peso de lubina: 1.8 kg', () => expect(r.porEspecie.lubina.peso.valor).toBe(1.8));
  it('mejor dia: 4 capturas', () => { expect(r.mejorDia).not.toBeNull(); expect(r.mejorDia.n).toBe(4); });
  it('con foto: 1, spots: 3', () => { expect(r.conFoto).toBe(1); expect(r.spotsDistintos).toBe(3); });
});
