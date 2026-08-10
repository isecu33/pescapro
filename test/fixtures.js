/* Genera datos sintéticos con la misma forma que PP.api.fusionar() */
function generarDatos(opts) {
  const o = Object.assign({
    lat: 43.29, lon: -2.17,
    horasPasadas: 12, horasFuturas: 96,
    amplitudMarea: 2.0,       // ± m → rango 4 m (vivas)
    viento: 12, ola: 1.0, sst: 16, presionBase: 1015,
    tormentaEn: null           // índice de hora (desde el inicio) con tormenta
  }, opts || {});

  const base = new Date(); base.setMinutes(0, 0, 0);
  const inicio = base.getTime() - o.horasPasadas * 3600e3;
  const M2 = 12.4206; // periodo mareal semidiurno (h)
  const horas = [];
  for (let i = 0; i <= o.horasPasadas + o.horasFuturas; i++) {
    const t = inicio + i * 3600e3;
    const fase = 2 * Math.PI * (i / M2);
    const esTormenta = o.tormentaEn != null && Math.abs(i - o.tormentaEn) <= 2;
    horas.push({
      iso: new Date(t).toISOString(),
      fecha: new Date(t),
      temp: 18, lluvia: esTormenta ? 8 : 0,
      codigo: esTormenta ? 95 : 2,
      nubes: 40, visibilidad: 20000,
      viento: esTormenta ? 55 : o.viento,
      racha: esTormenta ? 75 : o.viento * 1.5,
      vientoDir: 300,
      presion: o.presionBase - (esTormenta ? 12 : 0) + Math.sin(i / 24) * 2,
      presionMsl: o.presionBase,
      ola: esTormenta ? 4.2 : o.ola,
      olaDir: 315, olaPeriodo: 9,
      mardefondo: o.ola * 0.6, mardefondoPeriodo: 11,
      sst: o.sst,
      corriente: 0.25 + 0.2 * Math.abs(Math.sin(fase)),
      corrienteDir: 90,
      nivelMar: o.amplitudMarea * Math.sin(fase)
    });
  }
  return {
    horas, diario: {}, utcOffset: 0, zonaHoraria: 'auto',
    lat: o.lat, lon: o.lon, obtenido: Date.now(),
    unidades: { viento: 'km/h', ola: 'm', corriente: 'm/s' }
  };
}

module.exports = { generarDatos };
