/* PescaPro - Sol, luna y teoría solunar (sin IA ni APIs: astronomía calculada
   en local con SunCalc). Periodos mayores = tránsito lunar superior/inferior
   (±1.5 h); menores = salida/puesta de luna (±0.75 h). */
import { SunCalc } from './vendor/suncalc.js';

export function sol(fecha, lat, lon) {
  const t = SunCalc.getTimes(fecha, lat, lon);
  return {
    amanecer: t.sunrise, ocaso: t.sunset,
    albaCivil: t.dawn, crepusculoCivil: t.dusk
  };
}

export function luna(fecha, lat, lon) {
  const il = SunCalc.getMoonIllumination(fecha);
  const t = SunCalc.getMoonTimes(fecha, lat, lon);
  // fase 0=nueva, 0.25=creciente, 0.5=llena, 0.75=menguante
  const f = il.phase;
  let nombre, icono, idx;
  if (f < 0.0625 || f >= 0.9375) { nombre = 'Luna nueva'; icono = '🌑'; idx = 0; }
  else if (f < 0.1875) { nombre = 'Creciente'; icono = '🌒'; idx = 1; }
  else if (f < 0.3125) { nombre = 'Cuarto creciente'; icono = '🌓'; idx = 1; }
  else if (f < 0.4375) { nombre = 'Gibosa creciente'; icono = '🌔'; idx = 1; }
  else if (f < 0.5625) { nombre = 'Luna llena'; icono = '🌕'; idx = 2; }
  else if (f < 0.6875) { nombre = 'Gibosa menguante'; icono = '🌖'; idx = 3; }
  else if (f < 0.8125) { nombre = 'Cuarto menguante'; icono = '🌗'; idx = 3; }
  else { nombre = 'Menguante'; icono = '🌘'; idx = 3; }
  return {
    fase: f, nombre, icono, idx,
    iluminacion: Math.round(il.fraction * 100),
    salida: t.rise || null, puesta: t.set || null,
    siempreArriba: !!t.alwaysUp, siempreAbajo: !!t.alwaysDown
  };
}

/* Tránsitos lunares (culminación superior e inferior) buscando extremos de
   altitud en pasos de 10 min a lo largo del día local. */
export function transitosLuna(fecha, lat, lon) {
  const ini = new Date(fecha); ini.setHours(0, 0, 0, 0);
  const paso = 10 * 60 * 1000;
  let alturas = [];
  for (let t = ini.getTime(); t <= ini.getTime() + 24 * 3600e3; t += paso) {
    alturas.push({ t, alt: SunCalc.getMoonPosition(new Date(t), lat, lon).altitude });
  }
  const trans = [];
  for (let i = 1; i < alturas.length - 1; i++) {
    const a = alturas[i - 1].alt, b = alturas[i].alt, c = alturas[i + 1].alt;
    if (b > a && b >= c) trans.push({ tipo: 'superior', fecha: new Date(alturas[i].t) });
    if (b < a && b <= c) trans.push({ tipo: 'inferior', fecha: new Date(alturas[i].t) });
  }
  return trans;
}

/* Periodos solunares del día: mayores (tránsitos, 3 h) y menores (orto/ocaso lunar, 1.5 h) */
export function periodos(fecha, lat, lon) {
  const trans = transitosLuna(fecha, lat, lon);
  const lt = SunCalc.getMoonTimes(fecha, lat, lon);
  const out = [];
  trans.forEach(tr => out.push({
    tipo: 'mayor',
    inicio: new Date(tr.fecha.getTime() - 90 * 60000),
    fin: new Date(tr.fecha.getTime() + 90 * 60000),
    centro: tr.fecha
  }));
  [lt.rise, lt.set].forEach(t => {
    if (t) out.push({
      tipo: 'menor',
      inicio: new Date(t.getTime() - 45 * 60000),
      fin: new Date(t.getTime() + 45 * 60000),
      centro: t
    });
  });
  return out.sort((a, b) => a.inicio - b.inicio);
}

/* Datos de altitud sol + luna para 24h (cada 20 min) — alimenta pp-curva-solunar */
export function curvaSolunar(fecha, lat, lon) {
  const ini = new Date(fecha); ini.setHours(0, 0, 0, 0);
  const PASO = 20 * 60 * 1000;
  const xData = [], solData = [], lunaData = [];
  for (let i = 0; i <= 72; i++) {
    const t = new Date(ini.getTime() + i * PASO);
    xData.push(t.getTime() / 1000);
    solData.push(SunCalc.getPosition(t, lat, lon).altitude * 180 / Math.PI);
    lunaData.push(SunCalc.getMoonPosition(t, lat, lon).altitude * 180 / Math.PI);
  }
  return { xData, solData, lunaData };
}

/* Factor solunar 0..1 en un instante (1 = periodo mayor) */
export function factorSolunar(fecha, periodosDia) {
  for (const p of periodosDia) {
    if (fecha >= p.inicio && fecha <= p.fin) return p.tipo === 'mayor' ? 1.0 : 0.75;
  }
  return 0.3;
}

/* Momento del día: 'amanecer' | 'dia' | 'atardecer' | 'noche' (con ventanas generosas) */
export function momentoDelDia(fecha, lat, lon) {
  const t = SunCalc.getTimes(fecha, lat, lon);
  const ms = fecha.getTime();
  if (t.sunrise && Math.abs(ms - t.sunrise.getTime()) <= 75 * 60000) return 'amanecer';
  if (t.sunset && Math.abs(ms - t.sunset.getTime()) <= 75 * 60000) return 'atardecer';
  if (t.sunrise && t.sunset && ms > t.sunrise.getTime() && ms < t.sunset.getTime()) return 'dia';
  return 'noche';
}
