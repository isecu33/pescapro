/* PescaPro - Logros (medallas desbloqueables, reglas puras sobre el
   historial de capturas). Antes vivia en el mismo archivo que records.js
   y liga.js (www/js/records.js) mezclando 3 namespaces; separado en su
   propio modulo como parte de la migracion a ES modules. */
import { calcular } from './records.js';

const CEFALOPODOS = ['calamar', 'sepia', 'pulpo'];

export const LISTA = [
  { id: 'primera', icono: '🎣', nombre: 'Primera captura', desc: 'Registra tu primera captura',
    check: (st) => st.total >= 1, prog: (st) => [Math.min(st.total, 1), 1] },
  { id: 'cinco', icono: '🐟', nombre: 'Cogiendo el ritmo', desc: '5 capturas',
    check: (st) => st.total >= 5, prog: (st) => [Math.min(st.total, 5), 5] },
  { id: 'veinticinco', icono: '🎖️', nombre: 'Pescador constante', desc: '25 capturas',
    check: (st) => st.total >= 25, prog: (st) => [Math.min(st.total, 25), 25] },
  { id: 'cien', icono: '👑', nombre: 'Leyenda del espigón', desc: '100 capturas',
    check: (st) => st.total >= 100, prog: (st) => [Math.min(st.total, 100), 100] },
  { id: 'coleccionista', icono: '📚', nombre: 'Coleccionista', desc: '5 especies distintas',
    check: (st) => st.especiesDistintas >= 5, prog: (st) => [Math.min(st.especiesDistintas, 5), 5] },
  { id: 'maestro', icono: '🧙', nombre: 'Maestro de especies', desc: '10 especies distintas',
    check: (st) => st.especiesDistintas >= 10, prog: (st) => [Math.min(st.especiesDistintas, 10), 10] },
  { id: 'trofeo-lubina', icono: '🏆', nombre: 'Lubina de trofeo', desc: 'Una lubina de 50 cm o más',
    check: (st) => !!(st.porEspecie.lubina && st.porEspecie.lubina.talla && st.porEspecie.lubina.talla.valor >= 50) },
  { id: 'calamarero', icono: '🦑', nombre: 'Rey del eging', desc: '10 cefalópodos (calamar, sepia o pulpo)',
    check: (st) => cefalopodos(st) >= 10, prog: (st) => [Math.min(cefalopodos(st), 10), 10] },
  { id: 'madrugador', icono: '🌅', nombre: 'Madrugador', desc: 'Captura entre las 5:00 y las 8:00',
    check: (st, caps) => caps.some(c => horaDe(c) >= 5 && horaDe(c) < 8) },
  { id: 'nocturno', icono: '🌙', nombre: 'Ave nocturna', desc: 'Captura entre las 0:00 y las 5:00',
    check: (st, caps) => caps.some(c => horaDe(c) >= 0 && horaDe(c) < 5) },
  { id: 'contracorriente', icono: '⛈️', nombre: 'Contra pronóstico', desc: 'Captura con índice de pesca < 30',
    check: (st, caps) => caps.some(c => c.condiciones && c.condiciones.indice != null && c.condiciones.indice < 30) },
  { id: 'dia-perfecto', icono: '🔥', nombre: 'Día perfecto', desc: '5 capturas en un mismo día',
    check: (st) => !!(st.mejorDia && st.mejorDia.n >= 5), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 5), 5] },
  { id: 'fotografo', icono: '📸', nombre: 'Fotógrafo', desc: '5 capturas con foto',
    check: (st) => st.conFoto >= 5, prog: (st) => [Math.min(st.conFoto, 5), 5] },
  { id: 'viajero', icono: '🧭', nombre: 'Explorador de costas', desc: 'Capturas en 3 spots distintos',
    check: (st) => st.spotsDistintos >= 3, prog: (st) => [Math.min(st.spotsDistintos, 3), 3] }
];

function cefalopodos(st) {
  return CEFALOPODOS.reduce((s, id) => s + (st.porEspecie[id] ? st.porEspecie[id].n : 0), 0);
}
function horaDe(c) {
  const d = new Date(c.fecha);
  return isNaN(d) ? -1 : d.getHours();
}

/* Devuelve la lista de logros con estado {conseguido, progreso:[actual,meta]|null} */
export function evaluar(capturas) {
  const st = calcular(capturas);
  return LISTA.map(l => ({
    id: l.id, icono: l.icono, nombre: l.nombre, desc: l.desc,
    conseguido: !!l.check(st, capturas),
    progreso: l.prog ? l.prog(st) : null
  }));
}
