/* Test unitario para PP.apiMeteoGalicia (sin red).
   Corre con: node test/test_api_meteogalicia.js
   Usa el harness propio del proyecto (sin framework externo). */
const h = require('./harness');
require('../www/js/api_meteogalicia');

const mg = PP.apiMeteoGalicia;

/* --- dentroDeCobertura --- */
h.check('dentro: Santiago de Compostela',    mg.dentroDeCobertura(42.87, -8.54)  === true);
h.check('fuera: Zarautz (Cantábrico este)',  mg.dentroDeCobertura(43.29, -2.17)  === false);
h.check('fuera: Lisboa',                     mg.dentroDeCobertura(38.71, -9.14)  === false);
h.check('borde norte: costa de A Mariña',   mg.dentroDeCobertura(43.55, -7.50)  === true);

/* --- ATRIBUCION siempre presente --- */
h.check('ATRIBUCION no vacía', typeof mg.ATRIBUCION === 'string' && mg.ATRIBUCION.length > 10);
h.check('ATRIBUCION menciona MeteoGalicia',  mg.ATRIBUCION.includes('MeteoGalicia'));
h.check('ATRIBUCION menciona Xunta de Galicia', mg.ATRIBUCION.includes('Xunta de Galicia'));

/* --- formatearPayload con error --- */
const payloadErr = mg.formatearPayload(43.29, -2.17, { error: true, mensaje: 'Fuera de cobertura' });
h.check('payload error: ok=false',           payloadErr.ok === false);
h.check('payload error: attribution presente', typeof payloadErr.attribution === 'string');
h.check('payload error: campo error presente', typeof payloadErr.error === 'string');

/* --- normalizar con datos sintéticos --- */
const prevSintetica = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-8.54, 42.87, 260] },
    properties: {
      days: [{
        date: '2026-09-14',
        variables: [
          { name: 'wind',          timeInstant: ['T06', 'T07', 'T08'], values: [12, 15, 18] },
          { name: 'windDirection', timeInstant: ['T06', 'T07', 'T08'], values: [270, 265, 260] },
          { name: 'windGust',      timeInstant: ['T06', 'T07', 'T08'], values: [20, 22, 25] },
          { name: 'temperature',   timeInstant: ['T06', 'T07', 'T08'], values: [18.5, 18.0, 17.5] },
          { name: 'precipitation', timeInstant: ['T06', 'T07', 'T08'], values: [0, 0.2, 0.5] }
        ]
      }]
    }
  }]
};

const marSintetica = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-8.54, 42.87, 0] },
    properties: {
      days: [{
        date: '2026-09-14',
        variables: [
          { name: 'significantHeight',      timeInstant: ['T06', 'T07', 'T08'], values: [1.2, 1.3, 1.4] },
          { name: 'direction',              timeInstant: ['T06', 'T07', 'T08'], values: [310, 315, 320] },
          { name: 'meanPeriod',             timeInstant: ['T06', 'T07', 'T08'], values: [8.0, 8.2, 8.5] },
          { name: 'seaSurfaceTemperature',  timeInstant: ['T06', 'T07', 'T08'], values: [17.2, 17.2, 17.1] }
        ]
      }]
    }
  }]
};

const mareasRaw = {
  tides: [
    { type: 'high', time: '2026-09-14T03:15:00', level: 3.8 },
    { type: 'low',  time: '2026-09-14T09:30:00', level: 0.4 },
    { type: 'high', time: '2026-09-14T15:45:00', level: 3.6 }
  ]
};

const resultado = mg.normalizar(prevSintetica, marSintetica, mareasRaw);

h.check('normalizar: attribution presente',          resultado.attribution === mg.ATRIBUCION);
h.check('normalizar: fuente=meteogalicia',           resultado.fuente === 'meteogalicia');
h.check('normalizar: 3 horas generadas',             resultado.horas.length === 3);
h.check('normalizar: hora[0] viento=12',             resultado.horas[0].viento === 12);
h.check('normalizar: hora[0] vientoDir=270',         resultado.horas[0].vientoDir === 270);
h.check('normalizar: hora[0] racha=20',              resultado.horas[0].racha === 20);
h.check('normalizar: hora[0] ola=1.2',               resultado.horas[0].ola === 1.2);
h.check('normalizar: hora[0] olaDir=310',            resultado.horas[0].olaDir === 310);
h.check('normalizar: hora[0] olaPeriodo=8.0',        resultado.horas[0].olaPeriodo === 8.0);
h.check('normalizar: hora[0] sst=17.2',              resultado.horas[0].sst === 17.2);
h.check('normalizar: hora[0] temp=18.5',             resultado.horas[0].temp === 18.5);
h.check('normalizar: hora[0] fuente=meteogalicia',   resultado.horas[0].fuente === 'meteogalicia');
h.check('normalizar: 3 mareas predichas',            resultado.mareasPredichas.length === 3);
h.check('normalizar: marea[0] tipo=pleamar',         resultado.mareasPredichas[0].tipo === 'pleamar');
h.check('normalizar: marea[0] nivel=3.8',            resultado.mareasPredichas[0].nivel === 3.8);
h.check('normalizar: marea[1] tipo=bajamar',         resultado.mareasPredichas[1].tipo === 'bajamar');
h.check('normalizar: horas ordenadas cronológicamente', resultado.horas[0].fecha <= resultado.horas[1].fecha);

/* --- formatearPayload con datos buenos --- */
const payload = mg.formatearPayload(42.87, -8.54, { ...resultado, obtenido: Date.now(), lat: 42.87, lon: -8.54 });
h.check('payload ok: ok=true',               payload.ok === true);
h.check('payload ok: attribution presente',  payload.attribution === mg.ATRIBUCION);
h.check('payload ok: campo horas existe',    Array.isArray(payload.horas));
h.check('payload ok: campo mareas existe',   Array.isArray(payload.mareas));
h.check('payload ok: lat y lon presentes',   payload.lat === 42.87 && payload.lon === -8.54);
if (payload.horas.length > 0) {
  const h0 = payload.horas[0];
  h.check('payload horas: tiene viento_kmh',       'viento_kmh' in h0);
  h.check('payload horas: tiene viento_dir_grados', 'viento_dir_grados' in h0);
  h.check('payload horas: tiene ola_m',            'ola_m' in h0);
  h.check('payload horas: tiene temp_agua_c',      'temp_agua_c' in h0);
}

/* --- cargarTodo con ubicación fuera de cobertura (sin red) --- */
mg.cargarTodo(43.29, -2.17).then(res => {
  h.check('cargarTodo fuera: error=true',              res.error === true);
  h.check('cargarTodo fuera: attribution siempre',     res.attribution === mg.ATRIBUCION);
  h.check('cargarTodo fuera: mensaje descriptivo',     typeof res.mensaje === 'string' && res.mensaje.length > 5);
  h.resumen();
});
