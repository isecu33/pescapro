/* Test de integración con el API real de Open-Meteo (requiere internet).
   Verifica que los nombres de variables que usa la app existen y devuelven datos. */
const { PP, check, resumen } = require('./harness');

(async () => {
  console.log('TEST API EN VIVO (Zarautz 43.29, -2.17)');
  try {
    const datos = await PP.api.cargarTodo(43.29, -2.17);
    check(datos.horas.length > 24, 'serie horaria recibida (' + datos.horas.length + ' horas)');
    const h = datos.horas[Math.floor(datos.horas.length / 2)];
    check(h.viento != null, 'viento: ' + h.viento + ' km/h');
    check(h.racha != null, 'rachas: ' + h.racha + ' km/h');
    check(h.presion != null, 'presión: ' + h.presion + ' hPa');
    check(h.ola != null, 'altura de ola: ' + h.ola + ' m');
    check(h.olaPeriodo != null, 'periodo de ola: ' + h.olaPeriodo + ' s');
    check(h.sst != null, 'temperatura del agua: ' + h.sst + ' °C');
    check(h.corriente != null, 'velocidad de corriente: ' + h.corriente + ' m/s');
    check(h.nivelMar != null, 'nivel del mar (marea): ' + h.nivelMar + ' m');

    const m = PP.mareas.analizar(datos);
    check(m.extremos.length >= 8, 'pleamares/bajamares extraídas: ' + m.extremos.length);
    if (m.ahora) {
      console.log('  · Marea ahora: ' + m.ahora.fase + ' → próxima ' + m.ahora.siguiente.tipo +
        ' ' + m.ahora.siguiente.fecha.toISOString() + ' (' + m.ahora.siguiente.altura.toFixed(2) + ' m)');
      console.log('  · Amplitud: ' + (m.amplitud ? m.amplitud.rango.toFixed(2) + ' m (' + m.amplitud.etiqueta + ')' : '—'));
    }
    check(m.ahora != null, 'estado de marea actual calculado');

    const ctx = PP.indice.preparar(datos);
    const hNow = PP.indice.horaMasCercana(datos.horas, new Date());
    for (const modo of Object.keys(PP.MODOS)) {
      const r = PP.indice.indiceHora(hNow, modo, ctx);
      console.log('  · Índice ' + modo + ' ahora: ' + r.valor + ' (' + PP.util.etiquetaIndice(r.valor) + ')');
      check(r.valor >= 0 && r.valor <= 100, 'índice ' + modo + ' en rango');
    }
    const rank = PP.indice.especiesEn(new Date(), ctx).slice(0, 3);
    console.log('  · Top especies ahora: ' + rank.map(r => r.especie.nombre + ' ' + r.act.valor).join(', '));

    // Rejilla de corrientes para el mapa
    const grid = await PP.api.fetchCorrientesGrid(43.29, -2.17);
    const conDato = grid.filter(p => p.vel && p.vel.some(v => v != null));
    check(grid.length === PP.CONFIG.GRID_N * PP.CONFIG.GRID_N, 'rejilla completa: ' + grid.length + ' puntos');
    check(conDato.length >= 5, 'puntos marinos con corriente: ' + conDato.length + '/' + grid.length);

    // Geocoding
    const lugares = await PP.api.buscarLugar('Getaria');
    check(lugares.length > 0, 'geocoding: ' + (lugares[0] && (lugares[0].nombre + ' ' + lugares[0].lat + ',' + lugares[0].lon)));

    resumen('api en vivo');
  } catch (e) {
    console.error('  ✗ ERROR de red o API: ' + e.message);
    console.error('  (Si no hay internet en este entorno, ejecuta: node test/test_api_live.js)');
    process.exit(2);
  }
})();
