/* PescaPro - Capa de datos: MeteoGalicia Open Data (Xunta de Galicia)
   Fuente alternativa/complementaria a Open-Meteo para la costa gallega.
   Cobertura: Galicia y aguas próximas al NW de la Península Ibérica.
   Sin API key requerida.

   ATRIBUCIÓN OBLIGATORIA: toda respuesta incluye el campo `attribution`.
   Ver ATRIBUCION constante. */
window.PP = window.PP || {};

PP.apiMeteoGalicia = (function () {
  const ATRIBUCION = 'Datos de predicción meteorológica y marítima proporcionados por MeteoGalicia / Xunta de Galicia';
  const BASE = 'https://servizos.meteogalicia.gal';

  /* Cobertura aproximada del modelo WRF de MeteoGalicia */
  const BOUNDS = { latMin: 41.8, latMax: 44.2, lonMin: -10.0, lonMax: -6.0 };

  function dentroDeCobertura(lat, lon) {
    return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax &&
           lon >= BOUNDS.lonMin && lon <= BOUNDS.lonMax;
  }

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + url.split('?')[0]);
    return res.json();
  }

  /* coords en formato LON,LAT (MeteoGalicia invierte el orden respecto a Open-Meteo) */
  function coordsParam(lat, lon) {
    return lon.toFixed(4) + ',' + lat.toFixed(4);
  }

  /* Predicción meteorológica puntual (atmosférica) */
  function fetchPrevision(lat, lon) {
    return getJSON(BASE + '/mf-points/api/v1/forecast/json?coords=' + coordsParam(lat, lon) + '&lang=es');
  }

  /* Predicción marina: oleaje, SST */
  function fetchMar(lat, lon) {
    return getJSON(BASE + '/mf-points/api/v1/sea/json?coords=' + coordsParam(lat, lon) + '&lang=es');
  }

  /* Predicción de mareas: horas y niveles de pleamares/bajamares */
  function fetchMareas(lat, lon) {
    return getJSON(BASE + '/meteogalicia-tide-api/api/v1/tides/json?coords=' + coordsParam(lat, lon) + '&days=5');
  }

  /* Extrae una variable por nombre del array de variables de un día */
  function _varNombre(variables, nombre) {
    return (variables || []).find(v => v.name === nombre) || null;
  }

  /* Mapa ISO-timestamp -> valor a partir de un objeto variable de MeteoGalicia.
     Los timeInstant pueden ser "T05" (hora del día) o ISO completo. */
  function _mapaVar(variable, fechaDia) {
    if (!variable) return {};
    const m = {};
    const times = variable.timeInstant || [];
    const vals = variable.values || [];
    times.forEach((t, i) => {
      if (vals[i] === undefined || vals[i] === null) return;
      const iso = t.length <= 4
        ? (fechaDia + 'T' + t.replace('T', '').padStart(2, '0') + ':00')
        : t;
      m[iso] = vals[i];
    });
    return m;
  }

  /* Extrae la feature principal de una respuesta GeoJSON de MeteoGalicia */
  function _feature(respuesta) {
    if (!respuesta) return null;
    if (respuesta.features) return respuesta.features[0] || null;
    if (respuesta.type === 'Feature') return respuesta;
    return null;
  }

  /* Normaliza las respuestas de MeteoGalicia al formato interno de PescaPro.
     Mismo contrato de salida que PP.api.fusionar() + campos extra. */
  function normalizar(prevRaw, marRaw, mareasRaw) {
    const horas = [];

    const featPrev = _feature(prevRaw);
    const diasPrev = (featPrev && featPrev.properties && featPrev.properties.days) || [];

    const featMar = _feature(marRaw);
    const diasMar = (featMar && featMar.properties && featMar.properties.days) || [];

    /* Índice marino por ISO para join eficiente */
    const idxMar = {};
    diasMar.forEach(dia => {
      const olaM  = _mapaVar(_varNombre(dia.variables, 'significantHeight'), dia.date);
      const dirM  = _mapaVar(_varNombre(dia.variables, 'direction'), dia.date);
      const perM  = _mapaVar(_varNombre(dia.variables, 'meanPeriod'), dia.date);
      const sstM  = _mapaVar(_varNombre(dia.variables, 'seaSurfaceTemperature'), dia.date);
      Object.keys(olaM).forEach(iso => {
        idxMar[iso] = { ola: olaM[iso], olaDir: dirM[iso] || null, olaPeriodo: perM[iso] || null, sst: sstM[iso] || null };
      });
    });

    /* Serie horaria atmosférica + join marino */
    diasPrev.forEach(dia => {
      const vars = dia.variables || [];
      const mViento    = _mapaVar(_varNombre(vars, 'wind'), dia.date);
      const mVientoDir = _mapaVar(_varNombre(vars, 'windDirection'), dia.date);
      const mRacha     = _mapaVar(_varNombre(vars, 'windGust'), dia.date);
      const mTemp      = _mapaVar(_varNombre(vars, 'temperature'), dia.date);
      const mLluvia    = _mapaVar(_varNombre(vars, 'precipitation'), dia.date);
      const mNubes     = _mapaVar(_varNombre(vars, 'sky'), dia.date);
      const mPresion   = _mapaVar(_varNombre(vars, 'pressure'), dia.date);

      const isos = new Set([...Object.keys(mViento), ...Object.keys(mTemp)]);
      isos.forEach(iso => {
        const mar = idxMar[iso] || {};
        horas.push({
          iso,
          fecha:          new Date(iso),
          temp:           mTemp[iso]      !== undefined ? mTemp[iso]      : null,
          lluvia:         mLluvia[iso]    !== undefined ? mLluvia[iso]    : null,
          codigo:         null,  /* MeteoGalicia usa su propio código; no mapeado a WMO */
          nubes:          mNubes[iso]     !== undefined ? mNubes[iso]     : null,
          visibilidad:    null,
          viento:         mViento[iso]    !== undefined ? mViento[iso]    : null,
          racha:          mRacha[iso]     !== undefined ? mRacha[iso]     : null,
          vientoDir:      mVientoDir[iso] !== undefined ? mVientoDir[iso] : null,
          presion:        mPresion[iso]   !== undefined ? mPresion[iso]   : null,
          presionMsl:     null,
          ola:            mar.ola         || null,
          olaDir:         mar.olaDir      || null,
          olaPeriodo:     mar.olaPeriodo  || null,
          mardefondo:     null,
          mardefondoPeriodo: null,
          sst:            mar.sst         || null,
          corriente:      null,
          corrienteDir:   null,
          nivelMar:       null,
          fuente:         'meteogalicia'
        });
      });
    });

    horas.sort((a, b) => a.fecha - b.fecha);

    /* Pleamares / bajamares de la predicción de mareas */
    const tidalList = mareasRaw
      ? (mareasRaw.tides || mareasRaw.mareas || mareasRaw.data || [])
      : [];
    const mareasPredichas = tidalList.map(m => ({
      tipo:   (m.type === 'high'  || m.tipo === 'pleamar') ? 'pleamar' : 'bajamar',
      hora:   new Date(m.time || m.fecha || m.dateTime),
      nivel:  m.level !== undefined ? m.level : (m.nivel !== undefined ? m.nivel : null)
    })).filter(m => !isNaN(m.hora.getTime()));

    return {
      horas,
      diario:          {},
      utcOffset:       3600, /* Europe/Madrid, sin horario de verano; la app ya usa Date local */
      zonaHoraria:     'Europe/Madrid',
      unidades:        { viento: 'km/h', ola: 'm', corriente: 'm/s' },
      mareasPredichas,
      fuente:          'meteogalicia',
      attribution:     ATRIBUCION
    };
  }

  /* Carga completa para un spot: atmosférica + marina + mareas.
     Devuelve el objeto normalizado listo para consumir.
     Si la ubicación está fuera de cobertura devuelve { error, mensaje, attribution }. */
  async function cargarTodo(lat, lon) {
    if (!dentroDeCobertura(lat, lon)) {
      return {
        error:     true,
        mensaje:   'Ubicación fuera de la cobertura de MeteoGalicia (Galicia y aguas próximas). Usa la fuente Open-Meteo para esta zona.',
        lat, lon,
        attribution: ATRIBUCION
      };
    }

    const [rPrev, rMar, rMareas] = await Promise.allSettled([
      fetchPrevision(lat, lon),
      fetchMar(lat, lon),
      fetchMareas(lat, lon)
    ]);

    const advertencias = [];
    let prevRaw = null, marRaw = null, mareasRaw = null;

    if (rPrev.status === 'fulfilled') { prevRaw = rPrev.value; }
    else { advertencias.push('Previsión atmosférica no disponible: ' + rPrev.reason.message); }

    if (rMar.status === 'fulfilled') { marRaw = rMar.value; }
    else { advertencias.push('Previsión marina no disponible: ' + rMar.reason.message); }

    if (rMareas.status === 'fulfilled') { mareasRaw = rMareas.value; }
    else { advertencias.push('Predicción de mareas no disponible: ' + rMareas.reason.message); }

    if (!prevRaw) {
      return {
        error:     true,
        mensaje:   'MeteoGalicia no respondió o no tiene datos para esta ubicación. ' + advertencias.join(' | '),
        lat, lon,
        attribution: ATRIBUCION
      };
    }

    const datos = normalizar(prevRaw, marRaw, mareasRaw);
    datos.lat       = lat;
    datos.lon       = lon;
    datos.obtenido  = Date.now();
    if (advertencias.length) datos.advertencias = advertencias;

    return datos;
  }

  /* Formatea un payload JSON limpio con solo las variables relevantes para la
     pesca: viento, oleaje, temperatura del mar y mareas. Apto para API REST.
     Incluye siempre el campo `attribution` en la raíz. */
  function formatearPayload(lat, lon, datos) {
    if (!datos || datos.error) {
      return {
        ok:          false,
        error:       (datos && datos.mensaje) || 'Error desconocido',
        lat,
        lon,
        attribution: ATRIBUCION
      };
    }

    const ahora = Date.now();
    const horasRelevantes = datos.horas
      .filter(h => h.fecha.getTime() >= ahora - 3600000)
      .map(h => ({
        hora:             h.iso,
        viento_kmh:       h.viento,
        viento_dir_grados: h.vientoDir,
        racha_kmh:        h.racha,
        ola_m:            h.ola,
        ola_dir_grados:   h.olaDir,
        ola_periodo_s:    h.olaPeriodo,
        temp_agua_c:      h.sst,
        temp_aire_c:      h.temp,
        lluvia_mm:        h.lluvia
      }));

    const mareas = (datos.mareasPredichas || [])
      .filter(m => m.hora.getTime() >= ahora - 3600000)
      .map(m => ({
        tipo:    m.tipo,
        hora:    m.hora.toISOString(),
        nivel_m: m.nivel
      }));

    return {
      ok:          true,
      lat,
      lon,
      obtenido:    new Date(datos.obtenido).toISOString(),
      horas:       horasRelevantes,
      mareas,
      advertencias: datos.advertencias || [],
      attribution: ATRIBUCION
    };
  }

  return {
    fetchPrevision,
    fetchMar,
    fetchMareas,
    cargarTodo,
    formatearPayload,
    normalizar,
    dentroDeCobertura,
    ATRIBUCION
  };
})();

/* Export para tests en Node */
if (typeof module !== 'undefined' && module.exports) module.exports = PP;
