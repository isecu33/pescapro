/* PescaPro - Configuración global (sin IA: todo son reglas y pesos) */
window.PP = window.PP || {};

PP.CONFIG = {
  VERSION: '1.0.0',
  // Ubicación por defecto: costa de Gipuzkoa (Cantábrico)
  DEFAULT_SPOT: { nombre: 'Zarautz', lat: 43.290, lon: -2.170 },
  // Refresco automático de datos (ms)
  REFRESH_MS: 30 * 60 * 1000,
  // Si los datos en caché son más viejos que esto al abrir, se refrescan
  STALE_MS: 15 * 60 * 1000,
  DIAS_PREVISION: 5,
  DIAS_PASADOS: 1, // para calcular tendencia de presión
  // Rejilla de corrientes en el mapa (NxN puntos, separación en grados)
  GRID_N: 5,
  GRID_STEP: 0.06,
  API: {
    clima: 'https://api.open-meteo.com/v1/forecast',
    marino: 'https://marine-api.open-meteo.com/v1/marine',
    geo: 'https://geocoding-api.open-meteo.com/v1/search'
  },
  HOURLY_CLIMA: [
    'temperature_2m', 'precipitation', 'weather_code', 'cloud_cover',
    'visibility', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
    'surface_pressure', 'pressure_msl'
  ],
  HOURLY_MARINO: [
    'wave_height', 'wave_direction', 'wave_period',
    'swell_wave_height', 'swell_wave_period',
    'sea_surface_temperature',
    'ocean_current_velocity', 'ocean_current_direction',
    'sea_level_height_msl'
  ],
  DAILY_CLIMA: ['sunrise', 'sunset', 'uv_index_max', 'weather_code']
};

/* Modalidades de pesca. Los pesos de cada factor suman 1.
   Cada factor se puntúa 0..1 en indice.js y el índice final es 0..100. */
PP.MODOS = {
  spinning: {
    id: 'spinning', nombre: 'Spinning', icono: 'cana',
    desc: 'Costa con señuelos',
    pesos: { viento: 0.15, oleaje: 0.20, marea: 0.15, solunar: 0.10, momento: 0.15, presion: 0.10, cielo: 0.05, corriente: 0.05, sst: 0.05 },
    // trapecio [min, opt1, opt2, max]
    vientoOK: [0, 4, 18, 32],      // km/h
    oleajeOK: [0.2, 0.6, 1.8, 2.8], // m — mar movido moderado activa a los depredadores
    corrienteOK: [0.02, 0.1, 0.45, 0.9], // m/s — algo de corriente mueve el alimento
    noche: 0.55 // factor del momento nocturno (0..1); crepúsculos siempre 1
  },
  eging: {
    id: 'eging', nombre: 'Eging', icono: 'calamar',
    desc: 'Calamar y sepia',
    pesos: { viento: 0.14, oleaje: 0.24, marea: 0.10, solunar: 0.08, momento: 0.18, presion: 0.06, cielo: 0.05, corriente: 0.07, sst: 0.08 },
    vientoOK: [0, 0, 12, 22],
    oleajeOK: [0, 0, 0.6, 1.1],    // agua en calma y clara
    corrienteOK: [0, 0, 0.25, 0.5],
    noche: 1.0 // el eging es sobre todo nocturno/crepuscular
  },
  surfcasting: {
    id: 'surfcasting', nombre: 'Surfcasting', icono: 'surf',
    desc: 'Fondo desde playa',
    pesos: { viento: 0.10, oleaje: 0.15, marea: 0.25, solunar: 0.10, momento: 0.13, presion: 0.10, cielo: 0.04, corriente: 0.03, sst: 0.10 },
    vientoOK: [0, 5, 24, 40],
    oleajeOK: [0.3, 0.8, 2.0, 3.0], // mar que remueve el fondo saca de comer
    corrienteOK: [0.02, 0.1, 0.5, 1.0],
    noche: 0.95 // muy productivo de noche
  }
};

/* Umbrales de seguridad (avisos y capado del índice) */
PP.SEGURIDAD = {
  rojo:    { viento: 45, racha: 60, ola: 3.0 },  // no salir
  amarillo:{ viento: 30, racha: 45, ola: 2.0 },  // precaución
  capRojo: 15,   // índice máximo si hay condiciones rojas
  codigosTormenta: [95, 96, 99],
  codigosLluviaFuerte: [65, 67, 82]
};

/* Clasificación de la amplitud de marea (Cantábrico, rango medio ~2.8 m) */
PP.MAREA_CLASES = [
  { max: 2.2, clase: 'muertas', etiqueta: 'Mareas muertas', color: '#888888' },
  { max: 3.4, clase: 'medias', etiqueta: 'Mareas medias', color: '#cc6600' },
  { max: 99,  clase: 'vivas',  etiqueta: 'Mareas vivas',  color: '#ff7200' }
];

/* Códigos meteo de Open-Meteo (WMO) → texto, emoji de contenido (usado en
   sitios de texto corrido) e icono de trazo (usado en la rejilla de
   condiciones, ver iconos.js) */
PP.WMO = {
  0:['Despejado','☀️','sol'],1:['Mayormente despejado','🌤️','solNube'],2:['Parcialmente nuboso','⛅','solNube'],3:['Nuboso','☁️','nuboso'],
  45:['Niebla','🌫️','niebla'],48:['Niebla con cencellada','🌫️','niebla'],
  51:['Llovizna débil','🌦️','llovizna'],53:['Llovizna','🌦️','llovizna'],55:['Llovizna intensa','🌧️','lluvia'],
  61:['Lluvia débil','🌦️','llovizna'],63:['Lluvia','🌧️','lluvia'],65:['Lluvia fuerte','🌧️','lluviaFuerte'],
  66:['Lluvia helada','🌧️','lluvia'],67:['Lluvia helada fuerte','🌧️','lluviaFuerte'],
  71:['Nieve débil','🌨️','nieve'],73:['Nieve','🌨️','nieve'],75:['Nieve fuerte','❄️','nieve'],77:['Cinarra','🌨️','nieve'],
  80:['Chubascos débiles','🌦️','llovizna'],81:['Chubascos','🌧️','lluvia'],82:['Chubascos fuertes','⛈️','lluviaFuerte'],
  85:['Chubascos de nieve','🌨️','nieve'],86:['Chubascos de nieve fuertes','❄️','nieve'],
  95:['Tormenta','⛈️','tormenta'],96:['Tormenta con granizo','⛈️','tormenta'],99:['Tormenta fuerte con granizo','⛈️','tormenta']
};

/* Utilidades compartidas */
PP.util = {
  // Trapecio: 0 fuera de [a,d], 1 en [b,c], rampas lineales. Puntúa "lo óptimo".
  trap(x, a, b, c, d) {
    if (x == null || isNaN(x)) return 0.5; // sin dato: neutro
    if (x <= a || x >= d) return 0;
    if (x >= b && x <= c) return 1;
    return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
  },
  clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  media(arr) { const v = arr.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; },
  gradosACardinal(g) {
    if (g == null) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    return dirs[Math.round(g / 22.5) % 16];
  },
  fmtHora(d) { return d.toTimeString().slice(0, 5); },
  fmtDia(d) {
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return dias[d.getDay()] + ' ' + d.getDate();
  },
  fmtFecha(d) { return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); },
  esMismoDia(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); },
  colorIndice(v) {
    if (v >= 70) return '#ff9500';
    if (v >= 50) return '#ff7200';
    if (v >= 35) return '#e05500';
    if (v >= 20) return '#c44000';
    return '#e03131';
  },
  etiquetaIndice(v) {
    if (v >= 70) return 'Excelente';
    if (v >= 50) return 'Bueno';
    if (v >= 35) return 'Regular';
    if (v >= 20) return 'Flojo';
    return 'Malo';
  }
};
