/* Tests de récords personales, logros y competiciones (sin red) */
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const { PP, check, resumen } = require('./harness');
require('../www/js/cuaderno.js');
require('../www/js/records.js');

console.log('TEST RÉCORDS / LOGROS / LIGA');

const hoy = new Date();
const iso = (diasOffset, hora) => {
  const d = new Date(hoy.getTime() + diasOffset * 86400e3);
  d.setHours(hora != null ? hora : 12, 30, 0, 0);
  return d.toISOString();
};

/* ---- Récords ---- */
const caps = [
  { especie: 'lubina', talla: 54, peso: 1.8, fecha: iso(0, 6), fotoId: 'f1', spot: { nombre: 'Zarautz' }, condiciones: { indice: 22 } },
  { especie: 'lubina', talla: 40, peso: 0.9, fecha: iso(0, 20), spot: { nombre: 'Zarautz' } },
  { especie: 'calamar', talla: 22, fecha: iso(-1, 23), spot: { nombre: 'Getaria' } },
  { especie: 'sargo', talla: 28, fecha: iso(-1, 9), spot: { nombre: 'Orio' } },
  { especie: 'dorada', talla: 35, peso: 1.1, fecha: iso(0, 12), spot: { nombre: 'Zarautz' } },
  { especie: 'faneca', fecha: iso(0, 22), spot: { nombre: 'Zarautz' } }
];
const r = PP.records.calcular(caps);
check(r.total === 6, 'total de capturas: 6');
check(r.especiesDistintas === 5, 'especies distintas: 5');
check(r.porEspecie.lubina.talla.valor === 54, 'récord de talla de lubina: 54 cm');
check(r.porEspecie.lubina.peso.valor === 1.8, 'récord de peso de lubina: 1.8 kg');
check(r.mejorDia && r.mejorDia.n === 4, 'mejor día: 4 capturas (' + (r.mejorDia && r.mejorDia.n) + ')');
check(r.conFoto === 1 && r.spotsDistintos === 3, 'con foto: 1, spots: 3');

/* ---- Logros ---- */
const logros = PP.logros.evaluar(caps);
const porId = {};
logros.forEach(l => porId[l.id] = l);
check(porId.primera.conseguido, 'logro "primera captura" conseguido');
check(porId.cinco.conseguido, 'logro "5 capturas" conseguido');
check(porId.coleccionista.conseguido, 'logro "5 especies" conseguido');
check(!porId.maestro.conseguido && porId.maestro.progreso[0] === 5, 'logro "10 especies" pendiente con progreso 5/10');
check(porId['trofeo-lubina'].conseguido, 'logro "lubina ≥50cm" conseguido');
check(porId.madrugador.conseguido, 'logro madrugador (captura a las 6:30)');
check(!porId.nocturno.conseguido, 'logro nocturno NO conseguido (23:xx no cuenta como 0-5h)');
check(porId.contracorriente.conseguido, 'logro "contra pronóstico" (índice 22)');
check(porId.viajero.conseguido, 'logro viajero (3 spots) conseguido');
check(logros.length >= 14, 'hay al menos 14 logros definidos (' + logros.length + ')');

/* ---- Liga: perfil y creación ---- */
PP.liga.setNombre('Iker');
check(PP.liga.perfil().nombre === 'Iker', 'perfil guardado');

// Capturas reales en el cuaderno: 2 dentro del periodo, 1 fuera
PP.cuaderno.anadir({ especie: 'lubina', talla: 48, fecha: iso(0, 7) });
PP.cuaderno.anadir({ especie: 'calamar', talla: 20, fecha: iso(1, 22) });
PP.cuaderno.anadir({ especie: 'sargo', talla: 30, fecha: iso(-20, 10) }); // fuera del periodo

const fISO = (d) => new Date(hoy.getTime() + d * 86400e3).toISOString().slice(0, 10);
const liga = PP.liga.crear({ nombre: 'Liga de prueba', desde: fISO(-5), hasta: fISO(5), modo: 'puntos' });
check(liga.id && liga.participantes.length === 1 && liga.participantes[0].esYo, 'liga creada conmigo dentro');
check(PP.liga.estado(liga) === 'activa', 'estado: activa');
check(PP.liga.estado({ desde: fISO(2), hasta: fISO(9) }) === 'próxima', 'estado: próxima');
check(PP.liga.estado({ desde: fISO(-9), hasta: fISO(-2) }) === 'finalizada', 'estado: finalizada');

PP.liga.actualizarMiResultado(liga.id);
const l2 = PP.liga.porId(liga.id);
const yo = l2.participantes.find(p => p.esYo);
check(yo.caps.length === 2, 'mi resultado: 2 capturas dentro del periodo (la de hace 20 días queda fuera)');

/* ---- Puntuación en los 3 modos ---- */
const capsP = [['lubina', 48, null, iso(0)], ['calamar', 20, null, iso(0)], ['faneca', null, null, iso(0)]];
check(PP.liga.puntuar({ modo: 'capturas' }, capsP).metrica === 3, 'modo capturas: 3');
check(PP.liga.puntuar({ modo: 'mayor' }, capsP).metrica === 48, 'modo mayor: 48 cm');
check(PP.liga.puntuar({ modo: 'puntos' }, capsP).metrica === 78, 'modo puntos: 48+20+10 = 78');

/* ---- Códigos: invitación (round-trip) ---- */
const codigoInv = PP.liga.codigoInvitacion(liga);
check(codigoInv.startsWith('PESCAPRO1:'), 'código de invitación con prefijo');
let err = null;
try { PP.liga.importar(codigoInv); } catch (e) { err = e.message; }
check(err && err.includes('Ya estás'), 'importar invitación de una liga que ya tengo → aviso');

// Simula unirse desde otro móvil: borro la liga y la importo del código
PP.liga.borrar(liga.id);
const res1 = PP.liga.importar(codigoInv);
check(res1.tipo === 'liga' && PP.liga.porId(liga.id) != null, 'unirse por código de invitación');
check(PP.liga.porId(liga.id).participantes.find(p => p.esYo).caps.length === 2, 'al unirme, mi resultado se calcula del cuaderno');

/* ---- Códigos: resultado de un amigo ---- */
PP.liga.setNombre('Ander'); // simula el móvil del amigo generando su código
const codigoAnder = PP.liga.codigoResultado(liga.id);
PP.liga.setNombre('Iker');
// mi participante sigue llamándose Iker; importo el código de "Ander"
const res2 = PP.liga.importar(codigoAnder);
check(res2.tipo === 'res', 'resultado de amigo importado');
const rank = PP.liga.ranking(PP.liga.porId(liga.id));
check(rank.length === 2, 'ranking con 2 participantes');
check(rank.some(p => p.esYo) && rank.some(p => !p.esYo), 'ranking distingue tú/amigo');
check(rank[0].metrica >= rank[1].metrica, 'ranking ordenado de mayor a menor');

// Reimportar el mismo resultado actualiza en vez de duplicar
PP.liga.importar(codigoAnder);
check(PP.liga.porId(liga.id).participantes.length === 2, 'reimportar no duplica participantes');

/* ---- Códigos corruptos ---- */
let e1 = null; try { PP.liga.importar('esto no es un código'); } catch (e) { e1 = 1; }
let e2 = null; try { PP.liga.importar('PESCAPRO1:@@@@'); } catch (e) { e2 = 1; }
check(e1 && e2, 'códigos corruptos rechazados con error claro');

resumen('récords/liga');
