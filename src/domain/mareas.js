/* PescaPro - Mareas a partir de la serie horaria de nivel del mar
   (sea_level_height_msl de Open-Meteo, derivada de modelos de marea + oleada).
   Detecta pleamares/bajamares con interpolación parabólica, clasifica la
   amplitud (vivas/medias/muertas) y calcula la fase y el flujo en cada hora. */
import { util, MAREA_CLASES } from './config.js';

/* Extrae extremos (pleamar/bajamar) de la serie horaria.
   horas: [{fecha: Date, nivelMar: m}] — devuelve [{tipo:'pleamar'|'bajamar', fecha, altura}] */
export function extremos(horas) {
  const v = horas.map(h => h.nivelMar);
  const out = [];
  for (let i = 1; i < v.length - 1; i++) {
    if (v[i - 1] == null || v[i] == null || v[i + 1] == null) continue;
    const esMax = v[i] >= v[i - 1] && v[i] > v[i + 1];
    const esMin = v[i] <= v[i - 1] && v[i] < v[i + 1];
    if (!esMax && !esMin) continue;
    // Ajuste parabólico del instante y la altura exactos entre 3 puntos
    const den = v[i - 1] - 2 * v[i] + v[i + 1];
    let delta = 0;
    if (Math.abs(den) > 1e-9) delta = 0.5 * (v[i - 1] - v[i + 1]) / den;
    delta = util.clamp(delta, -1, 1);
    const t = new Date(horas[i].fecha.getTime() + delta * 3600 * 1000);
    const altura = v[i] - 0.25 * (v[i - 1] - v[i + 1]) * delta;
    out.push({ tipo: esMax ? 'pleamar' : 'bajamar', fecha: t, altura: altura });
  }
  // Elimina duplicados demasiado próximos (< 3 h) quedándose con el más extremo
  const limpio = [];
  for (const e of out) {
    const prev = limpio[limpio.length - 1];
    if (prev && e.tipo === prev.tipo && (e.fecha - prev.fecha) < 3 * 3600e3) {
      const mejor = e.tipo === 'pleamar'
        ? (e.altura > prev.altura ? e : prev)
        : (e.altura < prev.altura ? e : prev);
      limpio[limpio.length - 1] = mejor;
    } else limpio.push(e);
  }
  return limpio;
}

/* Amplitud del ciclo actual (m) y clasificación vivas/medias/muertas */
export function amplitud(exts, ahora) {
  // Busca el par pleamar/bajamar que rodea o precede a "ahora"
  let rango = null;
  for (let i = 1; i < exts.length; i++) {
    if (exts[i].fecha >= ahora || i === exts.length - 1) {
      rango = Math.abs(exts[i].altura - exts[i - 1].altura);
      break;
    }
  }
  if (rango == null && exts.length >= 2) rango = Math.abs(exts[1].altura - exts[0].altura);
  if (rango == null) return null;
  const clase = MAREA_CLASES.find(c => rango <= c.max) || MAREA_CLASES[MAREA_CLASES.length - 1];
  // Coeficiente orientativo estilo 20-120 mapeando el rango típico del Cantábrico (1.0–4.6 m)
  const coef = Math.round(util.clamp(20 + (rango - 1.0) / (4.6 - 1.0) * 100, 20, 120));
  return { rango, clase: clase.clase, etiqueta: clase.etiqueta, color: clase.color, coef };
}

/* Estado de la marea en un instante: fase, próximo extremo, % de ciclo y flujo.
   El "flujo" (velocidad de subida/bajada, m/h) manda: máximo a media marea
   = máxima corriente = pico de actividad ("regla de los doceavos"). */
export function estadoEn(fecha, horas, exts) {
  // Extremo anterior y siguiente
  let prev = null, next = null;
  for (const e of exts) {
    if (e.fecha <= fecha) prev = e;
    else { next = e; break; }
  }
  if (!prev || !next) return null;
  const frac = (fecha - prev.fecha) / (next.fecha - prev.fecha); // 0..1 del semiciclo
  const subiendo = next.tipo === 'pleamar';
  // Fase discreta para las reglas de especies
  let fase;
  if (frac < 0.15) fase = prev.tipo === 'pleamar' ? 'pleamar' : 'bajamar';
  else if (frac > 0.85) fase = next.tipo === 'pleamar' ? 'pleamar' : 'bajamar';
  else fase = subiendo ? 'subiendo' : 'bajando';
  // Flujo sinusoidal normalizado 0..1 (máximo a mitad del semiciclo)
  const flujo = Math.sin(Math.PI * util.clamp(frac, 0, 1));
  // Nivel interpolado por coseno (curva de marea real ~ sinusoide)
  const nivel = prev.altura + (next.altura - prev.altura) * (1 - Math.cos(Math.PI * frac)) / 2;
  return { fase, subiendo, frac, flujo, nivel, anterior: prev, siguiente: next };
}

/* Prepara todo el bloque de mareas de una tanda de datos */
export function analizar(datos) {
  const exts = extremos(datos.horas);
  const ahora = new Date();
  return {
    extremos: exts,
    ahora: estadoEn(ahora, datos.horas, exts),
    amplitud: amplitud(exts, ahora),
    proximos: exts.filter(e => e.fecha > ahora).slice(0, 4),
    estadoEn: (f) => estadoEn(f, datos.horas, exts)
  };
}
