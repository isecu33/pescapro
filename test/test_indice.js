const { PP, check, resumen } = require('./harness');
const { generarDatos } = require('./fixtures');

console.log('TEST ÍNDICE');

// --- fusionar(): alineado de series clima+marino ---
const t0 = new Date(); t0.setMinutes(0, 0, 0);
const times = [0, 1, 2].map(i => new Date(t0.getTime() + i * 3600e3).toISOString().slice(0, 16));
const clima = {
  hourly: { time: times, temperature_2m: [15, 16, 17], wind_speed_10m: [10, 12, 14], wind_gusts_10m: [15, 18, 20], wind_direction_10m: [270, 280, 290], surface_pressure: [1010, 1011, 1012], pressure_msl: [1015, 1016, 1017], precipitation: [0, 0, 1], weather_code: [1, 2, 61], cloud_cover: [10, 50, 90], visibility: [20000, 15000, 8000] },
  daily: {}, utc_offset_seconds: 7200, timezone: 'Europe/Madrid'
};
const marino = {
  hourly: { time: times, wave_height: [0.8, 1.0, 1.2], wave_direction: [310, 315, 320], wave_period: [8, 9, 10], swell_wave_height: [0.5, 0.6, 0.7], swell_wave_period: [10, 11, 12], sea_surface_temperature: [16.2, 16.3, 16.4], ocean_current_velocity: [0.2, 0.3, 0.4], ocean_current_direction: [90, 95, 100], sea_level_height_msl: [0.5, 1.2, 1.8] }
};
const fus = PP.api.fusionar(clima, marino);
check(fus.horas.length === 3, 'fusionar: 3 horas');
check(fus.horas[1].ola === 1.0 && fus.horas[1].viento === 12 && fus.horas[1].nivelMar === 1.2, 'fusionar: clima y marino alineados por hora');
check(fus.horas[2].sst === 16.4 && fus.horas[2].corriente === 0.4, 'fusionar: SST y corriente presentes');

// --- índice con datos buenos ---
const datos = generarDatos({ viento: 10, ola: 1.0, sst: 15 });
const ctx = PP.indice.preparar(datos);

let enRango = true, factoresOK = true;
for (const modo of Object.keys(PP.MODOS)) {
  for (const h of datos.horas) {
    const r = PP.indice.indiceHora(h, modo, ctx);
    if (!(r.valor >= 0 && r.valor <= 100)) enRango = false;
    for (const k in r.factores) {
      if (k.startsWith('_')) continue;
      const v = r.factores[k];
      if (typeof v === 'number' && (v < 0 || v > 1.0001)) factoresOK = false;
    }
  }
}
check(enRango, 'índice siempre entre 0 y 100 (todas las horas y modalidades)');
check(factoresOK, 'todos los factores entre 0 y 1');

// --- tormenta: seguridad roja y capado ---
const datosT = generarDatos({ tormentaEn: 30 });
const ctxT = PP.indice.preparar(datosT);
const hTormenta = datosT.horas[30];
for (const modo of Object.keys(PP.MODOS)) {
  const r = PP.indice.indiceHora(hTormenta, modo, ctxT);
  check(r.seguridad.nivel === 'rojo', modo + ': tormenta detectada como nivel rojo');
  check(r.valor <= PP.SEGURIDAD.capRojo, modo + ': índice capado a ' + PP.SEGURIDAD.capRojo + ' con temporal (=' + r.valor + ')');
}

// --- eging: mar en calma puntúa más que mar gruesa ---
const hCalma = Object.assign({}, datos.horas[40], { ola: 0.3, viento: 6 });
const hGruesa = Object.assign({}, datos.horas[40], { ola: 2.4, viento: 6 });
const fCalma = PP.indice.factores(hCalma, 'eging', ctx);
const fGruesa = PP.indice.factores(hGruesa, 'eging', ctx);
check(fCalma.oleaje > fGruesa.oleaje, 'eging: factor oleaje mejor en calma (' + fCalma.oleaje.toFixed(2) + ' > ' + fGruesa.oleaje.toFixed(2) + ')');

// --- spinning: mar movido moderado mejor que plato ---
const fMovido = PP.indice.factores(Object.assign({}, datos.horas[40], { ola: 1.2 }), 'spinning', ctx);
const fPlato = PP.indice.factores(Object.assign({}, datos.horas[40], { ola: 0.05 }), 'spinning', ctx);
check(fMovido.oleaje > fPlato.oleaje, 'spinning: mar movido moderado > mar plato');

// --- presión bajando suave puntúa mejor que subiendo fuerte ---
const hBaja = Object.assign({}, datos.horas[40], { presionTend: -2 });
const hSube = Object.assign({}, datos.horas[40], { presionTend: 5 });
check(PP.indice.factores(hBaja, 'spinning', ctx).presion > PP.indice.factores(hSube, 'spinning', ctx).presion,
  'presión: bajada suave > subida fuerte');

// --- serie y ventanas ---
const s = PP.indice.serie(ctx, 'spinning');
check(s.length > 80, 'serie de índice cubre las horas futuras (' + s.length + ')');
const vents = PP.indice.mejoresVentanas(ctx, 'spinning');
check(Array.isArray(vents) && vents.length <= 6, 'mejoresVentanas devuelve ≤ 6 ventanas (' + vents.length + ')');
if (vents.length >= 2) {
  let ordenadas = true;
  for (let i = 1; i < vents.length; i++) if (vents[i].inicio < vents[i - 1].inicio) ordenadas = false;
  check(ordenadas, 'ventanas ordenadas cronológicamente');
}
const ventsT = PP.indice.mejoresVentanas(ctxT, 'spinning');
const tormentaFuera = ventsT.every(v => Math.abs(v.inicio - datosT.horas[30].fecha) > 0 || v.max <= PP.SEGURIDAD.capRojo);
check(tormentaFuera, 'las horas de temporal no aparecen como buenas ventanas');

// --- solunar produce periodos válidos ---
const per = ctx.periodosDe(new Date());
check(per.length >= 2 && per.length <= 5, 'periodos solunares del día: ' + per.length);
check(per.every(p => p.fin > p.inicio), 'periodos con fin > inicio');
const fSol = PP.solunar.factorSolunar(per[0].centro, per);
check(fSol === 1.0 || fSol === 0.75, 'factor solunar máximo dentro de un periodo');

resumen('índice');
