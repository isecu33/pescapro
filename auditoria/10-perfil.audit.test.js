/* SUPUESTOS del perfil (cabecera de perfil.js):
   - 100% local; el nombre es UNO SOLO en toda la app (perfil y ligas
     comparten `pp_perfil`) y cambiarlo en un sitio no borra lo demas;
   - limites visibles: nombre 24, usuario 3-20 [a-z0-9_.], bio 160,
     3 insignias (solo de logros conseguidos), 6 capturas destacadas;
   - clanes por codigo, sin servidor: el codigo de un movil sirve en otro y
     un codigo manipulado se rechaza antes de guardar nada;
   - la tarjeta publica no expone ids internos. */
import { describe, it, expect, beforeEach } from 'vitest';
import * as perfil from '../src/domain/perfil.js';
import * as liga from '../src/domain/records/liga.js';
import { anadir, borrar, leer as leerCuaderno } from '../src/domain/cuaderno.js';
import { instalarAlmacen, usarDispositivo } from './util.js';

beforeEach(() => { instalarAlmacen(); });

describe('Supuesto: perfil por defecto y tolerante a datos corruptos', () => {
  it('sin nada guardado: todos los campos con valores por defecto', () => {
    expect(perfil.leer()).toMatchObject({ nombre: '', usuario: '', bio: '', clan: null, banner: 'atardecer', insignias: [], destacadas: [] });
  });
  it('JSON corrupto o tipos erroneos => defaults, sin excepcion', () => {
    localStorage.setItem('pp_perfil', '{roto');
    expect(perfil.leer().banner).toBe('atardecer');
    localStorage.setItem('pp_perfil', JSON.stringify({ insignias: 'x', destacadas: 7, banner: 'hackeado' }));
    const p = perfil.leer();
    expect(p.insignias).toEqual([]); expect(p.destacadas).toEqual([]); expect(p.banner).toBe('atardecer');
  });
});

describe('Supuesto: validacion y limites visibles', () => {
  it('nombre obligatorio y acotado a 24', () => {
    expect(() => perfil.actualizar({ nombre: '   ' })).toThrow();
    expect(perfil.actualizar({ nombre: 'x'.repeat(50) }).nombre).toHaveLength(perfil.LIMITES.nombre);
  });
  it('usuario: se normaliza (@, mayusculas) y se valida', () => {
    expect(perfil.actualizar({ usuario: '  @Pesca_Pro.1 ' }).usuario).toBe('pesca_pro.1');
    expect(() => perfil.actualizar({ usuario: 'ab' })).toThrow();
    expect(() => perfil.actualizar({ usuario: 'con espacio' })).toThrow();
    expect(perfil.actualizar({ usuario: '' }).usuario).toBe('');
  });
  it('bio acotada a 160; banner solo de la lista', () => {
    expect(perfil.actualizar({ bio: 'b'.repeat(500) }).bio).toHaveLength(160);
    expect(() => perfil.actualizar({ banner: 'url(javascript:alert(1))' })).toThrow();
    expect(perfil.bannerCss('inexistente')).toBe(perfil.BANNERS[0].css);
  });
});

describe('Supuesto: un solo nombre en toda la app (perfil <-> ligas)', () => {
  it('cambiar el nombre desde ligas se ve en el perfil y no borra bio ni clan', () => {
    perfil.actualizar({ nombre: 'Ana', bio: 'Spinning en Zarautz' });
    perfil.crearClan({ nombre: 'Lubineros', etiqueta: 'LUB' });
    liga.setNombre('Iker');
    const p = perfil.leer();
    expect(p.nombre).toBe('Iker');
    expect(p.bio).toBe('Spinning en Zarautz');
    expect(p.clan?.etiqueta).toBe('LUB');
  });
  it('cambiar el nombre en el perfil se usa al crear una liga', () => {
    perfil.actualizar({ nombre: 'Ana' });
    const l = liga.crear({ nombre: 'X', desde: '2026-07-01', hasta: '2026-07-31' });
    expect(l.participantes[0].nombre).toBe('Ana');
  });
  it('ambos modulos aceptan y rechazan los mismos nombres', () => {
    // Si el perfil no permite un nombre vacio, las ligas tampoco deberian
    // poder dejar al pescador sin nombre.
    perfil.actualizar({ nombre: 'Ana' });
    try { liga.setNombre('   '); } catch { /* rechazarlo es correcto */ }
    expect(perfil.leer().nombre, 'liga.setNombre ha guardado un nombre vacio').toBe('Ana');
  });
});

describe('Supuesto: insignias y capturas destacadas', () => {
  it('solo insignias de logros conseguidos, maximo 3, sin repetir', () => {
    const p = perfil.setInsignias(['a', 'b', 'a', 'no-conseguido', 'c', 'd'], ['a', 'b', 'c', 'd']);
    expect(p.insignias).toEqual(['a', 'b', 'c']);
  });
  it('alternar una 4a insignia da error claro', () => {
    perfil.setInsignias(['a', 'b', 'c'], ['a', 'b', 'c', 'd']);
    expect(() => perfil.alternarInsignia('d', ['a', 'b', 'c', 'd'])).toThrow(/Máximo/);
    expect(perfil.alternarInsignia('a', ['a', 'b', 'c', 'd']).insignias).toEqual(['b', 'c']);
  });
  it('maximo 6 destacadas; al borrar la captura deja de mostrarse', () => {
    for (let i = 0; i < 6; i++) anadir({ especie: 'lubina', talla: 30 + i });
    const ids = leerCuaderno().map(c => c.id);
    ids.forEach(id => perfil.alternarDestacada(id));
    anadir({ especie: 'sargo' });
    expect(() => perfil.alternarDestacada(leerCuaderno()[0].id)).toThrow();
    borrar(ids[0]);
    const vig = perfil.destacadasVigentes(leerCuaderno());
    expect(vig).toHaveLength(5);
    expect(vig.some(c => c.id === ids[0])).toBe(false);
  });
});

describe('Supuesto: clanes por codigo entre moviles', () => {
  it('el codigo creado en un movil sirve en otro (mismo clan, no fundador)', () => {
    const A = instalarAlmacen();
    perfil.crearClan({ nombre: 'Los Lubineros del Norte', etiqueta: 'lub' });
    const cod = perfil.codigoClan();
    const idA = perfil.leer().clan.id;
    instalarAlmacen();
    const p = perfil.unirseClan('Únete a mi clan: ' + cod + ' ¡nos vemos!');
    expect(p.clan).toMatchObject({ id: idA, nombre: 'Los Lubineros del Norte', etiqueta: 'LUB', fundador: false });
    usarDispositivo(A);
    expect(perfil.leer().clan.fundador).toBe(true);
  });
  it('etiqueta automatica a partir del nombre si no se da', () => {
    expect(perfil.crearClan({ nombre: 'Rocas y Mar' }).clan.etiqueta).toBe('ROC');
  });
  const b64 = (o) => 'PESCAPRO-CLAN1:' + Buffer.from(JSON.stringify(o), 'utf8').toString('base64');
  const malos = {
    'sin prefijo': 'hola',
    'base64 roto': 'PESCAPRO-CLAN1:%%%',
    'no es clan': b64({ t: 'liga', id: 'c_abcd', nombre: 'X', etiqueta: 'AB' }),
    'id raro': b64({ t: 'clan', id: '../../x', nombre: 'X', etiqueta: 'AB' }),
    'etiqueta con HTML': b64({ t: 'clan', id: 'c_abcd', nombre: 'X', etiqueta: '<b>' }),
    'nombre vacio': b64({ t: 'clan', id: 'c_abcd', nombre: '  ', etiqueta: 'AB' }),
    'null': 'PESCAPRO-CLAN1:' + Buffer.from('null').toString('base64'),
  };
  for (const [n, c] of Object.entries(malos)) {
    it(`codigo manipulado (${n}) se rechaza y no cambia el perfil`, () => {
      perfil.actualizar({ nombre: 'Ana' });
      const antes = JSON.stringify(perfil.leer());
      expect(() => perfil.unirseClan(c)).toThrow(Error);
      expect(JSON.stringify(perfil.leer())).toBe(antes);
    });
  }
  it('nombre de clan ajeno se acota a 30', () => {
    const p = perfil.unirseClan(b64({ t: 'clan', id: 'c_abcd', nombre: 'n'.repeat(200), etiqueta: 'AB' }));
    expect(p.clan.nombre.length).toBeLessThanOrEqual(perfil.LIMITES.clan);
  });
});

describe('Supuesto: la tarjeta publica no expone datos internos', () => {
  it('sin ids de clan ni de capturas', () => {
    perfil.actualizar({ nombre: 'Ana' });
    const clanId = perfil.crearClan({ nombre: 'Lubineros', etiqueta: 'LUB' }).clan.id;
    anadir({ especie: 'lubina' });
    const capId = leerCuaderno()[0].id;
    perfil.alternarDestacada(capId);
    const txt = JSON.stringify(perfil.publico());
    expect(txt).not.toContain(clanId);
    expect(txt).not.toContain(capId);
  });
  it('sin nombre => "Pescador local"', () => {
    expect(perfil.publico().nombre).toBe('Pescador local');
  });
});
