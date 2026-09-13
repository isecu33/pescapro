import { describe, it, expect, vi, beforeEach } from 'vitest';

// localStorage real de Node (globalThis) no existe fuera de un navegador;
// se simula con un Map para las pruebas de CRUD normal, y se sustituye por
// un mock que lanza para probar el fix HIGH de guardar().
function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

describe('cuaderno: conversion 1:1 desde www/js/cuaderno.js (incluye favoritos)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', fakeLocalStorage());
  });

  it('anadir/leer/borrar mantienen el historial de capturas', async () => {
    const { anadir, leer, borrar } = await import('./cuaderno.js');
    anadir({ especie: 'lubina', talla: 42 });
    anadir({ especie: 'dorada', talla: 25 });
    expect(leer()).toHaveLength(2);
    expect(leer()[0].especie).toBe('dorada'); // unshift: la mas reciente primero
    const id = leer()[1].id;
    const restante = borrar(id);
    expect(restante).toHaveLength(1);
    expect(restante[0].especie).toBe('dorada');
  });

  it('borrar() tambien borra la foto asociada via fotos.borrar', async () => {
    vi.doMock('./fotos.js', () => ({ borrar: vi.fn(async () => true), obtener: vi.fn(), guardar: vi.fn(), comprimir: vi.fn() }));
    const fotosMod = await import('./fotos.js');
    const { anadir, leer, borrar } = await import('./cuaderno.js');
    anadir({ especie: 'lubina', fotoId: 'foto123' });
    const id = leer()[0].id;
    borrar(id);
    expect(fotosMod.borrar).toHaveBeenCalledWith('foto123');
  });

  it('estadisticas() agrega por especie, fase de marea, luna y franja', async () => {
    const { anadir, estadisticas } = await import('./cuaderno.js');
    anadir({ especie: 'lubina', condiciones: { faseMarea: 'subiendo', luna: 'llena', momento: 'noche' } });
    anadir({ especie: 'lubina', condiciones: { faseMarea: 'subiendo', luna: 'nueva', momento: 'dia' } });
    const st = estadisticas();
    expect(st.total).toBe(2);
    expect(st.porEspecie.lubina).toBe(2);
    expect(st.porFaseMarea.subiendo).toBe(2);
    expect(st.porFranja.Noche).toBe(1);
    expect(st.porFranja.Día).toBe(1);
  });

  it('exportar/importar mantienen el historial (round-trip JSON)', async () => {
    const { anadir, exportar, importar, leer } = await import('./cuaderno.js');
    anadir({ especie: 'sargo' });
    const json = exportar();
    importar(json);
    expect(leer()).toHaveLength(1);
    expect(leer()[0].especie).toBe('sargo');
  });

  it('importar() rechaza un JSON que no sea un array', async () => {
    const { importar } = await import('./cuaderno.js');
    expect(() => importar('{"no":"es un array"}')).toThrow('Formato no válido');
  });

  it('fix HIGH: guardar() propaga un error claro si localStorage falla (en vez de tragarselo)', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '[]',
      setItem: () => { throw new DOMException('cuota excedida', 'QuotaExceededError'); }
    });
    const { anadir } = await import('./cuaderno.js');
    expect(() => anadir({ especie: 'lubina' })).toThrow('No se pudo guardar el cuaderno');
  });

  it('favoritos: anadir evita duplicados por coordenadas, borrar por indice', async () => {
    const { favoritos } = await import('./cuaderno.js');
    favoritos.anadir({ nombre: 'Zarautz', lat: 43.29, lon: -2.17 });
    favoritos.anadir({ nombre: 'Zarautz (otra vez)', lat: 43.29, lon: -2.17 });
    expect(favoritos.leer()).toHaveLength(1);
    favoritos.anadir({ nombre: 'Getaria', lat: 43.30, lon: -2.20 });
    expect(favoritos.leer()).toHaveLength(2);
    const restante = favoritos.borrar(0);
    expect(restante).toHaveLength(1);
    expect(restante[0].nombre).toBe('Getaria');
  });
});
