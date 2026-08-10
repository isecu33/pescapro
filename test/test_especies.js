const { PP, check, resumen } = require('./harness');
const { generarDatos } = require('./fixtures');

console.log('TEST ESPECIES');

// --- integridad de la base de datos ---
let integridad = true;
for (const e of PP.ESPECIES) {
  if (e.meses.length !== 12) integridad = false;
  if (!(e.sst.length === 4 && e.sst[0] <= e.sst[1] && e.sst[1] <= e.sst[2] && e.sst[2] <= e.sst[3])) integridad = false;
  if (!(e.oleaje.length === 4)) integridad = false;
  for (const k of ['subiendo', 'pleamar', 'bajando', 'bajamar']) if (e.marea[k] == null) integridad = false;
  for (const k of ['amanecer', 'dia', 'atardecer', 'noche']) if (e.momento[k] == null) integridad = false;
  if (e.luna.length !== 4) integridad = false;
  if (!e.modos.every(m => PP.MODOS[m])) integridad = false;
  if (e.meses.some(v => v < 0 || v > 1)) integridad = false;
}
check(integridad, 'las ' + PP.ESPECIES.length + ' especies tienen todos los campos bien formados');

// --- actividad en rango para todas las especies y horas ---
const datos = generarDatos({ sst: 15, ola: 0.8 });
const ctx = PP.indice.preparar(datos);
let rango = true;
for (const e of PP.ESPECIES) {
  for (let i = 0; i < datos.horas.length; i += 5) {
    const a = PP.indice.actividadEspecie(e, datos.horas[i], ctx);
    if (!(a.valor >= 0 && a.valor <= 100)) rango = false;
  }
}
check(rango, 'actividad siempre entre 0 y 100');

// --- calamar: condición típica de otoño en calma vs verano con mar gruesa ---
const calamar = PP.especiePorId('calamar');
const hOtono = Object.assign({}, datos.horas[10]);
hOtono.fecha = new Date(new Date().getFullYear(), 10, 15, 20, 0); // 15 nov 20:00 (noche)
hOtono.sst = 15; hOtono.ola = 0.3;
const hVerano = Object.assign({}, datos.horas[10]);
hVerano.fecha = new Date(new Date().getFullYear(), 6, 15, 13, 0); // 15 jul 13:00 (mediodía)
hVerano.sst = 22; hVerano.ola = 1.8;
const aOtono = PP.indice.actividadEspecie(calamar, hOtono, ctx);
const aVerano = PP.indice.actividadEspecie(calamar, hVerano, ctx);
check(aOtono.valor > aVerano.valor + 25, 'calamar: noche de noviembre en calma (' + aOtono.valor + ') ≫ mediodía de julio con mar (' + aVerano.valor + ')');

// --- lubina: prefiere mar movido al plato total ---
const lubina = PP.especiePorId('lubina');
const hMovida = Object.assign({}, datos.horas[10], { ola: 1.3 });
const hPlato = Object.assign({}, datos.horas[10], { ola: 0.05 });
const aMovida = PP.indice.actividadEspecie(lubina, hMovida, ctx);
const aPlato = PP.indice.actividadEspecie(lubina, hPlato, ctx);
check(aMovida.valor > aPlato.valor, 'lubina: mar movido (' + aMovida.valor + ') > mar plato (' + aPlato.valor + ')');

// --- faneca: invierno > verano ---
const faneca = PP.especiePorId('faneca');
const hInv = Object.assign({}, datos.horas[10]);
hInv.fecha = new Date(new Date().getFullYear(), 0, 10, 22, 0); hInv.sst = 12;
const hVer = Object.assign({}, datos.horas[10]);
hVer.fecha = new Date(new Date().getFullYear(), 6, 10, 22, 0); hVer.sst = 21;
check(PP.indice.actividadEspecie(faneca, hInv, ctx).valor > PP.indice.actividadEspecie(faneca, hVer, ctx).valor,
  'faneca: enero > julio');

// --- ranking y mejores horas ---
const rank = PP.indice.especiesEn(new Date(), ctx);
check(rank.length === PP.ESPECIES.length, 'ranking incluye todas las especies');
let ordenado = true;
for (let i = 1; i < rank.length; i++) if (rank[i].act.valor > rank[i - 1].act.valor) ordenado = false;
check(ordenado, 'ranking ordenado de mayor a menor actividad');

const mejores = PP.indice.mejoresHorasEspecie(lubina, ctx, 72);
check(mejores.length <= 5 && mejores.every(m => m.hora.fecha.getTime() >= Date.now() - 3600e3), 'mejores horas de especie: ≤5 y futuras');

resumen('especies');
