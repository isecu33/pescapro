/* PescaPro - Motor del ÍNDICE DE PESCA (0-100) y de actividad por especie.
   100% basado en reglas ponderadas (sin IA): cada factor ambiental se puntúa
   0..1 con funciones trapecio y se combina con los pesos de la modalidad.
   Factores: viento, oleaje, flujo de marea, solunar, momento del día,
   tendencia de presión, cielo/lluvia, corriente y temperatura del agua. */
window.PP = window.PP || {};

PP.indice = (function () {
  const U = () => PP.util;

  /* Prepara el contexto de cálculo para una tanda de datos:
     - análisis de mareas
     - periodos solunares por día (cacheados)
     - tendencia de presión anotada en cada hora (p[i] - p[i-6h]) */
  function preparar(datos) {
    const m = PP.mareas.analizar(datos);
    const horas = datos.horas;
    for (let i = 0; i < horas.length; i++) {
      const j = i - 6;
      horas[i].presionTend = (j >= 0 && horas[i].presion != null && horas[j].presion != null)
        ? horas[i].presion - horas[j].presion : null;
    }
    const cachePeriodos = {};
    function periodosDe(fecha) {
      const k = fecha.getFullYear() + '-' + fecha.getMonth() + '-' + fecha.getDate();
      if (!cachePeriodos[k]) cachePeriodos[k] = PP.solunar.periodos(fecha, datos.lat, datos.lon);
      return cachePeriodos[k];
    }
    return { datos, mareas: m, periodosDe, lat: datos.lat, lon: datos.lon };
  }

  /* Seguridad: devuelve {nivel:'ok'|'amarillo'|'rojo', motivos:[]} */
  function seguridad(h) {
    const S = PP.SEGURIDAD, motivos = [];
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
  function factores(h, modo, ctx) {
    const M = PP.MODOS[modo], u = U();
    const f = {};

    f.viento = u.trap(h.viento, -1, M.vientoOK[1], M.vientoOK[2], M.vientoOK[3]);
    f.oleaje = u.trap(h.ola, M.oleajeOK[0] - 0.001, M.oleajeOK[1], M.oleajeOK[2], M.oleajeOK[3]);
    f.corriente = u.trap(h.corriente, M.corrienteOK[0] - 0.001, M.corrienteOK[1], M.corrienteOK[2], M.corrienteOK[3]);

    // Marea: flujo (media marea = máxima corriente = actividad) + preferencia de fase
    const em = ctx.mareas.estadoEn(h.fecha);
    if (em) {
      let fm = 0.35 + 0.65 * em.flujo; // el flujo manda
      if (modo === 'surfcasting' && em.subiendo) fm = Math.min(1, fm + 0.15); // subiendo suma en playa
      if (modo === 'eging' && (em.fase === 'pleamar' || em.subiendo)) fm = Math.min(1, fm + 0.10);
      f.marea = fm;
    } else f.marea = 0.5;

    // Solunar
    f.solunar = PP.solunar.factorSolunar(h.fecha, ctx.periodosDe(h.fecha));

    // Momento del día
    const mom = PP.solunar.momentoDelDia(h.fecha, ctx.lat, ctx.lon);
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
    if (h.nubes != null) cielo = 0.6 + 0.4 * u.trap(h.nubes, -1, 20, 80, 101);
    if (h.lluvia != null) {
      if (h.lluvia > 4) cielo = 0.15;
      else if (h.lluvia > 1.5) cielo = Math.min(cielo, 0.45);
      else if (h.lluvia > 0.2) cielo = Math.min(cielo, 0.8);
    }
    if (h.codigo != null && PP.SEGURIDAD.codigosTormenta.includes(h.codigo)) cielo = 0;
    f.cielo = cielo;

    // Temperatura del agua: banda templada genérica (las especies afinan la suya)
    f.sst = u.trap(h.sst, 6, 11, 21, 26);

    return f;
  }

  /* Índice 0..100 de una hora para una modalidad */
  function indiceHora(h, modo, ctx) {
    const M = PP.MODOS[modo];
    const f = factores(h, modo, ctx);
    let s = 0;
    for (const k in M.pesos) s += M.pesos[k] * (f[k] != null ? f[k] : 0.5);
    let valor = Math.round(100 * s);
    const seg = seguridad(h);
    if (seg.nivel === 'rojo') valor = Math.min(valor, PP.SEGURIDAD.capRojo);
    return { valor, factores: f, seguridad: seg, momento: f._momento };
  }

  /* Serie de índice para todas las horas futuras (y 2h pasadas) */
  function serie(ctx, modo) {
    const ahora = Date.now() - 2 * 3600e3;
    return ctx.datos.horas
      .filter(h => h.fecha.getTime() >= ahora)
      .map(h => ({ hora: h, ...indiceHora(h, modo, ctx) }));
  }

  /* Mejores ventanas de pesca: agrupa horas consecutivas con índice >= umbral */
  function mejoresVentanas(ctx, modo, opts) {
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
  function actividadEspecie(esp, h, ctx) {
    const u = U();
    const mes = h.fecha.getMonth();
    const base = esp.meses[mes];
    if (base <= 0.05) return { valor: 0, motivo: 'Fuera de temporada' };

    const fSst = h.sst != null ? u.trap(h.sst, esp.sst[0], esp.sst[1], esp.sst[2], esp.sst[3]) : 0.7;
    const fOla = h.ola != null ? u.trap(h.ola, esp.oleaje[0] - 0.001, esp.oleaje[1], esp.oleaje[2], esp.oleaje[3]) : 0.7;

    const em = ctx.mareas.estadoEn(h.fecha);
    const fMarea = em ? (esp.marea[em.fase] != null ? esp.marea[em.fase] : 0.7) : 0.7;

    const mom = PP.solunar.momentoDelDia(h.fecha, ctx.lat, ctx.lon);
    const fMom = esp.momento[mom] != null ? esp.momento[mom] : 0.7;

    const lunaInfo = PP.solunar.luna(h.fecha, ctx.lat, ctx.lon);
    const fLuna = esp.luna[lunaInfo.idx] != null ? esp.luna[lunaInfo.idx] : 0.85;

    // Media geométrica ponderada: castiga que un factor clave esté mal,
    // pero no anula por un único factor mediocre.
    const factores = [
      { v: base, p: 2.2 },   // temporada es lo más determinante
      { v: fSst, p: 1.4 },
      { v: fOla, p: 1.2 },
      { v: fMarea, p: 1.0 },
      { v: fMom, p: 1.2 },
      { v: fLuna, p: 0.5 }
    ];
    let logSum = 0, pesoTot = 0;
    for (const f of factores) {
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
  function especiesEn(fecha, ctx) {
    const h = horaMasCercana(ctx.datos.horas, fecha);
    if (!h) return [];
    return PP.ESPECIES
      .map(e => ({ especie: e, act: actividadEspecie(e, h, ctx) }))
      .sort((a, b) => b.act.valor - a.act.valor);
  }

  /* Mejores momentos (próximas `horas` h) para una especie concreta */
  function mejoresHorasEspecie(esp, ctx, horas) {
    const lim = Date.now() + (horas || 72) * 3600e3;
    return ctx.datos.horas
      .filter(h => h.fecha.getTime() >= Date.now() && h.fecha.getTime() <= lim)
      .map(h => ({ hora: h, act: actividadEspecie(esp, h, ctx) }))
      .sort((a, b) => b.act.valor - a.act.valor)
      .slice(0, 5)
      .sort((a, b) => a.hora.fecha - b.hora.fecha);
  }

  function horaMasCercana(horas, fecha) {
    let mejor = null, d = Infinity;
    for (const h of horas) {
      const dd = Math.abs(h.fecha - fecha);
      if (dd < d) { d = dd; mejor = h; }
    }
    return mejor;
  }

  return { preparar, seguridad, factores, indiceHora, serie, mejoresVentanas, actividadEspecie, especiesEn, mejoresHorasEspecie, horaMasCercana };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PP;
