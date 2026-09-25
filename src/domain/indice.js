/* PescaPro - Motor del ÍNDICE DE PESCA (0-100) y de actividad por especie.
   100% basado en reglas ponderadas (sin IA): cada factor ambiental se puntúa
   0..1 con funciones trapecio y se combina con los pesos de la modalidad.
   Factores: viento, oleaje, flujo de marea, solunar, momento del día,
   tendencia de presión, cielo/lluvia, corriente y temperatura del agua. */
import { MODOS, SEGURIDAD, util } from './config.js';
import { ESPECIES } from './especies.js';
import { analizar as analizarMareas } from './mareas.js';
import { periodos as periodosSolunares, factorSolunar, momentoDelDia, luna as lunaEn } from './solunar.js';

/* Prepara el contexto de cálculo para una tanda de datos:
   - análisis de mareas
   - periodos solunares por día (cacheados)
   - tendencia de presión anotada en cada hora (p[i] - p[i-6h]) */
export function preparar(datos) {
  const m = analizarMareas(datos);
  const horas = datos.horas;
  for (let i = 0; i < horas.length; i++) {
    const j = i - 6;
    horas[i].presionTend = (j >= 0 && horas[i].presion != null && horas[j].presion != null)
      ? horas[i].presion - horas[j].presion : null;
  }
  const cachePeriodos = {};
  function periodosDe(fecha) {
    const k = fecha.getFullYear() + '-' + fecha.getMonth() + '-' + fecha.getDate();
    if (!cachePeriodos[k]) cachePeriodos[k] = periodosSolunares(fecha, datos.lat, datos.lon);
    return cachePeriodos[k];
  }
  return { datos, mareas: m, periodosDe, lat: datos.lat, lon: datos.lon };
}

/* Seguridad: devuelve {nivel:'ok'|'amarillo'|'rojo', motivos:[]} */
export function seguridad(h) {
  const S = SEGURIDAD, motivos = [];
  let nivel = 'ok';
  if (h.codigo != null && S.codigosTormenta.includes(h.codigo)) { nivel = 'rojo'; motivos.push('Tormenta eléctrica prevista'); }
  if (h.viento != null && h.viento >= S.rojo.viento) { nivel = 'rojo'; motivos.push('Viento muy fuerte (' + Math.round(h.viento) + ' km/h)'); }
  if (h.racha != null && h.racha >= S.rojo.racha) { nivel = 'rojo'; motivos.push('Rachas peligrosas (' + Math.round(h.racha) + ' km/h)'); }
  if (h.ola != null && h.ola >= S.rojo.ola) { nivel = 'rojo'; motivos.push('Oleaje peligroso (' + h.ola.toFixed(1) + ' m) — no te acerques a rompientes'); }
  if (nivel === 'ok') {
    if (h.viento != null && h.viento >= S.amarillo.viento) { nivel = 'amarillo'; motivos.push('Viento fuerte'); }
    if (h.racha != null && h.racha >= S.amarillo.racha) { nivel = 'amarillo'; motivos.push('Rachas fuertes'); }
    if (h.ola != null && h.ola >= S.amarillo.ola) { nivel = 'amarillo'; motivos.push('Mar gruesa: cuidado en roca baja'); }
    if (h.codigo != null && S.codigosLluviaFuerte.includes(h.codigo)) { nivel = 'amarillo'; motivos.push('Lluvia fuerte'); }
  }
  return { nivel, motivos };
}

/* Factores 0..1 de una hora concreta para una modalidad */
export function factores(h, modo, ctx) {
  const M = MODOS[modo];
  const f = {};

  // Fix MEDIUM de auditoria: antes usaba -1 como limite inferior fijo, lo
  // que desviaba el modelo para modalidades con vientoOK[0] distinto de -1
  // (ej. spinning [0,4,18,32]: a viento=0 daba 0.2 en vez de ~0). Se aplica
  // el mismo patron "min - 0.001" que ya usan oleaje/corriente para evitar
  // el caso limite de trap() cuando min === opt1 (ej. eging [0,0,12,22]).
  f.viento = util.trap(h.viento, M.vientoOK[0] - 0.001, M.vientoOK[1], M.vientoOK[2], M.vientoOK[3]);
  f.oleaje = util.trap(h.ola, M.oleajeOK[0] - 0.001, M.oleajeOK[1], M.oleajeOK[2], M.oleajeOK[3]);
  f.corriente = util.trap(h.corriente, M.corrienteOK[0] - 0.001, M.corrienteOK[1], M.corrienteOK[2], M.corrienteOK[3]);

  // Marea: flujo (media marea = máxima corriente = actividad) + preferencia de fase
  const em = ctx.mareas.estadoEn(h.fecha);
  if (em) {
    let fm = 0.35 + 0.65 * em.flujo; // el flujo manda
    if (modo === 'surfcasting' && em.subiendo) fm = Math.min(1, fm + 0.15); // subiendo suma en playa
    if (modo === 'eging' && (em.fase === 'pleamar' || em.subiendo)) fm = Math.min(1, fm + 0.10);
    f.marea = fm;
  } else f.marea = 0.5;

  // Solunar
  f.solunar = factorSolunar(h.fecha, ctx.periodosDe(h.fecha));

  // Momento del día
  const mom = momentoDelDia(h.fecha, ctx.lat, ctx.lon);
  f.momento = (mom === 'amanecer' || mom === 'atardecer') ? 1.0 : (mom === 'noche' ? M.noche : 0.4);
  f._momento = mom;

  // Tendencia de presión (hPa / 6h): bajada suave = pre-frente = actividad
  const t = h.presionTend;
  if (t == null) f.presion = 0.6;
  else if (t <= -6) f.presion = 0.25;      // caída brusca: temporal encima
  else if (t <= -1) f.presion = 1.0;       // bajada suave: a comer
  else if (t < 1) f.presion = 0.75;        // estable
  else if (t < 3) f.presion = 0.55;        // subiendo
  else f.presion = 0.4;                    // anticiclón entrando fuerte

  // Cielo/lluvia: nublado suave es bueno; diluvio no
  let cielo = 0.75;
  if (h.nubes != null) cielo = 0.6 + 0.4 * util.trap(h.nubes, -1, 20, 80, 101);
  if (h.lluvia != null) {
    if (h.lluvia > 4) cielo = 0.15;
    else if (h.lluvia > 1.5) cielo = Math.min(cielo, 0.45);
    else if (h.lluvia > 0.2) cielo = Math.min(cielo, 0.8);
  }
  if (h.codigo != null && SEGURIDAD.codigosTormenta.includes(h.codigo)) cielo = 0;
  f.cielo = cielo;

  // Temperatura del agua: banda templada genérica (las especies afinan la suya)
  f.sst = util.trap(h.sst, 6, 11, 21, 26);

  return f;
}

/* Índice 0..100 de una hora para una modalidad */
export function indiceHora(h, modo, ctx) {
  const M = MODOS[modo];
  const f = factores(h, modo, ctx);
  let s = 0;
  for (const k in M.pesos) s += M.pesos[k] * (f[k] != null ? f[k] : 0.5);
  let valor = Math.round(100 * s);
  const seg = seguridad(h);
  if (seg.nivel === 'rojo') valor = Math.min(valor, SEGURIDAD.capRojo);
  return { valor, factores: f, seguridad: seg, momento: f._momento };
}

/* Serie de índice para todas las horas futuras (y 2h pasadas) */
export function serie(ctx, modo) {
  const ahora = Date.now() - 2 * 3600e3;
  return ctx.datos.horas
    .filter(h => h.fecha.getTime() >= ahora)
    .map(h => ({ hora: h, ...indiceHora(h, modo, ctx) }));
}

/* Días con datos en la previsión actual (para el selector de calendario):
   una entrada por dia calendario, a medianoche local, en el orden en que
   aparecen en la serie (ya filtrada a horas futuras, ver serie()). */
export function diasDisponibles(ctx, modo) {
  const vistos = new Set();
  const dias = [];
  serie(ctx, modo).forEach(x => {
    const f = x.hora.fecha;
    const clave = f.getFullYear() + '-' + f.getMonth() + '-' + f.getDate();
    if (vistos.has(clave)) return;
    vistos.add(clave);
    dias.push(new Date(f.getFullYear(), f.getMonth(), f.getDate()));
  });
  return dias;
}

/* Resumen por dia de la ventana de previsión (para la tira de dias): pico de
   índice, código WMO representativo (la hora más cercana al mediodía, para
   no coger una hora de madrugada) y si hay algún aviso de seguridad rojo. */
export function resumenDias(ctx, modo) {
  const s = serie(ctx, modo);
  return diasDisponibles(ctx, modo).map(dia => {
    const horas = s.filter(x => util.esMismoDia(x.hora.fecha, dia));
    const max = horas.reduce((m, x) => Math.max(m, x.valor), 0);
    const aviso = horas.some(x => x.seguridad.nivel === 'rojo');
    let mejorDist = Infinity, codigo = null;
    horas.forEach(x => {
      const dist = Math.abs(x.hora.fecha.getHours() - 13);
      if (dist < mejorDist) { mejorDist = dist; codigo = x.hora.codigo; }
    });
    return { fecha: dia, max, aviso, codigo };
  });
}

/* Mejores ventanas de pesca: agrupa horas consecutivas con índice >= umbral */
export function mejoresVentanas(ctx, modo, opts) {
  const o = Object.assign({ umbral: 55, maxVentanas: 6, horas: 72 }, opts || {});
  const s = serie(ctx, modo).filter(x => x.hora.fecha.getTime() <= Date.now() + o.horas * 3600e3);
  const ventanas = [];
  let cur = null;
  for (const x of s) {
    if (x.valor >= o.umbral && x.seguridad.nivel !== 'rojo') {
      if (!cur) cur = { inicio: x.hora.fecha, fin: x.hora.fecha, max: x.valor, suma: 0, n: 0, mejorHora: x };
      cur.fin = x.hora.fecha; cur.suma += x.valor; cur.n++;
      if (x.valor > cur.max) { cur.max = x.valor; cur.mejorHora = x; }
    } else if (cur) { ventanas.push(cur); cur = null; }
  }
  if (cur) ventanas.push(cur);
  ventanas.forEach(v => { v.media = Math.round(v.suma / v.n); });
  return ventanas.sort((a, b) => b.max - a.max).slice(0, o.maxVentanas)
    .sort((a, b) => a.inicio - b.inicio);
}

/* ---- Actividad por especie (predicción de presencia/actividad sin IA) ---- */

/* 0..100: probabilidad orientativa de que la especie esté activa en esa hora/zona */
export function actividadEspecie(esp, h, ctx) {
  const mes = h.fecha.getMonth();
  const base = esp.meses[mes];
  if (base <= 0.05) return { valor: 0, motivo: 'Fuera de temporada' };

  const fSst = h.sst != null ? util.trap(h.sst, esp.sst[0], esp.sst[1], esp.sst[2], esp.sst[3]) : 0.7;
  const fOla = h.ola != null ? util.trap(h.ola, esp.oleaje[0] - 0.001, esp.oleaje[1], esp.oleaje[2], esp.oleaje[3]) : 0.7;

  const em = ctx.mareas.estadoEn(h.fecha);
  const fMarea = em ? (esp.marea[em.fase] != null ? esp.marea[em.fase] : 0.7) : 0.7;

  const mom = momentoDelDia(h.fecha, ctx.lat, ctx.lon);
  const fMom = esp.momento[mom] != null ? esp.momento[mom] : 0.7;

  const lunaInfo = lunaEn(h.fecha, ctx.lat, ctx.lon);
  const fLuna = esp.luna[lunaInfo.idx] != null ? esp.luna[lunaInfo.idx] : 0.85;

  // Media geométrica ponderada: castiga que un factor clave esté mal,
  // pero no anula por un único factor mediocre.
  const factoresEsp = [
    { v: base, p: 2.2 },   // temporada es lo más determinante
    { v: fSst, p: 1.4 },
    { v: fOla, p: 1.2 },
    { v: fMarea, p: 1.0 },
    { v: fMom, p: 1.2 },
    { v: fLuna, p: 0.5 }
  ];
  let logSum = 0, pesoTot = 0;
  for (const f of factoresEsp) {
    logSum += f.p * Math.log(Math.max(f.v, 0.02));
    pesoTot += f.p;
  }
  const valor = Math.round(100 * Math.exp(logSum / pesoTot));

  let motivo;
  if (valor >= 60) motivo = 'Condiciones muy favorables';
  else if (valor >= 40) motivo = 'Condiciones aceptables';
  else if (base < 0.4) motivo = 'Temporada floja';
  else if (fOla < 0.4) motivo = 'Estado del mar desfavorable';
  else if (fSst < 0.4) motivo = 'Temperatura del agua desfavorable';
  else if (fMom < 0.5) motivo = 'Mal momento del día';
  else motivo = 'Condiciones mediocres';

  return { valor, motivo, detalles: { temporada: base, sst: fSst, oleaje: fOla, marea: fMarea, momento: fMom, luna: fLuna } };
}

/* Ranking de especies en un instante */
export function especiesEn(fecha, ctx) {
  const h = horaMasCercana(ctx.datos.horas, fecha);
  if (!h) return [];
  return ESPECIES
    .map(e => ({ especie: e, act: actividadEspecie(e, h, ctx) }))
    .sort((a, b) => b.act.valor - a.act.valor);
}

/* Mejores momentos (próximas `horas` h) para una especie concreta */
export function mejoresHorasEspecie(esp, ctx, horas) {
  const lim = Date.now() + (horas || 72) * 3600e3;
  return ctx.datos.horas
    .filter(h => h.fecha.getTime() >= Date.now() && h.fecha.getTime() <= lim)
    .map(h => ({ hora: h, act: actividadEspecie(esp, h, ctx) }))
    .sort((a, b) => b.act.valor - a.act.valor)
    .slice(0, 5)
    .sort((a, b) => a.hora.fecha - b.hora.fecha);
}

export function horaMasCercana(horas, fecha) {
  let mejor = null, d = Infinity;
  for (const h of horas) {
    const dd = Math.abs(h.fecha - fecha);
    if (dd < d) { d = dd; mejor = h; }
  }
  return mejor;
}
