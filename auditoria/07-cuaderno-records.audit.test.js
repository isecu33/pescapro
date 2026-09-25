/* SUPUESTOS del cuaderno y los records (README "Cuaderno" y "Trofeos"):
   - cada captura se guarda en el dispositivo con su instantanea;
   - exportar/importar sirve de copia de seguridad (ida y vuelta sin perdida)
     y un fichero importado es entrada no confiable: no debe dejar el
     cuaderno inservible;
   - si el almacenamiento falla, la captura NO se da por guardada y no se
     pierde lo que ya habia;
   - records "automaticos": mejores piezas por especie, mejor DIA (dia de
     calendario del pescador), totales. */
import { describe, it, expect, beforeEach } from 'vitest';
import { leer, anadir, borrar, estadisticas, exportar, importar, favoritos } from '../src/domain/cuaderno.js';
import { calcular } from '../src/domain/records/records.js';
import { instalarAlmacen, local, prng } from './util.js';

let almacen;
beforeEach(() => { almacen = instalarAlmacen(); });

const cap = (extra) => Object.assign({ especie: 'lubina', talla: 40, fecha: local(2026, 7, 10, 8).toISOString() }, extra);

describe('Supuesto: anadir/borrar capturas', () => {
  it('la ultima captura aparece primero y conserva lo introducido', () => {
    anadir(cap({ especie: 'sargo', talla: 30 }));
    anadir(cap({ especie: 'dorada', talla: 25, notas: 'espigon' }));
    const l = leer();
    expect(l.map(c => c.especie)).toEqual(['dorada', 'sargo']);
    expect(l[0]).toMatchObject({ talla: 25, notas: 'espigon' });
  });
  it('ids unicos aunque se anadan muchas en el mismo milisegundo', () => {
    for (let i = 0; i < 300; i++) anadir(cap());
    const ids = leer().map(c => c.id);
    expect(new Set(ids).size).toBe(300);
  });
  it('borrar elimina solo esa captura; id inexistente no toca nada', () => {
    anadir(cap({ especie: 'a' })); anadir(cap({ especie: 'b' })); anadir(cap({ especie: 'c' }));
    const id = leer()[1].id;
    borrar(id);
    expect(leer().map(c => c.especie)).toEqual(['c', 'a']);
    borrar('no-existe');
    expect(leer()).toHaveLength(2);
  });
  it('almacenamiento lleno: anadir lanza error claro y no se pierde lo anterior', () => {
    anadir(cap({ especie: 'sargo' }));
    almacen.fallarAlEscribir = true;
    expect(() => anadir(cap({ especie: 'lubina' }))).toThrow(/No se pudo guardar/);
    almacen.fallarAlEscribir = false;
    expect(leer().map(c => c.especie)).toEqual(['sargo']);
  });
});

describe('Supuesto: estadisticas = recuento exacto del historial', () => {
  it('las cuentas por especie suman el total y las franjas usan etiquetas conocidas', () => {
    const r = prng(9);
    const esp = ['lubina', 'sargo', 'calamar'], mom = ['amanecer', 'dia', 'atardecer', 'noche', 'raro'];
    for (let i = 0; i < 60; i++) anadir(cap({ especie: esp[i % 3], condiciones: { momento: mom[Math.floor(r() * 5)], faseMarea: 'subiendo', luna: 'Luna llena' } }));
    const st = estadisticas();
    expect(st.total).toBe(60);
    expect(Object.values(st.porEspecie).reduce((s, n) => s + n, 0)).toBe(60);
    expect(Object.keys(st.porFranja).every(k => ['Amanecer', 'Día', 'Atardecer', 'Noche'].includes(k))).toBe(true);
  });
});

describe('Supuesto: exportar/importar como copia de seguridad', () => {
  it('ida y vuelta sin perdida', () => {
    for (let i = 0; i < 5; i++) anadir(cap({ talla: 30 + i, spot: { nombre: 'Zarautz', lat: 43.29, lon: -2.17 } }));
    const copia = exportar();
    instalarAlmacen();
    importar(copia);
    expect(exportar()).toBe(copia);
  });
  it('rechaza lo que no es una lista', () => {
    expect(() => importar('{"a":1}')).toThrow();
    expect(() => importar('no json')).toThrow();
  });
  it('un fichero con entradas basura no deja el cuaderno inservible', () => {
    // Fichero editado a mano o de otra app. Aceptable: rechazarlo, o
    // importarlo descartando lo invalido. Inaceptable: que despues la
    // pantalla de estadisticas/records lance excepciones.
    let rechazado = false;
    try { importar(JSON.stringify([null, 5, 'x', { especie: 'lubina', fecha: '2026-07-01T10:00:00Z' }])); } catch { rechazado = true; }
    if (!rechazado) {
      expect(() => estadisticas()).not.toThrow();
      expect(() => calcular(leer())).not.toThrow();
    }
  });
});

describe('Supuesto: spots favoritos sin duplicados', () => {
  it('mismo punto no se repite; distinto si; borrar por posicion', () => {
    favoritos.anadir({ nombre: 'A', lat: 43.29, lon: -2.17 });
    favoritos.anadir({ nombre: 'A bis', lat: 43.29, lon: -2.17 });
    favoritos.anadir({ nombre: 'B', lat: 43.40, lon: -2.00 });
    expect(favoritos.leer().map(f => f.nombre)).toEqual(['A', 'B']);
    favoritos.borrar(0);
    expect(favoritos.leer().map(f => f.nombre)).toEqual(['B']);
  });
});

describe('Supuesto: records automaticos', () => {
  it('mejor pieza por especie (talla y peso por separado) y totales', () => {
    const caps = [
      cap({ especie: 'lubina', talla: 45, peso: 1.2, fotoId: 'f1', spot: { nombre: 'A' } }),
      cap({ especie: 'lubina', talla: 52, peso: 1.1, spot: { nombre: 'B' } }),
      cap({ especie: 'sargo', talla: 30, peso: null, spot: { nombre: 'A' } }),
    ];
    const st = calcular(caps);
    expect(st.total).toBe(3);
    expect(st.especiesDistintas).toBe(2);
    expect(st.conFoto).toBe(1);
    expect(st.spotsDistintos).toBe(2);
    expect(st.porEspecie.lubina.talla.valor).toBe(52);
    expect(st.porEspecie.lubina.peso.valor).toBe(1.2);
    expect(st.porEspecie.sargo.n).toBe(1);
  });
  it('historial vacio: todo a cero y sin mejor dia', () => {
    const st = calcular([]);
    expect(st).toMatchObject({ total: 0, especiesDistintas: 0, mejorDia: null });
  });
  it('"mejor dia" cuenta por dia de calendario LOCAL (jornada nocturna de verano)', () => {
    // Tres capturas el 10 de julio en hora peninsular (00:30, 01:30, 12:00)
    // y dos el 9 a mediodia. Guardadas como hace la app: toISOString().
    const caps = [
      cap({ fecha: local(2026, 7, 10, 0, 30).toISOString() }),
      cap({ fecha: local(2026, 7, 10, 1, 30).toISOString() }),
      cap({ fecha: local(2026, 7, 10, 12, 0).toISOString() }),
      cap({ fecha: local(2026, 7, 9, 12, 0).toISOString() }),
      cap({ fecha: local(2026, 7, 9, 13, 0).toISOString() }),
    ];
    expect(calcular(caps).mejorDia).toEqual({ dia: '2026-07-10', n: 3 });
  });
});
