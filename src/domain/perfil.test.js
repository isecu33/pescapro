import { describe, it, expect, vi, beforeEach } from 'vitest';

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

describe('perfil: datos del pescador (nombre, usuario, bio, clan, insignias, destacadas)', () => {
  let perfil;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', fakeLocalStorage());
    perfil = await import('./perfil.js');
  });

  it('leer() devuelve defaults completos cuando no hay nada guardado', () => {
    const p = perfil.leer();
    expect(p).toMatchObject({ nombre: '', usuario: '', bio: '', clan: null, banner: 'atardecer', insignias: [], destacadas: [] });
  });

  it('actualizar() valida y recorta nombre, usuario y bio', () => {
    const p = perfil.actualizar({ nombre: '  Iker  ', usuario: '@Iker_Pesca', bio: 'x'.repeat(300) });
    expect(p.nombre).toBe('Iker');
    expect(p.usuario).toBe('iker_pesca');
    expect(p.bio).toHaveLength(perfil.LIMITES.bio);
    expect(() => perfil.actualizar({ nombre: '   ' })).toThrow(/vacío/);
    expect(() => perfil.actualizar({ usuario: 'a b' })).toThrow(/usuario/);
    expect(() => perfil.actualizar({ usuario: 'ab' })).toThrow(/usuario/);
    expect(() => perfil.actualizar({ banner: 'no-existe' })).toThrow(/Banner/);
    // usuario vacio se permite (campo opcional)
    expect(perfil.actualizar({ usuario: '' }).usuario).toBe('');
  });

  it('comparte la clave pp_perfil con las ligas sin pisarse', async () => {
    perfil.actualizar({ nombre: 'Iker', bio: 'Spinning en Galicia' });
    const liga = await import('./records/liga.js');
    expect(liga.perfil().nombre).toBe('Iker');
    liga.setNombre('Iker S.');
    const p = perfil.leer();
    expect(p.nombre).toBe('Iker S.');
    expect(p.bio).toBe('Spinning en Galicia'); // setNombre ya no borra el resto del perfil
  });

  it('insignias favoritas: solo logros conseguidos, sin duplicados y max 3', () => {
    const conseguidos = ['a', 'b', 'c', 'd'];
    expect(perfil.setInsignias(['a', 'zzz', 'a', 'b'], conseguidos).insignias).toEqual(['a', 'b']);
    perfil.alternarInsignia('c', conseguidos);
    expect(perfil.leer().insignias).toEqual(['a', 'b', 'c']);
    expect(() => perfil.alternarInsignia('d', conseguidos)).toThrow(/Máximo 3/);
    perfil.alternarInsignia('a', conseguidos);
    expect(perfil.leer().insignias).toEqual(['b', 'c']);
  });

  it('capturas destacadas: alterna, limita a 6 e ignora capturas borradas', () => {
    for (let i = 0; i < 6; i++) perfil.alternarDestacada('c' + i);
    expect(() => perfil.alternarDestacada('c6')).toThrow(/Máximo 6/);
    perfil.alternarDestacada('c0');
    expect(perfil.leer().destacadas).toHaveLength(5);
    const vigentes = perfil.destacadasVigentes([{ id: 'c1' }, { id: 'c3' }, { id: 'otra' }]);
    expect(vigentes.map(c => c.id)).toEqual(['c1', 'c3']);
  });

  it('clan: fundar -> codigo -> unirse desde otro dispositivo -> salir', async () => {
    const p = perfil.crearClan({ nombre: 'Los del Espigón', etiqueta: 'esp' });
    expect(p.clan).toMatchObject({ nombre: 'Los del Espigón', etiqueta: 'ESP', fundador: true });
    const codigo = perfil.codigoClan();
    expect(codigo.startsWith('PESCAPRO-CLAN1:')).toBe(true);

    // "otro dispositivo": localStorage limpio
    vi.resetModules();
    vi.stubGlobal('localStorage', fakeLocalStorage());
    const otro = await import('./perfil.js');
    const q = otro.unirseClan('Únete!\n' + codigo + '\n');
    expect(q.clan).toMatchObject({ id: p.clan.id, nombre: 'Los del Espigón', etiqueta: 'ESP', fundador: false });
    expect(otro.salirClan().clan).toBeNull();
  });

  it('clan: rechaza codigos corruptos o con esquema manipulado', () => {
    expect(() => perfil.unirseClan('hola')).toThrow(/código de clan/);
    expect(() => perfil.unirseClan('PESCAPRO-CLAN1:%%%')).toThrow(/dañado/);
    const malo = (o) => 'PESCAPRO-CLAN1:' + btoa(JSON.stringify(o));
    expect(() => perfil.unirseClan(malo({ t: 'liga' }))).toThrow(/No es un código de clan/);
    expect(() => perfil.unirseClan(malo({ t: 'clan', id: 'x', nombre: 'A', etiqueta: 'AB' }))).toThrow(/identificador/);
    expect(() => perfil.unirseClan(malo({ t: 'clan', id: 'c_abcd', nombre: 'A', etiqueta: '<b>' }))).toThrow(/etiqueta/);
    expect(perfil.leer().clan).toBeNull();
  });

  it('crearClan exige nombre y deriva la etiqueta si no se da', () => {
    expect(() => perfil.crearClan({ nombre: '  ' })).toThrow(/nombre/);
    expect(perfil.crearClan({ nombre: 'Rías Baixas' }).clan.etiqueta).toBe('RAS');
  });

  it('publico() expone solo lo visible para otros', () => {
    perfil.actualizar({ nombre: 'Iker', usuario: 'iker' });
    perfil.crearClan({ nombre: 'Costa', etiqueta: 'CST' });
    const pub = perfil.publico();
    expect(pub).toEqual({ nombre: 'Iker', usuario: 'iker', bio: '', clan: { nombre: 'Costa', etiqueta: 'CST' }, banner: 'atardecer', insignias: [] });
    expect(perfil.publico(perfil.leer()).clan.id).toBeUndefined();
  });
});
