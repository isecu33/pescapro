import { describe, it, expect, vi, beforeAll } from 'vitest';

// Porta la seccion "Liga" de test/test_records.js (19 asserts) + tests
// nuevos de las validaciones de esquema anadidas en importar() (fix
// CRITICAL/MEDIUM: los codigos vienen de otro dispositivo/usuario).
//
// Como el test original es un script secuencial (cada paso depende del
// estado dejado por el anterior: crear liga -> unirse por codigo ->
// importar resultado de un amigo -> reimportar), se porta tal cual a un
// solo describe con un localStorage fake COMPARTIDO entre los `it`, en vez
// de resetear entre cada uno -- asi se preserva fielmente la secuencia
// original en lugar de cambiar el comportamiento probado.

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

describe('liga: conversion 1:1 desde www/js/records.js (PP.liga) + fixes de validacion', () => {
  let liga, cuaderno;
  const hoy = new Date();
  const iso = (diasOffset, hora) => {
    const d = new Date(hoy.getTime() + diasOffset * 86400e3);
    d.setHours(hora != null ? hora : 12, 30, 0, 0);
    return d.toISOString();
  };
  const fISO = (d) => new Date(hoy.getTime() + d * 86400e3).toISOString().slice(0, 10);

  beforeAll(async () => {
    vi.stubGlobal('localStorage', fakeLocalStorage());
    cuaderno = await import('../cuaderno.js');
    liga = await import('./liga.js');
  });

  it('perfil guardado', () => {
    liga.setNombre('Iker');
    expect(liga.perfil().nombre).toBe('Iker');
  });

  let ligaCreada;
  it('liga creada conmigo dentro', () => {
    cuaderno.anadir({ especie: 'lubina', talla: 48, fecha: iso(0, 7) });
    cuaderno.anadir({ especie: 'calamar', talla: 20, fecha: iso(1, 22) });
    cuaderno.anadir({ especie: 'sargo', talla: 30, fecha: iso(-20, 10) }); // fuera del periodo
    ligaCreada = liga.crear({ nombre: 'Liga de prueba', desde: fISO(-5), hasta: fISO(5), modo: 'puntos' });
    expect(ligaCreada.id).toBeTruthy();
    expect(ligaCreada.participantes).toHaveLength(1);
    expect(ligaCreada.participantes[0].esYo).toBe(true);
  });

  it('estado: activa / proxima / finalizada', () => {
    expect(liga.estado(ligaCreada)).toBe('activa');
    expect(liga.estado({ desde: fISO(2), hasta: fISO(9) })).toBe('próxima');
    expect(liga.estado({ desde: fISO(-9), hasta: fISO(-2) })).toBe('finalizada');
  });

  it('mi resultado: 2 capturas dentro del periodo (la de hace 20 dias queda fuera)', () => {
    liga.actualizarMiResultado(ligaCreada.id);
    const l2 = liga.porId(ligaCreada.id);
    const yo = l2.participantes.find(p => p.esYo);
    expect(yo.caps).toHaveLength(2);
  });

  it('puntuacion en los 3 modos', () => {
    const capsP = [['lubina', 48, null, iso(0)], ['calamar', 20, null, iso(0)], ['faneca', null, null, iso(0)]];
    expect(liga.puntuar({ modo: 'capturas' }, capsP).metrica).toBe(3);
    expect(liga.puntuar({ modo: 'mayor' }, capsP).metrica).toBe(48);
    expect(liga.puntuar({ modo: 'puntos' }, capsP).metrica).toBe(78);
  });

  let codigoInv;
  it('codigo de invitacion con prefijo', () => {
    codigoInv = liga.codigoInvitacion(ligaCreada);
    expect(codigoInv.startsWith('PESCAPRO1:')).toBe(true);
  });

  it('importar invitacion de una liga que ya tengo -> aviso', () => {
    expect(() => liga.importar(codigoInv)).toThrow(/Ya estás/);
  });

  it('unirse por codigo de invitacion (simula otro movil: borro y reimporto)', () => {
    liga.borrar(ligaCreada.id);
    const res1 = liga.importar(codigoInv);
    expect(res1.tipo).toBe('liga');
    expect(liga.porId(ligaCreada.id)).not.toBeNull();
  });

  it('al unirme, mi resultado se calcula del cuaderno', () => {
    expect(liga.porId(ligaCreada.id).participantes.find(p => p.esYo).caps).toHaveLength(2);
  });

  let codigoAnder;
  it('resultado de amigo importado', () => {
    liga.setNombre('Ander'); // simula el movil del amigo generando su codigo
    codigoAnder = liga.codigoResultado(ligaCreada.id);
    liga.setNombre('Iker'); // mi participante sigue llamandose Iker
    const res2 = liga.importar(codigoAnder);
    expect(res2.tipo).toBe('res');
  });

  it('ranking con 2 participantes, distingue tu/amigo, ordenado de mayor a menor', () => {
    const rank = liga.ranking(liga.porId(ligaCreada.id));
    expect(rank).toHaveLength(2);
    expect(rank.some(p => p.esYo)).toBe(true);
    expect(rank.some(p => !p.esYo)).toBe(true);
    expect(rank[0].metrica).toBeGreaterThanOrEqual(rank[1].metrica);
  });

  it('reimportar el mismo resultado actualiza en vez de duplicar', () => {
    liga.importar(codigoAnder);
    expect(liga.porId(ligaCreada.id).participantes).toHaveLength(2);
  });

  it('codigos corruptos rechazados con error claro', () => {
    expect(() => liga.importar('esto no es un código')).toThrow();
    expect(() => liga.importar('PESCAPRO1:@@@@')).toThrow();
  });

  describe('fixes de validacion de esquema en importar() (entrada no confiable de otro dispositivo)', () => {
    it('fix MEDIUM: nombre de liga importada se acota a 40 caracteres, igual que crear()', () => {
      liga.setNombre('Iker');
      const nombreLargo = 'X'.repeat(500);
      const cod = liga.codigoInvitacion({ id: 'l_test_slice', nombre: nombreLargo, desde: fISO(-1), hasta: fISO(1), modo: 'puntos' });
      const res = liga.importar(cod);
      expect(res.liga.nombre.length).toBeLessThanOrEqual(40);
    });

    it('fix MEDIUM: rechaza codigo de invitacion con fechas no ISO validas', () => {
      const cod = liga.codigoInvitacion({ id: 'l_test_fecha', nombre: 'Liga fechas raras', desde: 'no-es-una-fecha', hasta: fISO(1), modo: 'puntos' });
      expect(() => liga.importar(cod)).toThrow(/fechas no válidas/);
    });

    it('fix MEDIUM: acota a CAPS_MAX el numero de capturas aceptadas de un resultado ajeno', () => {
      const l = liga.crear({ nombre: 'Liga caps grandes', desde: fISO(-30), hasta: fISO(30), modo: 'capturas' });
      const capsGigantes = Array.from({ length: 5000 }, (_, i) => ['lubina', 30, null, fISO(0)]);
      const codResultado = liga.codigoInvitacion(l); // solo para reutilizar enc(); construimos el 'res' a mano abajo
      // Genera directamente un codigo de tipo 'res' con muchas capturas, simulando un amigo malicioso.
      const b64e = (str) => Buffer.from(str, 'utf8').toString('base64');
      const codigoMalicioso = 'PESCAPRO1:' + b64e(JSON.stringify({ t: 'res', id: l.id, nombre: 'Atacante', caps: capsGigantes }));
      const res = liga.importar(codigoMalicioso);
      expect(res.liga.participantes.find(p => p.nombre === 'Atacante').caps.length).toBeLessThanOrEqual(500);
    });

    it('rechaza codigo de resultado sin id o nombre validos', () => {
      const b64e = (str) => Buffer.from(str, 'utf8').toString('base64');
      const sinId = 'PESCAPRO1:' + b64e(JSON.stringify({ t: 'res', nombre: 'Alguien', caps: [] }));
      expect(() => liga.importar(sinId)).toThrow();
      const sinNombre = 'PESCAPRO1:' + b64e(JSON.stringify({ t: 'res', id: 'l_x', caps: [] }));
      expect(() => liga.importar(sinNombre)).toThrow();
    });
  });
});
