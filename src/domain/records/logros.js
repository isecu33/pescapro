/* PescaPro - Logros (medallas desbloqueables, reglas puras sobre el
   historial de capturas). Antes vivia en el mismo archivo que records.js
   y liga.js (www/js/records.js) mezclando 3 namespaces; separado en su
   propio modulo como parte de la migracion a ES modules. */
import { calcular } from './records.js';
import { SunCalc } from '../vendor/suncalc.js';
import { logroOverride } from '../dev.js';

const CEFALOPODOS = ['calamar', 'sepia', 'pulpo'];
const LAT_DEFAULT = 43.3;
const LON_DEFAULT = -8.4;

/* Faros de la costa gallega (fuente: Wikipedia, Anexo:Faros de España) para
   el logro "faro". Lista curada a mano, no exhaustiva. */
const FAROS = [
  { nombre: 'Cabo Corrubedo', lat: 42.57627, lon: -9.09009 },
  { nombre: 'Fisterra', lat: 42.88236, lon: -9.27196 },
  { nombre: 'Cabo Ortegal', lat: 43.77107, lon: -7.87018 },
  { nombre: 'Cabo Prior', lat: 43.56761, lon: -8.31453 },
  { nombre: 'Cabo Prioriño', lat: 43.45879, lon: -8.34033 },
  { nombre: 'Cabo Vilán', lat: 43.16041, lon: -9.21093 },
  { nombre: 'Islas Sisargas', lat: 43.35991, lon: -8.84457 },
  { nombre: 'Isla Pancha', lat: 43.55654, lon: -7.04204 },
  { nombre: 'Estaca de Bares', lat: 43.78583, lon: -7.68417 },
  { nombre: 'Cabo Silleiro', lat: 42.10436, lon: -8.89655 },
  { nombre: 'Isla de Sálvora', lat: 42.46586, lon: -9.01308 },
  { nombre: 'Isla de Ons', lat: 42.38244, lon: -8.93639 }
];
const FARO_RADIO_KM = 1;

export const LISTA = [
  // === CAPTURAS ===
  { id: 'captura-bronce', img: './logros/captura-bronce.png', icono: '🎣',
    nombre: 'Primera captura', desc: 'Registra tu primera captura',
    check: (st) => st.total >= 1, prog: (st) => [Math.min(st.total, 1), 1] },
  { id: 'captura-plata', img: './logros/captura-plata.png', icono: '🐟',
    nombre: 'Cogiendo el ritmo', desc: '5 capturas registradas',
    check: (st) => st.total >= 5, prog: (st) => [Math.min(st.total, 5), 5] },
  { id: 'captura-oro', img: './logros/captura-oro.png', icono: '🎖️',
    nombre: 'Pescador constante', desc: '25 capturas registradas',
    check: (st) => st.total >= 25, prog: (st) => [Math.min(st.total, 25), 25] },
  { id: 'captura-platino', img: './logros/captura-platino.png', icono: '👑',
    nombre: 'Leyenda del espigón', desc: '50 capturas registradas',
    check: (st) => st.total >= 50, prog: (st) => [Math.min(st.total, 50), 50] },

  // === COLECCIONISTA ===
  { id: 'coleccionista-plata', img: './logros/coleccionista-plata.png', icono: '📚',
    nombre: 'Coleccionista', desc: '5 especies distintas',
    check: (st) => st.especiesDistintas >= 5, prog: (st) => [Math.min(st.especiesDistintas, 5), 5] },
  { id: 'coleccionista-oro', img: './logros/coleccionista-oro.png', icono: '🧙',
    nombre: 'Maestro de especies', desc: '10 especies distintas',
    check: (st) => st.especiesDistintas >= 10, prog: (st) => [Math.min(st.especiesDistintas, 10), 10] },
  { id: 'coleccionista-platino', img: './logros/coleccionista-platino.png', icono: '🏅',
    nombre: 'Enciclopedia viviente', desc: '25 especies distintas',
    check: (st) => st.especiesDistintas >= 25, prog: (st) => [Math.min(st.especiesDistintas, 25), 25] },

  // === EGGING ===
  { id: 'egging-bronce', img: './logros/egging-bronce.png', icono: '🦑',
    nombre: 'Primer eging', desc: 'Captura tu primer cefalópodo (calamar, sepia o pulpo)',
    check: (st) => cefalopodos(st) >= 1, prog: (st) => [Math.min(cefalopodos(st), 1), 1] },
  { id: 'egging-plata', img: './logros/egging-plata.png', icono: '🦑',
    nombre: 'Eguero', desc: '10 cefalópodos capturados',
    check: (st) => cefalopodos(st) >= 10, prog: (st) => [Math.min(cefalopodos(st), 10), 10] },
  { id: 'egging-oro', img: './logros/egging-oro.png', icono: '🦑',
    nombre: 'Rey del eging', desc: '25 cefalópodos capturados',
    check: (st) => cefalopodos(st) >= 25, prog: (st) => [Math.min(cefalopodos(st), 25), 25] },
  { id: 'egging-platino', img: './logros/egging-platino.png', icono: '🦑',
    nombre: 'Maestro del eging', desc: '50 cefalópodos capturados',
    check: (st) => cefalopodos(st) >= 50, prog: (st) => [Math.min(cefalopodos(st), 50), 50] },

  // === ESPECIALES ===
  { id: 'madrugador', img: './logros/madrugador.png', icono: '🌅',
    nombre: 'Madrugador', desc: 'Captura en los ±30 min del amanecer',
    check: (st, caps) => caps.some(c => esAmanecer(c)) },
  { id: 'nocturno', img: './logros/nocturno.png', icono: '🌙',
    nombre: 'Ave nocturna', desc: 'Captura entre las 3:00 y las 7:00',
    check: (st, caps) => caps.some(c => { const h = horaDe(c); return h >= 3 && h < 7; }) },
  { id: 'faro', img: './logros/faro.png', icono: '🚨',
    nombre: 'Guardián del faro', desc: `Captura a menos de ${FARO_RADIO_KM} km de un faro`,
    check: (st, caps) => caps.some(c => cercaDeFaro(c)) },

  // === DÍA PERFECTO ===
  { id: 'dia-perfecto-plata', img: './logros/dia-perfecto-plata.png', icono: '🔥', nombre: 'Día perfecto', desc: '3 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 3), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 3), 3] },
  { id: 'dia-perfecto-oro', img: './logros/dia-perfecto-oro.png', icono: '🔥', nombre: 'Día perfecto', desc: '5 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 5), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 5), 5] },
  { id: 'dia-perfecto-platino', img: './logros/dia-perfecto-platino.png', icono: '🔥', nombre: 'Día perfecto', desc: '10 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 10), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 10), 10] },

  // === ESPECIALES 2 ===
  { id: 'trofeo-lubina', img: './logros/lubina-xxl.png', icono: '🏆', nombre: 'Lubina de trofeo', desc: 'Una lubina de 50 cm o más',
    check: (st) => !!(st.porEspecie.lubina && st.porEspecie.lubina.talla && st.porEspecie.lubina.talla.valor >= 50) },
  { id: 'contracorriente', img: './logros/contracorriente-2.png', icono: '⛈️', nombre: 'Contra pronóstico', desc: 'Captura con índice de pesca < 30',
    check: (st, caps) => caps.some(c => c.condiciones && c.condiciones.indice != null && c.condiciones.indice < 30) },
  { id: 'fotografo', img: './logros/camara.png', icono: '📸', nombre: 'Fotógrafo', desc: '5 capturas con foto',
    check: (st) => st.conFoto >= 5, prog: (st) => [Math.min(st.conFoto, 5), 5] },
  { id: 'viajero', img: './logros/viajero.png', icono: '🧭', nombre: 'Explorador de costas', desc: 'Capturas en 5 spots distintos',
    check: (st) => st.spotsDistintos >= 5, prog: (st) => [Math.min(st.spotsDistintos, 5), 5] }
];

function cefalopodos(st) {
  return CEFALOPODOS.reduce((s, id) => s + (st.porEspecie[id] ? st.porEspecie[id].n : 0), 0);
}

function horaDe(c) {
  const d = new Date(c.fecha);
  return isNaN(d) ? -1 : d.getHours();
}

function esAmanecer(c) {
  const fecha = new Date(c.fecha);
  if (isNaN(fecha)) return false;
  try {
    // Amanecer del lugar de la captura; sin coordenadas, el de por defecto.
    const conSpot = c.spot && typeof c.spot.lat === 'number' && typeof c.spot.lon === 'number';
    const times = SunCalc.getTimes(fecha, conSpot ? c.spot.lat : LAT_DEFAULT, conSpot ? c.spot.lon : LON_DEFAULT);
    const amanecer = times.sunrise;
    if (!amanecer || isNaN(amanecer.getTime())) {
      const h = fecha.getHours();
      return h >= 6 && h < 8;
    }
    return Math.abs(fecha - amanecer) <= 30 * 60 * 1000;
  } catch (e) {
    const h = fecha.getHours();
    return h >= 6 && h < 8;
  }
}

/* Distancia en km entre dos puntos (fórmula haversine) */
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cercaDeFaro(c) {
  if (!c.spot || c.spot.lat == null || c.spot.lon == null) return false;
  return FAROS.some(f => distanciaKm(c.spot.lat, c.spot.lon, f.lat, f.lon) <= FARO_RADIO_KM);
}

/* Devuelve la lista de logros con estado {conseguido, progreso:[actual,meta]|null} */
export function evaluar(capturas) {
  const st = calcular(capturas);
  return LISTA.map(l => {
    const forzado = logroOverride(l.id);
    return {
      id: l.id, img: l.img || null, icono: l.icono, nombre: l.nombre, desc: l.desc,
      conseguido: forzado != null ? forzado : !!l.check(st, capturas),
      progreso: l.prog ? l.prog(st) : null
    };
  });
}
