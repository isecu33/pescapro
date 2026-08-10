/* PescaPro - Capa de datos: Open-Meteo (gratuito, sin API key) + caché offline.
   - Clima:  api.open-meteo.com/v1/forecast
   - Marino: marine-api.open-meteo.com/v1/marine  (olas, SST, corrientes, nivel del mar)
   - Geo:    geocoding-api.open-meteo.com/v1/search
   Los datos se refrescan periódicamente (PP.CONFIG.REFRESH_MS) y se cachean
   en localStorage para poder consultar la app sin cobertura en el pesquero. */
window.PP = window.PP || {};

PP.api = (function () {
  const C = () => PP.CONFIG;

  function qs(params) {
    return Object.entries(params)
      .map(([k, v]) => k + '=' + encodeURIComponent(v))
      .join('&');
  }

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + url.split('?')[0]);
    const j = await res.json();
    if (j && j.error) throw new Error(j.reason || 'Error del API');
    return j;
  }

  /* Previsión meteorológica */
  function fetchClima(lat, lon) {
    const url = C().API.clima + '?' + qs({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      hourly: C().HOURLY_CLIMA.join(','),
      daily: C().DAILY_CLIMA.join(','),
      timezone: 'auto',
      past_days: C().DIAS_PASADOS,
      forecast_days: C().DIAS_PREVISION
    });
    return getJSON(url);
  }

  /* Previsión marina (cell_selection=sea elige la celda marina más cercana,
     clave para puntos pegados a la costa) */
  function fetchMarino(lat, lon) {
    const url = C().API.marino + '?' + qs({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      hourly: C().HOURLY_MARINO.join(','),
      timezone: 'auto',
      past_days: C().DIAS_PASADOS,
      forecast_days: C().DIAS_PREVISION,
      cell_selection: 'sea'
    });
    return getJSON(url);
  }

  /* Corrientes en una rejilla de puntos alrededor del spot (para el mapa).
     Open-Meteo acepta múltiples coordenadas separadas por coma en una llamada.
     Sin cell_selection: los puntos en tierra devuelven null y así no se pintan
     flechas sobre tierra (más honesto que desplazarlas a la celda marina). */
  function fetchCorrientesGrid(lat, lon) {
    const n = C().GRID_N, paso = C().GRID_STEP, medio = (n - 1) / 2;
    const lats = [], lons = [], puntos = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const la = lat + (medio - i) * paso;
        const lo = lon + (j - medio) * paso;
        lats.push(la.toFixed(3)); lons.push(lo.toFixed(3));
        puntos.push({ lat: la, lon: lo });
      }
    }
    const url = C().API.marino + '?' + qs({
      latitude: lats.join(','),
      longitude: lons.join(','),
      hourly: 'ocean_current_velocity,ocean_current_direction,wave_height',
      timezone: 'auto',
      forecast_days: 3
    });
    return getJSON(url).then(j => {
      const arr = Array.isArray(j) ? j : [j];
      return arr.map((r, k) => ({
        lat: puntos[k] ? puntos[k].lat : r.latitude,
        lon: puntos[k] ? puntos[k].lon : r.longitude,
        time: r.hourly ? r.hourly.time : [],
        vel: r.hourly ? r.hourly.ocean_current_velocity : [],
        dir: r.hourly ? r.hourly.ocean_current_direction : [],
        ola: r.hourly ? r.hourly.wave_height : []
      }));
    });
  }

  /* Buscador de lugares */
  function buscarLugar(nombre) {
    const url = C().API.geo + '?' + qs({ name: nombre, count: 6, language: 'es', format: 'json' });
    return getJSON(url).then(j => (j.results || []).map(r => ({
      nombre: r.name,
      detalle: [r.admin2, r.admin1, r.country].filter(Boolean).join(', '),
      lat: r.latitude, lon: r.longitude
    })));
  }

  /* Fusiona clima + marino en una serie horaria única indexada por Date */
  function fusionar(clima, marino) {
    const h = clima.hourly, m = (marino && marino.hourly) || {};
    // Mapa hora ISO -> índice marino (las series pueden no estar alineadas)
    const idxM = {};
    (m.time || []).forEach((t, i) => { idxM[t] = i; });
    const horas = (h.time || []).map((t, i) => {
      const im = idxM[t];
      const g = (arr) => (im != null && arr) ? arr[im] : null;
      return {
        iso: t,
        fecha: new Date(t),
        temp: h.temperature_2m ? h.temperature_2m[i] : null,
        lluvia: h.precipitation ? h.precipitation[i] : null,
        codigo: h.weather_code ? h.weather_code[i] : null,
        nubes: h.cloud_cover ? h.cloud_cover[i] : null,
        visibilidad: h.visibility ? h.visibility[i] : null,
        viento: h.wind_speed_10m ? h.wind_speed_10m[i] : null,
        racha: h.wind_gusts_10m ? h.wind_gusts_10m[i] : null,
        vientoDir: h.wind_direction_10m ? h.wind_direction_10m[i] : null,
        presion: h.surface_pressure ? h.surface_pressure[i] : null,
        presionMsl: h.pressure_msl ? h.pressure_msl[i] : null,
        ola: g(m.wave_height),
        olaDir: g(m.wave_direction),
        olaPeriodo: g(m.wave_period),
        mardefondo: g(m.swell_wave_height),
        mardefondoPeriodo: g(m.swell_wave_period),
        sst: g(m.sea_surface_temperature),
        corriente: g(m.ocean_current_velocity),
        corrienteDir: g(m.ocean_current_direction),
        nivelMar: g(m.sea_level_height_msl)
      };
    });
    return {
      horas,
      diario: clima.daily || {},
      utcOffset: clima.utc_offset_seconds || 0,
      zonaHoraria: clima.timezone || 'auto',
      unidades: { viento: 'km/h', ola: 'm', corriente: 'm/s' }
    };
  }

  /* Carga completa para un spot, con caché */
  async function cargarTodo(lat, lon) {
    const [clima, marino] = await Promise.all([fetchClima(lat, lon), fetchMarino(lat, lon)]);
    const datos = fusionar(clima, marino);
    datos.lat = lat; datos.lon = lon;
    datos.obtenido = Date.now();
    try {
      localStorage.setItem('pp_datos', JSON.stringify({
        lat, lon, obtenido: datos.obtenido, clima, marino
      }));
    } catch (e) { /* caché llena: seguimos sin cachear */ }
    return datos;
  }

  /* Recupera la caché (para arrancar offline). Devuelve null si no hay o no coincide el spot. */
  function desdeCache(lat, lon) {
    try {
      const raw = localStorage.getItem('pp_datos');
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (Math.abs(c.lat - lat) > 0.02 || Math.abs(c.lon - lon) > 0.02) return null;
      const datos = fusionar(c.clima, c.marino);
      datos.lat = c.lat; datos.lon = c.lon; datos.obtenido = c.obtenido;
      return datos;
    } catch (e) { return null; }
  }

  return { fetchClima, fetchMarino, fetchCorrientesGrid, buscarLugar, fusionar, cargarTodo, desdeCache };
})();

/* Export para tests en Node */
if (typeof module !== 'undefined' && module.exports) module.exports = PP;
