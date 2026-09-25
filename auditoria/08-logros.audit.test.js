/* SUPUESTOS de logros (descripciones visibles en records/logros.js y README
   "Trofeos"): cada logro se desbloquea exactamente cuando se cumple lo que
   dice su descripcion, el progreso mostrado es coherente con el estado, y
   un logro conseguido no se pierde por registrar mas capturas. Las horas
   ("amanecer", "entre las 3:00 y las 7:00", "mismo dia") son las del
   pescador y las del lugar de la captura. */
import { describe, it, expect, beforeEach } from 'vitest';
import { evaluar, LISTA } from '../src/domain/records/logros.js';
import { sol } from '../src/domain/solunar.js';
import { instalarAlmacen, local, prng, MIN } from './util.js';

beforeEach(() => { instalarAlmacen(); });

const cap = (extra) => Object.assign({ especie: 'lubina', talla: 40, fecha: local(2026, 5, 10, 12).toISOString() }, extra);
const estado = (caps) => Object.fromEntries(evaluar(caps).map(l => [l.id, l]));
const n = (k, f) => Array.from({ length: k }, (_, i) => f(i));

describe('Supuesto: catalogo de logros bien formado', () => {
  it('ids unicos, con nombre y descripcion', () => {
    const ids = LISTA.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LISTA) { expect(l.nombre).toBeTruthy(); expect(l.desc).toBeTruthy(); }
  });
});

describe('Supuesto: progreso coherente con el estado y logros que no se pierden', () => {
  const r = prng(11);
  const ESP = ['lubina', 'sargo', 'dorada', 'calamar', 'sepia', 'pulpo', 'jurel', 'caballa', 'lisa', 'congrio', 'faneca', 'salmonete'];
  const historial = n(120, (i) => cap({
    especie: ESP[Math.floor(r() * ESP.length)],
    talla: Math.round(15 + r() * 50),
    fecha: new Date(local(2026, 1, 1).getTime() + Math.floor(r() * 200 * 24) * 3600e3).toISOString(),
    fotoId: r() < 0.2 ? 'f' + i : null,
    spot: { nombre: 'spot' + Math.floor(r() * 8), lat: 43 + r(), lon: -8 + r() },
    condiciones: { indice: Math.round(r() * 100) },
  }));
  it('con progreso: 0 <= actual <= meta y conseguido <=> actual == meta', () => {
    for (let k = 0; k <= historial.length; k += 7) {
      for (const l of evaluar(historial.slice(0, k))) {
        if (!l.progreso) continue;
        const [a, m] = l.progreso;
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(m);
        expect(l.conseguido, `${l.id} con ${k} capturas`).toBe(a >= m);
      }
    }
  });
  it('anadir capturas nunca quita un logro ya conseguido', () => {
    let prev = new Set();
    for (let k = 0; k <= historial.length; k += 5) {
      const ahora = new Set(evaluar(historial.slice(0, k)).filter(l => l.conseguido).map(l => l.id));
      for (const id of prev) expect(ahora.has(id), `${id} desaparece con ${k} capturas`).toBe(true);
      prev = ahora;
    }
  });
});

describe('Supuesto: umbrales exactos de las descripciones', () => {
  const casos = [['captura-bronce', 1], ['captura-plata', 5], ['captura-oro', 25], ['captura-platino', 50]];
  for (const [id, k] of casos) {
    it(`${id}: se consigue con ${k} capturas y no con ${k - 1}`, () => {
      expect(estado(n(k - 1, () => cap()))[id].conseguido).toBe(false);
      expect(estado(n(k, () => cap()))[id].conseguido).toBe(true);
    });
  }
  it('coleccionista: 5 especies distintas (no 5 capturas de la misma)', () => {
    expect(estado(n(5, () => cap()))['coleccionista-plata'].conseguido).toBe(false);
    const cinco = ['lubina', 'sargo', 'dorada', 'jurel', 'lisa'].map(e => cap({ especie: e }));
    expect(estado(cinco)['coleccionista-plata'].conseguido).toBe(true);
  });
  it('eging cuenta calamar + sepia + pulpo, y nada mas', () => {
    const nueve = [...n(3, () => cap({ especie: 'calamar' })), ...n(3, () => cap({ especie: 'sepia' })), ...n(3, () => cap({ especie: 'pulpo' }))];
    expect(estado([...nueve, ...n(5, () => cap({ especie: 'lubina' }))])['egging-plata'].conseguido).toBe(false);
    expect(estado([...nueve, cap({ especie: 'calamar' })])['egging-plata'].conseguido).toBe(true);
  });
  it('lubina de trofeo: 50 cm si, 49.9 no, y solo lubina', () => {
    expect(estado([cap({ talla: 49.9 })])['trofeo-lubina'].conseguido).toBe(false);
    expect(estado([cap({ talla: 50 })])['trofeo-lubina'].conseguido).toBe(true);
    expect(estado([cap({ especie: 'congrio', talla: 120 })])['trofeo-lubina'].conseguido).toBe(false);
  });
  it('contra pronostico: indice < 30 (29 si, 30 no)', () => {
    expect(estado([cap({ condiciones: { indice: 30 } })]).contracorriente.conseguido).toBe(false);
    expect(estado([cap({ condiciones: { indice: 29 } })]).contracorriente.conseguido).toBe(true);
  });
  it('fotografo: 5 capturas con foto', () => {
    expect(estado(n(4, (i) => cap({ fotoId: 'f' + i })))['fotografo'].conseguido).toBe(false);
    expect(estado(n(5, (i) => cap({ fotoId: 'f' + i })))['fotografo'].conseguido).toBe(true);
  });
  it('explorador: 5 spots distintos', () => {
    expect(estado(n(5, () => cap({ spot: { nombre: 'mismo' } }))).viajero.conseguido).toBe(false);
    expect(estado(n(5, (i) => cap({ spot: { nombre: 's' + i } }))).viajero.conseguido).toBe(true);
  });
});

describe('Supuesto: horas del pescador y lugar de la captura', () => {
  it('ave nocturna: 3:00 local si, 2:59 no, 7:00 no', () => {
    expect(estado([cap({ fecha: local(2026, 7, 10, 3, 0).toISOString() })]).nocturno.conseguido).toBe(true);
    expect(estado([cap({ fecha: local(2026, 7, 10, 2, 59).toISOString() })]).nocturno.conseguido).toBe(false);
    expect(estado([cap({ fecha: local(2026, 7, 10, 7, 0).toISOString() })]).nocturno.conseguido).toBe(false);
  });
  it('dia perfecto: 3 capturas el mismo dia LOCAL (madrugada de verano incluida)', () => {
    const caps = [local(2026, 7, 10, 0, 30), local(2026, 7, 10, 1, 30), local(2026, 7, 10, 12)].map(f => cap({ fecha: f.toISOString() }));
    expect(estado(caps)['dia-perfecto-plata'].conseguido).toBe(true);
  });
  it('dia perfecto: 3 capturas en dias distintos NO cuentan', () => {
    const caps = [local(2026, 7, 9, 23, 30), local(2026, 7, 10, 0, 30), local(2026, 7, 11, 0, 30)].map(f => cap({ fecha: f.toISOString() }));
    expect(estado(caps)['dia-perfecto-plata'].conseguido).toBe(false);
  });
  const SPOTS = {
    'Zarautz (Cantabrico, spot por defecto de la app)': { lat: 43.29, lon: -2.17 },
    'Barcelona': { lat: 41.38, lon: 2.19 },
    'A Coruña': { lat: 43.37, lon: -8.40 },
    'Las Palmas (Canarias)': { lat: 28.10, lon: -15.43 },
    'Cadiz': { lat: 36.53, lon: -6.30 },
  };
  for (const [nombre, p] of Object.entries(SPOTS)) {
    it(`madrugador: captura en el amanecer de ${nombre} cuenta`, () => {
      const am = sol(local(2026, 5, 10, 12), p.lat, p.lon).amanecer;
      const c = cap({ fecha: new Date(am.getTime() + 10 * MIN).toISOString(), spot: { nombre, lat: p.lat, lon: p.lon } });
      expect(estado([c]).madrugador.conseguido).toBe(true);
    });
  }
  it('madrugador: a mediodia no cuenta', () => {
    expect(estado([cap({ fecha: local(2026, 5, 10, 13).toISOString(), spot: { nombre: 'x', lat: 43.29, lon: -2.17 } })]).madrugador.conseguido).toBe(false);
  });
  it('guardian del faro: a 500 m de Fisterra si, a 3 km no', () => {
    expect(estado([cap({ spot: { nombre: 'f', lat: 42.88236 + 0.0045, lon: -9.27196 } })]).faro.conseguido).toBe(true);
    expect(estado([cap({ spot: { nombre: 'f', lat: 42.88236 + 0.027, lon: -9.27196 } })]).faro.conseguido).toBe(false);
  });
});
