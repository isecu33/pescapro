const { PP, check, resumen } = require('./harness');
const { generarDatos } = require('./fixtures');

console.log('TEST MAREAS');
const datos = generarDatos({ amplitudMarea: 2.0, horasFuturas: 96 });

const exts = PP.mareas.extremos(datos.horas);
check(exts.length >= 14 && exts.length <= 20, 'nº de extremos plausible en ~108 h (obtenido ' + exts.length + ')');

let alternan = true;
for (let i = 1; i < exts.length; i++) if (exts[i].tipo === exts[i - 1].tipo) alternan = false;
check(alternan, 'pleamares y bajamares alternan');

const seps = [];
for (let i = 1; i < exts.length; i++) seps.push((exts[i].fecha - exts[i - 1].fecha) / 3600e3);
const sepMedia = seps.reduce((a, b) => a + b, 0) / seps.length;
check(Math.abs(sepMedia - 6.21) < 0.35, 'separación media ~6.21 h entre extremos (obtenida ' + sepMedia.toFixed(2) + ' h)');

const pleas = exts.filter(e => e.tipo === 'pleamar');
check(pleas.every(p => Math.abs(p.altura - 2.0) < 0.06), 'altura de pleamar ≈ +2.0 m con interpolación parabólica');

const amp = PP.mareas.amplitud(exts, new Date());
check(amp && Math.abs(amp.rango - 4.0) < 0.15, 'rango ≈ 4.0 m (obtenido ' + (amp && amp.rango.toFixed(2)) + ')');
check(amp && amp.clase === 'vivas', 'clasificada como mareas vivas');
check(amp && amp.coef >= 95 && amp.coef <= 120, 'coeficiente orientativo alto (obtenido ' + (amp && amp.coef) + ')');

// Estado a mitad de semiciclo: flujo alto; cerca del extremo: flujo bajo
const m = PP.mareas.analizar(datos);
check(m.ahora != null, 'estado actual calculado');
if (m.ahora) {
  const medio = new Date((m.ahora.anterior.fecha.getTime() + m.ahora.siguiente.fecha.getTime()) / 2);
  const estMedio = m.estadoEn(medio);
  check(estMedio.flujo > 0.95, 'flujo ≈ máximo a media marea (' + estMedio.flujo.toFixed(2) + ')');
  const casiExtremo = new Date(m.ahora.siguiente.fecha.getTime() - 15 * 60e3);
  const estExt = m.estadoEn(casiExtremo);
  check(estExt.flujo < 0.35, 'flujo bajo cerca del extremo (' + estExt.flujo.toFixed(2) + ')');
  check(['subiendo', 'bajando', 'pleamar', 'bajamar'].includes(m.ahora.fase), 'fase válida: ' + m.ahora.fase);
}
check(m.proximos.length >= 3, 'hay próximas mareas listadas');

// Mareas muertas
const datos2 = generarDatos({ amplitudMarea: 0.9 });
const amp2 = PP.mareas.amplitud(PP.mareas.extremos(datos2.horas), new Date());
check(amp2 && amp2.clase === 'muertas', 'rango 1.8 m clasificado como muertas');

// Serie con huecos (null) no revienta
const datos3 = generarDatos({});
datos3.horas.forEach((h, i) => { if (i % 7 === 3) h.nivelMar = null; });
const exts3 = PP.mareas.extremos(datos3.horas);
check(Array.isArray(exts3), 'la serie con huecos no lanza errores');

resumen('mareas');
