/* PescaPro - Logros (medallas desbloqueables, reglas puras sobre el
   historial de capturas). Antes vivia en el mismo archivo que records.js
   y liga.js (www/js/records.js) mezclando 3 namespaces; separado en su
   propio modulo como parte de la migracion a ES modules. */
import { calcular } from './records.js';
import { SunCalc } from '../vendor/suncalc.js';

const CEFALOPODOS = ['calamar', 'sepia', 'pulpo'];
const LAT_DEFAULT = 43.3;
const LON_DEFAULT = -8.4;

export const LISTA = [
  // === CAPTURAS ===
  { id: 'captura-bronce', img: './img/captura-bronce.png', icono: '🎣',
    nombre: 'Primera captura', desc: 'Registra tu primera captura',
    check: (st) => st.total >= 1, prog: (st) => [Math.min(st.total, 1), 1] },
  { id: 'captura-plata', img: './img/captura-plata.png', icono: '🐟',
    nombre: 'Cogiendo el ritmo', desc: '5 capturas registradas',
    check: (st) => st.total >= 5, prog: (st) => [Math.min(st.total, 5), 5] },
  { id: 'captura-oro', img: './img/captura-oro.png', icono: '🎖️',
    nombre: 'Pescador constante', desc: '25 capturas registradas',
    check: (st) => st.total >= 25, prog: (st) => [Math.min(st.total, 25), 25] },
  { id: 'captura-platino', img: './img/captura-platino.png', icono: '👑',
    nombre: 'Leyenda del espigón', desc: '50 capturas registradas',
    check: (st) => st.total >= 50, prog: (st) => [Math.min(st.total, 50), 50] },

  // === COLECCIONISTA ===
  { id: 'coleccionista-plata', img: './img/coleccionista-plata.png', icono: '📚',
    nombre: 'Coleccionista', desc: '5 especies distintas',
    check: (st) => st.especiesDistintas >= 5, prog: (st) => [Math.min(st.especiesDistintas, 5), 5] },
  { id: 'coleccionista-oro', img: './img/coleccionista-oro.png', icono: '🧙',
    nombre: 'Maestro de especies', desc: '10 especies distintas',
    check: (st) => st.especiesDistintas >= 10, prog: (st) => [Math.min(st.especiesDistintas, 10), 10] },
  { id: 'coleccionista-platino', img: './img/coleccionista-platino.png', icono: '🏅',
    nombre: 'Enciclopedia viviente', desc: '25 especies distintas',
    check: (st) => st.especiesDistintas >= 25, prog: (st) => [Math.min(st.especiesDistintas, 25), 25] },

  // === EGGING ===
  { id: 'egging-bronce', img: './img/egging-bronce.png', icono: '🦑',
    nombre: 'Primer eging', desc: 'Captura tu primer cefalópodo (calamar, sepia o pulpo)',
    check: (st) => cefalopodos(st) >= 1, prog: (st) => [Math.min(cefalopodos(st), 1), 1] },
  { id: 'egging-plata', img: './img/egging-plata.png', icono: '🦑',
    nombre: 'Eguero', desc: '10 cefalópodos capturados',
    check: (st) => cefalopodos(st) >= 10, prog: (st) => [Math.min(cefalopodos(st), 10), 10] },
  { id: 'egging-oro', img: './img/egging-oro.png', icono: '🦑',
    nombre: 'Rey del eging', desc: '25 cefalópodos capturados',
    check: (st) => cefalopodos(st) >= 25, prog: (st) => [Math.min(cefalopodos(st), 25), 25] },
  { id: 'egging-platino', img: './img/egging-platino.png', icono: '🦑',
    nombre: 'Maestro del eging', desc: '50 cefalópodos capturados',
    check: (st) => cefalopodos(st) >= 50, prog: (st) => [Math.min(cefalopodos(st), 50), 50] },

  // === ESPECIALES ===
  { id: 'madrugador', img: './img/madrugador .png', icono: '🌅',
    nombre: 'Madrugador', desc: 'Captura en los ±30 min del amanecer',
    check: (st, caps) => caps.some(c => esAmanecer(c)) },
  { id: 'nocturno', img: './img/nocturno.png', icono: '🌙',
    nombre: 'Ave nocturna', desc: 'Captura entre las 3:00 y las 7:00',
    check: (st, caps) => caps.some(c => { const h = horaDe(c); return h >= 3 && h < 7; }) },

  // === DÍA PERFECTO ===
  { id: 'dia-perfecto-plata', icono: '🔥', nombre: 'Día perfecto', desc: '3 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 3), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 3), 3] },
  { id: 'dia-perfecto-oro', icono: '🔥', nombre: 'Día perfecto', desc: '5 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 5), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 5), 5] },
  { id: 'dia-perfecto-platino', icono: '🔥', nombre: 'Día perfecto', desc: '10 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 10), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 10), 10] },

  // === SIN PNG POR AHORA ===
  { id: 'trofeo-lubina', icono: '🏆', nombre: 'Lubina de trofeo', desc: 'Una lubina de 50 cm o más',
    check: (st) => !!(st.porEspecie.lubina && st.porEspecie.lubina.talla && st.porEspecie.lubina.talla.valor >= 50) },
  { id: 'contracorriente', icono: '⛈️', nombre: 'Contra pronóstico', desc: 'Captura con índice de pesca < 30',
    check: (st, caps) => caps.some(c => c.condiciones && c.condiciones.indice != null && c.condiciones.indice < 30) },
  { id: 'fotografo', img: './img/camara.png', icono: '📸', nombre: 'Fotógrafo', desc: '5 capturas con foto',
    check: (st) => st.conFoto >= 5, prog: (st) => [Math.min(st.conFoto, 5), 5] },
  { id: 'viajero', img: './img/viajero.png', icono: '🧭', nombre: 'Explorador de costas', desc: 'Capturas en 5 spots distintos',
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
    const times = SunCalc.getTimes(fecha, LAT_DEFAULT, LON_DEFAULT);
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

/* Devuelve la lista de logros con estado {conseguido, progreso:[actual,meta]|null} */
export function evaluar(capturas) {
  const st = calcular(capturas);
  return LISTA.map(l => ({
    id: l.id, img: l.img || null, icono: l.icono, nombre: l.nombre, desc: l.desc,
    conseguido: !!l.check(st, capturas),
    progreso: l.prog ? l.prog(st) : null
  }));
}
