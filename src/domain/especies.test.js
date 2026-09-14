import { describe, it, expect } from 'vitest';
import { ESPECIES, especiePorId } from './especies.js';
import { MODOS } from './config.js';

// Nota: test/test_especies.js (version vanilla) mezcla comprobaciones de
// integridad de ESPECIES con calculos de PP.indice.actividadEspecie/
// especiesEn/mejoresHorasEspecie. Esos ultimos dependen de indice.js, que
// se convierte en la tarea Fase1C — sus asserts se portan alli
// (src/domain/indice.test.js) junto con el resto de PP.indice. Aqui solo
// se porta la parte que prueba especies.js de forma aislada.

describe('especies: conversion 1:1 desde www/js/especies.js', () => {
  it('las especies tienen todos los campos bien formados', () => {
    for (const e of ESPECIES) {
      expect(e.meses).toHaveLength(12);
      expect(e.meses.every(v => v >= 0 && v <= 1)).toBe(true);
      expect(e.sst).toHaveLength(4);
      expect(e.sst[0]).toBeLessThanOrEqual(e.sst[1]);
      expect(e.sst[1]).toBeLessThanOrEqual(e.sst[2]);
      expect(e.sst[2]).toBeLessThanOrEqual(e.sst[3]);
      expect(e.oleaje).toHaveLength(4);
      for (const k of ['subiendo', 'pleamar', 'bajando', 'bajamar']) {
        expect(e.marea[k]).not.toBeNull();
        expect(e.marea[k]).not.toBeUndefined();
      }
      for (const k of ['amanecer', 'dia', 'atardecer', 'noche']) {
        expect(e.momento[k]).not.toBeNull();
        expect(e.momento[k]).not.toBeUndefined();
      }
      expect(e.luna).toHaveLength(4);
      expect(e.modos.every(m => MODOS[m])).toBe(true);
    }
  });

  it('hay 12 especies definidas', () => {
    expect(ESPECIES).toHaveLength(12);
  });

  it('especiePorId encuentra por id y devuelve null si no existe', () => {
    expect(especiePorId('lubina')?.nombre).toBe('Lubina');
    expect(especiePorId('no-existe')).toBeNull();
  });
});
