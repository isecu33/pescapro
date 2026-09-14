import { describe, it, expect } from 'vitest';
import { guardar, obtener, borrar, comprimir } from './fotos.js';

// Entorno Node por defecto (sin jsdom/happy-dom): indexedDB es undefined,
// exactamente el escenario que fotos.js debe degradar sin errores segun su
// propio comentario ("Si el navegador no tiene IndexedDB, la app degrada
// sin fotos y sin errores"). happy-dom (probado aparte) no implementa
// IndexedDB, asi que este es el entorno mas fiel para verificar la
// degradacion real sin anadir una dependencia extra (p.ej. fake-indexeddb)
// que el proyecto original tampoco tenia.
describe('fotos: conversion 1:1 desde www/js/fotos.js (degradacion sin IndexedDB)', () => {
  it('guardar() rechaza si IndexedDB no esta disponible', async () => {
    await expect(guardar('id1', 'data:image/jpeg;base64,x')).rejects.toThrow('IndexedDB no disponible');
  });

  it('obtener() nunca rechaza: resuelve a null si IndexedDB no esta disponible', async () => {
    await expect(obtener('id1')).resolves.toBeNull();
  });

  it('borrar() nunca rechaza: resuelve a false si IndexedDB no esta disponible', async () => {
    await expect(borrar('id1')).resolves.toBe(false);
  });

  it('exporta las 4 funciones publicas esperadas', () => {
    expect(typeof guardar).toBe('function');
    expect(typeof obtener).toBe('function');
    expect(typeof borrar).toBe('function');
    expect(typeof comprimir).toBe('function');
  });
});
