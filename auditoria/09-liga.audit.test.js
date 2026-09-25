/* SUPUESTOS de competiciones sin servidor (README "Trofeos" y cabecera de
   records/liga.js):
   - se crea una liga, se comparte un codigo de invitacion, cada amigo envia
     su codigo de resultado y el ranking se calcula en el movil;
   - "tu resultado sale solo de tu Cuaderno": cuentan las capturas del
     periodo desde..hasta, entendido como dias de calendario del pescador;
   - los codigos vienen de otro dispositivo: entrada no confiable. Un codigo
     roto o manipulado se rechaza o se sanea, pero nunca rompe el ranking;
   - reimportar el resultado de un amigo lo actualiza, no lo duplica. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as liga from '../src/domain/records/liga.js';
import { anadir } from '../src/domain/cuaderno.js';
import { instalarAlmacen, usarDispositivo, local, fijarAhora, soltarReloj } from './util.js';

afterEach(soltarReloj);

const b64 = (o) => 'PESCAPRO1:' + Buffer.from(JSON.stringify(o), 'utf8').toString('base64');

function dosDispositivos(nombreA = 'Iker', nombreB = 'Bea') {
  const A = instalarAlmacen(); liga.setNombre(nombreA);
  const B = instalarAlmacen(); liga.setNombre(nombreB);
  usarDispositivo(A);
  return { A, B };
}

describe('Supuesto: crear una liga exige datos validos', () => {
  beforeEach(() => { instalarAlmacen(); });
  it('sin nombre de pescador no se puede crear', () => {
    expect(() => liga.crear({ nombre: 'X', desde: '2026-07-01', hasta: '2026-07-31' })).toThrow(/nombre/);
  });
  it('fin anterior al inicio => error; nombre largo se acota', () => {
    liga.setNombre('Iker');
    expect(() => liga.crear({ nombre: 'X', desde: '2026-07-10', hasta: '2026-07-01' })).toThrow();
    expect(liga.crear({ nombre: 'x'.repeat(100), desde: '2026-07-01', hasta: '2026-07-31' }).nombre.length).toBeLessThanOrEqual(40);
  });
  it('modo desconocido => puntos', () => {
    liga.setNombre('Iker');
    expect(liga.crear({ nombre: 'X', desde: '2026-07-01', hasta: '2026-07-31', modo: 'trampa' }).modo).toBe('puntos');
  });
});

describe('Supuesto: el periodo son dias de calendario del pescador', () => {
  beforeEach(() => { instalarAlmacen(); liga.setNombre('Iker'); });
  it('a las 00:30 del primer dia la liga ya esta activa', () => {
    fijarAhora(local(2026, 7, 10, 0, 30));
    const l = liga.crear({ nombre: 'Julio', desde: '2026-07-10', hasta: '2026-07-20' });
    expect(liga.estado(l)).toBe('activa');
  });
  it('a las 23:30 del ultimo dia sigue activa; al dia siguiente, finalizada', () => {
    const l = { desde: '2026-07-10', hasta: '2026-07-20' };
    expect(liga.estado(l, local(2026, 7, 20, 23, 30))).toBe('activa');
    expect(liga.estado(l, local(2026, 7, 21, 12))).toBe('finalizada');
    expect(liga.estado(l, local(2026, 7, 9, 12))).toBe('próxima');
  });
  it('una captura a las 00:30 del primer dia cuenta en la liga', () => {
    const l = { desde: '2026-07-10', hasta: '2026-07-20' };
    expect(liga.dentroDelPeriodo(local(2026, 7, 10, 0, 30).toISOString(), l)).toBe(true);
    expect(liga.dentroDelPeriodo(local(2026, 7, 9, 23, 30).toISOString(), l)).toBe(false);
  });
});

describe('Supuesto: puntuacion segun el modo', () => {
  const caps = [['lubina', 40, null, '2026-07-10'], ['sargo', 30, null, '2026-07-11'], ['pulpo', null, 1.5, '2026-07-12']];
  it('capturas = numero de capturas', () => expect(liga.puntuar({ modo: 'capturas' }, caps).metrica).toBe(3));
  it('mayor = talla maxima', () => expect(liga.puntuar({ modo: 'mayor' }, caps).metrica).toBe(40));
  it('puntos = suma de tallas + 10 por captura sin talla', () => expect(liga.puntuar({ modo: 'puntos' }, caps).metrica).toBe(80));
  it('sin capturas = 0 en todos los modos', () => {
    for (const modo of ['capturas', 'mayor', 'puntos']) expect(liga.puntuar({ modo }, []).metrica).toBe(0);
  });
});

describe('Supuesto: flujo completo entre dos moviles', () => {
  it('invitar -> unirse -> enviar resultado -> ranking con ambos, ordenado', () => {
    const { A, B } = dosDispositivos();
    fijarAhora(local(2026, 7, 15, 12));
    const l = liga.crear({ nombre: 'Julio', desde: '2026-07-01', hasta: '2026-07-31', modo: 'puntos' });
    anadir({ especie: 'lubina', talla: 40, fecha: local(2026, 7, 5, 8).toISOString() });
    const inv = liga.codigoInvitacion(l);

    usarDispositivo(B);
    anadir({ especie: 'sargo', talla: 30, fecha: local(2026, 7, 6, 8).toISOString() });
    anadir({ especie: 'dorada', talla: 35, fecha: local(2026, 7, 7, 8).toISOString() });
    anadir({ especie: 'dorada', talla: 99, fecha: local(2026, 8, 7, 8).toISOString() }); // fuera del periodo
    liga.importar(inv);
    const res = liga.codigoResultado(l.id);

    usarDispositivo(A);
    liga.importar(res);
    // la vista de trofeos refresca mi resultado antes de pintar el ranking
    const rk = liga.ranking(liga.actualizarMiResultado(l.id));
    expect(rk.map(p => [p.nombre, p.metrica])).toEqual([['Bea', 65], ['Iker', 40]]);
  });
  it('reimportar el resultado de un amigo lo actualiza sin duplicarlo', () => {
    const { A, B } = dosDispositivos();
    const l = liga.crear({ nombre: 'X', desde: '2000-01-01', hasta: '2100-01-01' });
    const inv = liga.codigoInvitacion(l);
    usarDispositivo(B); liga.importar(inv); const r1 = liga.codigoResultado(l.id);
    anadir({ especie: 'sargo', talla: 30 }); const r2 = liga.codigoResultado(l.id);
    usarDispositivo(A);
    liga.importar(r1);
    liga.importar(r2);
    const lg = liga.porId(l.id);
    expect(lg.participantes).toHaveLength(2);
    expect(liga.ranking(lg).find(p => p.nombre === 'Bea').n).toBe(1);
  });
  it('reimportar tampoco duplica si el amigo tiene un nombre largo (> 24 caracteres)', () => {
    const { A, B } = dosDispositivos('Iker', 'Bea');
    const l = liga.crear({ nombre: 'X', desde: '2000-01-01', hasta: '2100-01-01' });
    const inv = liga.codigoInvitacion(l);
    usarDispositivo(B); liga.importar(inv);
    // El nombre de liga.setNombre se acota a 24, pero un codigo puede traer
    // cualquier nombre (otra version de la app, perfil.js, edicion manual).
    const res = b64({ t: 'res', id: l.id, nombre: 'Bartolomé de las Casas Pérez', caps: [['sargo', 30, null, '2026-07-10']] });
    usarDispositivo(A);
    liga.importar(res);
    liga.importar(res);
    liga.importar(res);
    expect(liga.porId(l.id).participantes).toHaveLength(2);
  });
  it('mi propio codigo de resultado se rechaza', () => {
    dosDispositivos();
    const l = liga.crear({ nombre: 'X', desde: '2000-01-01', hasta: '2100-01-01' });
    expect(() => liga.importar(liga.codigoResultado(l.id))).toThrow(/tuyo/);
  });
  it('resultado de una liga que no tengo => error que pide la invitacion', () => {
    dosDispositivos();
    expect(() => liga.importar(b64({ t: 'res', id: 'l_otra', nombre: 'Bea', caps: [] }))).toThrow(/invitación/);
  });
});

describe('Supuesto: codigos rotos o manipulados no rompen nada', () => {
  let l;
  beforeEach(() => {
    dosDispositivos();
    l = liga.crear({ nombre: 'X', desde: '2026-07-01', hasta: '2026-07-31' });
  });
  const basura = ['', 'hola', 'PESCAPRO1:', 'PESCAPRO1:!!!', 'PESCAPRO1:' + Buffer.from('null').toString('base64'),
    'PESCAPRO1:' + Buffer.from('[1,2]').toString('base64'), 'PESCAPRO1:' + Buffer.from('{"t":"liga"}').toString('base64')];
  for (const c of basura) {
    it(`rechaza ${JSON.stringify(c.slice(0, 30))} con Error y no cambia las ligas`, () => {
      const antes = JSON.stringify(liga.listar());
      expect(() => liga.importar(c)).toThrow(Error);
      expect(JSON.stringify(liga.listar())).toBe(antes);
    });
  }
  it('tallas no numericas en un resultado ajeno: el ranking sigue siendo numerico y ordenable', () => {
    liga.importar(b64({ t: 'res', id: l.id, nombre: 'Tramposo', caps: [['lubina', 'mucho', null, '2026-07-10'], ['sargo', 30, 'x', '2026-07-11']] }));
    for (const p of liga.ranking(liga.porId(l.id))) {
      expect(Number.isFinite(p.metrica), `${p.nombre}: metrica ${p.metrica}`).toBe(true);
      expect(Number.isFinite(p.mayor)).toBe(true);
    }
  });
  it('capturas fuera del periodo del codigo ajeno se descartan', () => {
    liga.importar(b64({ t: 'res', id: l.id, nombre: 'Bea', caps: [['lubina', 50, null, '2026-06-30'], ['lubina', 40, null, '2026-07-15']] }));
    const bea = liga.ranking(liga.porId(l.id)).find(p => p.nombre === 'Bea');
    expect(bea.n).toBe(1);
  });
});
