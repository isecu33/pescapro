/* PescaPro - Renderizado de la interfaz (vanilla JS, sin frameworks) */
window.PP = window.PP || {};

PP.ui = (function () {
  const $ = (s) => document.querySelector(s);
  const U = () => PP.util;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ============ VISTA AHORA ============ */

  function renderAhora(st) {
    const cont = $('#vista-ahora');
    cont.innerHTML = '';
    if (!st.ctx) { cont.appendChild(el('div', 'pp-cargando', 'Cargando datos…')); return; }

    const ahora = new Date();
    const h = PP.indice.horaMasCercana(st.datos.horas, ahora);
    const idx = PP.indice.indiceHora(h, st.modo, st.ctx);

    // Aviso de seguridad
    const banner = $('#aviso-seguridad');
    banner.className = 'pp-banner pp-banner-' + idx.seguridad.nivel;
    banner.innerHTML = idx.seguridad.nivel === 'ok' ? '' :
      PP.iconos.html(idx.seguridad.nivel === 'rojo' ? 'stop' : 'alerta') + ' ' + idx.seguridad.motivos.join(' · ');
    banner.style.display = idx.seguridad.nivel === 'ok' ? 'none' : 'block';

    // Selector de modalidad
    cont.appendChild(selectorModo(st));

    // Gauge del índice
    const card = el('div', 'pp-card pp-card-indice');
    card.appendChild(gauge(idx.valor));
    const info = el('div', 'pp-indice-info');
    info.appendChild(el('div', 'pp-indice-etiqueta', U().etiquetaIndice(idx.valor)));
    info.appendChild(el('div', 'pp-indice-sub', PP.iconos.html(PP.MODOS[st.modo].icono) + PP.MODOS[st.modo].nombre + ' · ahora'));
    card.appendChild(info);
    cont.appendChild(card);

    // Desglose de factores
    cont.appendChild(desgloseFactores(idx.factores, st.modo));

    // Condiciones actuales
    cont.appendChild(condicionesActuales(h, st));

    // Marea
    cont.appendChild(cardMarea(st));

    // Sol y luna
    cont.appendChild(cardSolLuna(st));

    // Especies activas ahora
    cont.appendChild(cardEspeciesAhora(st, ahora));
  }

  function selectorModo(st) {
    const box = el('div', 'pp-modos');
    Object.values(PP.MODOS).forEach(m => {
      const b = el('button', 'pp-chip' + (st.modo === m.id ? ' activo' : ''), PP.iconos.html(m.icono) + m.nombre);
      b.addEventListener('click', () => PP.app.cambiarModo(m.id));
      box.appendChild(b);
    });
    return box;
  }

  function gauge(valor) {
    const color = U().colorIndice(valor);
    const r = 54, c = 2 * Math.PI * r, frac = valor / 100;
    const wrap = el('div', 'pp-gauge');
    wrap.innerHTML =
      '<svg viewBox="0 0 140 140">' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="var(--borde)" stroke-width="12"/>' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="12" stroke-linecap="round" ' +
      'stroke-dasharray="' + (c * frac) + ' ' + c + '" transform="rotate(-90 70 70)"/>' +
      '<text x="70" y="66" text-anchor="middle" class="pp-gauge-num" fill="' + color + '">' + valor + '</text>' +
      '<text x="70" y="88" text-anchor="middle" class="pp-gauge-lbl">/ 100</text>' +
      '</svg>';
    return wrap;
  }

  const NOMBRES_FACTOR = {
    viento: 'Viento', oleaje: 'Oleaje', marea: 'Marea', solunar: 'Solunar',
    momento: 'Momento del día', presion: 'Presión', cielo: 'Cielo', corriente: 'Corriente', sst: 'Tª agua'
  };

  function desgloseFactores(f, modo) {
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, 'Qué suma y qué resta'));
    const pesos = PP.MODOS[modo].pesos;
    Object.keys(pesos).sort((a, b) => pesos[b] - pesos[a]).forEach(k => {
      const v = f[k] != null ? f[k] : 0.5;
      const fila = el('div', 'pp-factor');
      fila.appendChild(el('span', 'pp-factor-nombre', NOMBRES_FACTOR[k] || k));
      const barra = el('div', 'pp-barra');
      const rel = el('div', 'pp-barra-rel');
      rel.style.width = Math.round(v * 100) + '%';
      rel.style.background = v >= 0.7 ? 'var(--verde)' : v >= 0.45 ? 'var(--ambar)' : 'var(--rojo)';
      barra.appendChild(rel);
      fila.appendChild(barra);
      fila.appendChild(el('span', 'pp-factor-peso', Math.round(pesos[k] * 100) + '%'));
      card.appendChild(fila);
    });
    card.appendChild(el('p', 'pp-nota', 'El % es el peso del factor en el índice para esta modalidad.'));
    return card;
  }

  function condicionesActuales(h, st) {
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, 'Condiciones ahora'));
    const wmo = PP.WMO[h.codigo] || ['—', '', 'nuboso'];
    const items = [
      [wmo[2], wmo[0], h.temp != null ? Math.round(h.temp) + '°C' : '—'],
      ['viento', 'Viento ' + U().gradosACardinal(h.vientoDir), h.viento != null ? Math.round(h.viento) + ' km/h (rachas ' + (h.racha != null ? Math.round(h.racha) : '—') + ')' : '—'],
      ['ola', 'Olas ' + U().gradosACardinal(h.olaDir), h.ola != null ? h.ola.toFixed(1) + ' m · ' + (h.olaPeriodo != null ? Math.round(h.olaPeriodo) + ' s' : '') : 'sin dato'],
      ['termometro', 'Agua', h.sst != null ? h.sst.toFixed(1) + '°C' : 'sin dato'],
      ['corriente', 'Corriente', h.corriente != null ? h.corriente.toFixed(2) + ' m/s hacia ' + U().gradosACardinal(h.corrienteDir) : 'sin dato'],
      ['presion', 'Presión', h.presion != null ? Math.round(h.presion) + ' hPa ' + tendenciaTxt(h.presionTend) : '—'],
      ['ojo', 'Visibilidad', h.visibilidad != null ? (h.visibilidad / 1000).toFixed(0) + ' km' : '—'],
      ['gota', 'Precipitación', h.lluvia != null ? h.lluvia.toFixed(1) + ' mm' : '—']
    ];
    const grid = el('div', 'pp-cond-grid');
    items.forEach(([ic, lbl, val]) => {
      const it = el('div', 'pp-cond');
      it.appendChild(el('div', 'pp-cond-ico', PP.iconos.svg(ic)));
      it.appendChild(el('div', 'pp-cond-lbl', lbl));
      it.appendChild(el('div', 'pp-cond-val', val));
      grid.appendChild(it);
    });
    card.appendChild(grid);
    return card;
  }

  function tendenciaTxt(t) {
    if (t == null) return '';
    if (t <= -3) return PP.iconos.html('flechaBajaFuerte');
    if (t <= -1) return PP.iconos.html('flechaBaja');
    if (t < 1) return PP.iconos.html('flechaIgual');
    if (t < 3) return PP.iconos.html('flechaSube');
    return PP.iconos.html('flechaSubeFuerte');
  }

  function cardMarea(st) {
    const card = el('div', 'pp-card');
    const m = st.ctx.mareas;
    card.appendChild(el('h3', null, 'Marea'));
    if (!m.ahora) {
      card.appendChild(el('p', 'pp-nota', 'Sin datos de marea para este punto (¿demasiado lejos del mar?).'));
      return card;
    }
    const est = m.ahora;
    const flecha = PP.iconos.html(est.subiendo ? 'flechaDiagSube' : 'flechaDiagBaja') + (est.subiendo ? 'Subiendo' : 'Bajando');
    const prox = est.siguiente;
    const resta = Math.max(0, prox.fecha - Date.now());
    const hh = Math.floor(resta / 3600e3), mm = Math.round((resta % 3600e3) / 60000);
    const linea = el('div', 'pp-marea-linea',
      '<b>' + flecha + '</b> · ' + (prox.tipo === 'pleamar' ? 'Pleamar' : 'Bajamar') + ' a las <b>' +
      U().fmtHora(prox.fecha) + '</b> (en ' + hh + 'h ' + String(mm).padStart(2, '0') + 'm)');
    card.appendChild(linea);
    if (m.amplitud) {
      card.appendChild(el('div', 'pp-marea-amp',
        '<span style="color:' + m.amplitud.color + '">●</span> ' + m.amplitud.etiqueta +
        ' · amplitud ' + m.amplitud.rango.toFixed(1) + ' m · coef. ~' + m.amplitud.coef));
    }
    card.appendChild(curvaMarea(st));
    // Próximas mareas
    const tabla = el('div', 'pp-mareas-prox');
    m.proximos.forEach(e => {
      tabla.appendChild(el('div', 'pp-marea-item',
        PP.iconos.html(e.tipo === 'pleamar' ? 'flechaSube' : 'flechaBaja') + (e.tipo === 'pleamar' ? 'Pleamar' : 'Bajamar') + ' · ' + U().fmtDia(e.fecha) + ' ' +
        U().fmtHora(e.fecha) + ' · ' + e.altura.toFixed(1) + ' m'));
    });
    card.appendChild(tabla);
    card.appendChild(el('p', 'pp-nota', 'Media marea = máxima corriente = máxima actividad. Las horas de pleamar/bajamar proceden del modelo global; contrasta con las tablas oficiales de tu puerto.'));
    return card;
  }

  /* Curva SVG del nivel del mar: desde hace 6h hasta +30h */
  function curvaMarea(st) {
    const ahora = Date.now();
    const desde = ahora - 6 * 3600e3, hasta = ahora + 30 * 3600e3;
    const pts = st.datos.horas.filter(h => h.fecha >= desde && h.fecha <= hasta && h.nivelMar != null);
    if (pts.length < 4) return el('div');
    const W = 340, H = 90, PAD = 6;
    const min = Math.min(...pts.map(p => p.nivelMar)), max = Math.max(...pts.map(p => p.nivelMar));
    const x = (t) => PAD + (t - desde) / (hasta - desde) * (W - 2 * PAD);
    const y = (v) => H - PAD - (v - min) / (max - min || 1) * (H - 2 * PAD);
    let d = '';
    pts.forEach((p, i) => { d += (i ? 'L' : 'M') + x(p.fecha.getTime()).toFixed(1) + ',' + y(p.nivelMar).toFixed(1); });
    const xNow = x(ahora);
    // etiquetas de extremos dentro de la ventana
    let marcas = '';
    st.ctx.mareas.extremos.filter(e => e.fecha >= desde && e.fecha <= hasta).forEach(e => {
      const ex = x(e.fecha.getTime()), ey = y(e.altura);
      marcas += '<circle cx="' + ex + '" cy="' + ey + '" r="3" fill="var(--acento)"/>' +
        '<text x="' + ex + '" y="' + (e.tipo === 'pleamar' ? ey - 6 : ey + 12) + '" text-anchor="middle" class="pp-svg-txt">' + U().fmtHora(e.fecha) + '</text>';
    });
    const div = el('div', 'pp-curva');
    div.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '">' +
      '<path d="' + d + ' L' + x(pts[pts.length - 1].fecha.getTime()) + ',' + (H - 1) + ' L' + x(pts[0].fecha.getTime()) + ',' + (H - 1) + ' Z" fill="rgba(77,171,247,.15)" stroke="none"/>' +
      '<path d="' + d + '" fill="none" stroke="var(--azul)" stroke-width="2"/>' +
      '<line x1="' + xNow + '" y1="2" x2="' + xNow + '" y2="' + (H - 2) + '" stroke="var(--acento)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      '<text x="' + xNow + '" y="12" text-anchor="middle" class="pp-svg-txt" fill="var(--acento)">ahora</text>' +
      marcas + '</svg>';
    return div;
  }

  function cardSolLuna(st) {
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, 'Sol, luna y solunar'));
    const hoy = new Date();
    const s = PP.solunar.sol(hoy, st.spot.lat, st.spot.lon);
    const l = PP.solunar.luna(hoy, st.spot.lat, st.spot.lon);
    const fila = el('div', 'pp-cond-grid');
    const creciente = l.idx <= 1;
    const items = [
      [PP.iconos.svg('amanecer'), 'Amanecer', s.amanecer ? U().fmtHora(s.amanecer) : '—'],
      [PP.iconos.svg('atardecer'), 'Ocaso', s.ocaso ? U().fmtHora(s.ocaso) : '—'],
      [PP.iconos.luna(l.iluminacion, creciente), l.nombre, l.iluminacion + '%'],
      [PP.iconos.svg('lunaGenerica'), 'Luna sale/pone', (l.salida ? U().fmtHora(l.salida) : '—') + ' / ' + (l.puesta ? U().fmtHora(l.puesta) : '—')]
    ];
    items.forEach(([ic, lbl, val]) => {
      const it = el('div', 'pp-cond');
      it.appendChild(el('div', 'pp-cond-ico', ic));
      it.appendChild(el('div', 'pp-cond-lbl', lbl));
      it.appendChild(el('div', 'pp-cond-val', val));
      fila.appendChild(it);
    });
    card.appendChild(fila);
    const per = st.ctx.periodosDe(hoy).map(p =>
      '<span class="pp-tag ' + (p.tipo === 'mayor' ? 'pp-tag-mayor' : '') + '">' +
      (p.tipo === 'mayor' ? '★' : '☆') + ' ' + U().fmtHora(p.inicio) + '–' + U().fmtHora(p.fin) + '</span>').join(' ');
    card.appendChild(el('div', 'pp-solunar', '<b>Periodos solunares hoy:</b><br>' + (per || '—')));
    card.appendChild(el('p', 'pp-nota', '★ mayores (tránsito lunar) · ☆ menores (orto/ocaso lunar). Coincidiendo con amanecer/atardecer o media marea multiplican las opciones.'));
    return card;
  }

  function cardEspeciesAhora(st, fecha) {
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, 'Especies activas ahora'));
    const rank = PP.indice.especiesEn(fecha, st.ctx).slice(0, 6);
    rank.forEach(r => {
      const fila = el('div', 'pp-esp-fila');
      fila.appendChild(el('span', 'pp-esp-ico', r.especie.icono));
      fila.appendChild(el('span', 'pp-esp-nombre', r.especie.nombre));
      const barra = el('div', 'pp-barra pp-barra-esp');
      const relleno = el('div', 'pp-barra-rel');
      relleno.style.width = r.act.valor + '%';
      relleno.style.background = U().colorIndice(r.act.valor);
      barra.appendChild(relleno);
      fila.appendChild(barra);
      fila.appendChild(el('span', 'pp-esp-val', r.act.valor));
      fila.addEventListener('click', () => modalEspecie(r.especie, st));
      card.appendChild(fila);
    });
    card.appendChild(el('p', 'pp-nota', 'Actividad estimada por reglas (temporada, agua, mar, marea, luz, luna). Toca una especie para ver su ficha.'));
    return card;
  }

  /* ============ VISTA PREVISIÓN ============ */

  function renderPrevision(st) {
    const cont = $('#vista-prevision');
    cont.innerHTML = '';
    if (!st.ctx) { cont.appendChild(el('div', 'pp-cargando', 'Cargando…')); return; }
    cont.appendChild(selectorModo(st));

    // Mejores ventanas
    const card = el('div', 'pp-card');
    card.appendChild(el('h3', null, '🎯 Mejores ventanas (72 h)'));
    const vents = PP.indice.mejoresVentanas(st.ctx, st.modo);
    if (!vents.length) card.appendChild(el('p', 'pp-nota', 'No hay ventanas buenas (índice ≥ 55) en las próximas 72 h. Revisa el gráfico para ver lo menos malo.'));
    vents.forEach(v => {
      const fila = el('div', 'pp-ventana');
      const col = U().colorIndice(v.max);
      fila.innerHTML =
        '<div class="pp-vent-idx" style="background:' + col + '">' + v.max + '</div>' +
        '<div class="pp-vent-info"><b>' + U().fmtDia(v.inicio) + ' · ' + U().fmtHora(v.inicio) + '–' + U().fmtHora(new Date(v.fin.getTime() + 3600e3)) + '</b>' +
        '<span>' + motivoVentana(v) + '</span></div>';
      card.appendChild(fila);
    });
    cont.appendChild(card);

    // Gráfico horario
    const card2 = el('div', 'pp-card');
    card2.appendChild(el('h3', null, 'Índice hora a hora'));
    card2.appendChild(graficoHoras(st));
    card2.appendChild(el('p', 'pp-nota', 'Toca una barra para ver el detalle de esa hora.'));
    cont.appendChild(card2);
  }

  function motivoVentana(v) {
    const f = v.mejorHora.factores;
    const razones = [];
    if (f.momento >= 0.9) razones.push(v.mejorHora.momento === 'noche' ? 'noche' : 'cambio de luz');
    if (f.marea >= 0.8) razones.push('marea en movimiento');
    if (f.solunar >= 0.9) razones.push('periodo solunar mayor');
    if (f.oleaje >= 0.9) razones.push('mar ideal');
    if (f.presion >= 0.9) razones.push('presión bajando');
    return razones.length ? 'Suma: ' + razones.join(' + ') : 'Condiciones equilibradas';
  }

  function graficoHoras(st) {
    const wrap = el('div', 'pp-grafico-scroll');
    const s = PP.indice.serie(st.ctx, st.modo).slice(0, 96);
    let diaActual = null;
    const inner = el('div', 'pp-grafico');
    s.forEach(x => {
      const d = x.hora.fecha;
      if (diaActual !== d.getDate()) {
        diaActual = d.getDate();
        inner.appendChild(el('div', 'pp-graf-dia', U().fmtDia(d)));
      }
      const col = el('div', 'pp-graf-col');
      const barra = el('div', 'pp-graf-barra');
      barra.style.height = Math.max(4, x.valor) + '%';
      barra.style.background = x.seguridad.nivel === 'rojo' ? 'var(--rojo)' : U().colorIndice(x.valor);
      col.appendChild(barra);
      col.appendChild(el('div', 'pp-graf-hora', String(d.getHours()).padStart(2, '0')));
      col.addEventListener('click', () => modalDetalleHora(x, st));
      inner.appendChild(col);
    });
    wrap.appendChild(inner);
    return wrap;
  }

  function modalDetalleHora(x, st) {
    const d = x.hora;
    const cuerpo = el('div');
    cuerpo.appendChild(el('h3', null, U().fmtDia(d.fecha) + ' · ' + U().fmtHora(d.fecha) + ' — índice ' + x.valor + ' (' + U().etiquetaIndice(x.valor) + ')'));
    if (x.seguridad.nivel !== 'ok') cuerpo.appendChild(el('p', 'pp-banner pp-banner-' + x.seguridad.nivel, x.seguridad.motivos.join(' · ')));
    cuerpo.appendChild(desgloseFactores(x.factores, st.modo));
    const wmo = PP.WMO[d.codigo] || ['—', ''];
    cuerpo.appendChild(el('p', null, wmo[1] + ' ' + wmo[0] + ' · 💨 ' + Math.round(d.viento || 0) + ' km/h · 🌊 ' +
      (d.ola != null ? d.ola.toFixed(1) : '—') + ' m · 🌡️ agua ' + (d.sst != null ? d.sst.toFixed(1) : '—') + '°C'));
    // top especies a esa hora
    const rank = PP.indice.especiesEn(d.fecha, st.ctx).slice(0, 3);
    cuerpo.appendChild(el('p', null, '<b>Especies:</b> ' + rank.map(r => r.especie.icono + ' ' + r.especie.nombre + ' (' + r.act.valor + ')').join(' · ')));
    modal(cuerpo);
  }

  /* ============ VISTA ESPECIES ============ */

  function renderEspecies(st) {
    const cont = $('#vista-especies');
    cont.innerHTML = '';
    if (!st.ctx) { cont.appendChild(el('div', 'pp-cargando', 'Cargando…')); return; }
    const ahora = new Date();
    const rank = PP.indice.especiesEn(ahora, st.ctx);
    const grid = el('div', 'pp-esp-grid');
    rank.forEach(r => {
      const c = el('div', 'pp-esp-card');
      c.appendChild(el('div', 'pp-esp-card-ico', r.especie.icono));
      c.appendChild(el('div', 'pp-esp-card-nombre', r.especie.nombre));
      const v = el('div', 'pp-esp-card-val', r.act.valor);
      v.style.color = U().colorIndice(r.act.valor);
      c.appendChild(v);
      c.appendChild(el('div', 'pp-esp-card-motivo', r.act.motivo));
      c.addEventListener('click', () => modalEspecie(r.especie, st));
      grid.appendChild(c);
    });
    cont.appendChild(el('p', 'pp-nota pp-pad', 'Actividad estimada AHORA en tu spot. Toca para ver ficha completa, temporada y mejores horas.'));
    cont.appendChild(grid);
  }

  function modalEspecie(esp, st) {
    const cuerpo = el('div');
    cuerpo.appendChild(el('h3', null, esp.icono + ' ' + esp.nombre + ' <small>(' + esp.cientifico + ')</small>'));

    // Temporada: mini heatmap 12 meses
    const meses = 'EFMAMJJASOND';
    const heat = el('div', 'pp-heat');
    esp.meses.forEach((v, i) => {
      const celda = el('div', 'pp-heat-celda', meses[i]);
      celda.style.background = 'rgba(47,179,68,' + (v * 0.85) + ')';
      if (i === new Date().getMonth()) celda.classList.add('pp-heat-actual');
      heat.appendChild(celda);
    });
    cuerpo.appendChild(el('div', 'pp-campo', '<b>Temporada</b>'));
    cuerpo.appendChild(heat);

    const campos = [
      ['📍 Zonas', esp.zonas],
      ['🎣 Técnicas', esp.tecnicas],
      ['🪱 Cebos/señuelos', esp.cebos],
      ['🌡️ Agua óptima', esp.sst[1] + '–' + esp.sst[2] + ' °C'],
      ['🌊 Mar óptimo', esp.oleaje[1] + '–' + esp.oleaje[2] + ' m'],
      ['📏 Talla mínima', esp.tallaMin ? esp.tallaMin + ' cm (orientativa: verifica la normativa de tu comunidad)' : (esp.pesoMin ? esp.pesoMin + ' kg mínimo (orientativo)' : 'Consulta la normativa local')],
      ['💡 Consejo', esp.notas]
    ];
    campos.forEach(([k, v]) => cuerpo.appendChild(el('div', 'pp-campo', '<b>' + k + ':</b> ' + v)));

    // Mejores horas próximas 72h
    if (st.ctx) {
      const mejores = PP.indice.mejoresHorasEspecie(esp, st.ctx, 72).filter(m => m.act.valor >= 30);
      cuerpo.appendChild(el('div', 'pp-campo', '<b>⏰ Mejores momentos (72 h):</b>'));
      if (!mejores.length) cuerpo.appendChild(el('p', 'pp-nota', 'Sin buenos momentos previstos. Probablemente fuera de temporada o mal estado del mar.'));
      mejores.forEach(m => {
        cuerpo.appendChild(el('div', 'pp-mejor-hora',
          '<span style="color:' + U().colorIndice(m.act.valor) + '">●</span> ' +
          U().fmtDia(m.hora.fecha) + ' ' + U().fmtHora(m.hora.fecha) + ' — actividad ' + m.act.valor));
      });
    }
    modal(cuerpo);
  }

  /* ============ VISTA CUADERNO ============ */

  function renderCuaderno(st) {
    const cont = $('#vista-cuaderno');
    cont.innerHTML = '';
    const btn = el('button', 'pp-boton-principal', PP.iconos.html('anadir') + 'Registrar captura');
    btn.addEventListener('click', () => modalCaptura(st));
    cont.appendChild(btn);

    const lista = PP.cuaderno.leer();

    // Galería de fotos
    const conFoto = lista.filter(c => c.fotoId);
    if (conFoto.length) {
      const g = el('div', 'pp-card');
      g.appendChild(el('h3', null, '📸 Galería (' + conFoto.length + ')'));
      const grid = el('div', 'pp-galeria');
      conFoto.forEach(c => {
        const celda = el('div', 'pp-galeria-celda');
        const img = document.createElement('img');
        img.alt = c.especie;
        PP.fotos.obtener(c.fotoId).then(d => { if (d) img.src = d; });
        celda.appendChild(img);
        celda.addEventListener('click', () => modalFoto(c));
        grid.appendChild(celda);
      });
      g.appendChild(grid);
      cont.appendChild(g);
    }

    const stats = PP.cuaderno.estadisticas();
    if (stats.total > 0) {
      const card = el('div', 'pp-card');
      card.appendChild(el('h3', null, '📊 Tus patrones (' + stats.total + ' capturas)'));
      card.appendChild(statsBarras('Por fase de marea', stats.porFaseMarea, { subiendo: 'Subiendo', pleamar: 'Pleamar', bajando: 'Bajando', bajamar: 'Bajamar' }));
      card.appendChild(statsBarras('Por momento', stats.porFranja));
      card.appendChild(statsBarras('Por luna', stats.porLuna));
      card.appendChild(statsBarras('Por especie', stats.porEspecie, null, (k) => { const e = PP.especiePorId(k); return e ? e.icono + ' ' + e.nombre : k; }));
      card.appendChild(el('p', 'pp-nota', 'Tu historial es tu mejor predictor: repite lo que te funciona.'));
      cont.appendChild(card);
    }

    const card2 = el('div', 'pp-card');
    card2.appendChild(el('h3', null, 'Historial'));
    if (!lista.length) card2.appendChild(el('p', 'pp-nota', 'Aún no hay capturas. Cada captura guarda automáticamente las condiciones del momento (marea, luna, viento, mar...) y su foto, para descubrir tus patrones.'));
    lista.forEach(c => {
      const e = PP.especiePorId(c.especie);
      const fila = el('div', 'pp-captura');
      const flex = el('div', 'pp-captura-flex');
      if (c.fotoId) {
        const thumb = el('div', 'pp-captura-thumb');
        const img = document.createElement('img');
        img.alt = '';
        PP.fotos.obtener(c.fotoId).then(d => { if (d) img.src = d; });
        thumb.appendChild(img);
        thumb.addEventListener('click', () => modalFoto(c));
        flex.appendChild(thumb);
      }
      const cuerpo = el('div', 'pp-captura-cuerpo');
      const cond = c.condiciones || {};
      cuerpo.innerHTML =
        '<div class="pp-captura-cab"><b>' + (e ? e.icono + ' ' + e.nombre : c.especie) + '</b>' +
        (c.talla ? ' · ' + c.talla + ' cm' : '') + (c.peso ? ' · ' + c.peso + ' kg' : '') +
        '<button class="pp-borrar" title="Borrar">' + PP.iconos.html('cerrar') + '</button></div>' +
        '<div class="pp-captura-sub">' + new Date(c.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) +
        (c.spot && c.spot.nombre ? ' · ' + c.spot.nombre : '') + (c.senuelo ? ' · ' + c.senuelo : '') + '</div>' +
        (cond.faseMarea ? '<div class="pp-captura-cond">🌊 ' + cond.faseMarea + (cond.luna ? ' · ' + cond.luna : '') + (cond.viento != null ? ' · 💨 ' + Math.round(cond.viento) + ' km/h' : '') + (cond.indice != null ? ' · índice ' + cond.indice : '') + '</div>' : '') +
        (c.notas ? '<div class="pp-captura-notas">' + c.notas + '</div>' : '');
      cuerpo.querySelector('.pp-borrar').addEventListener('click', () => {
        if (confirm('¿Borrar esta captura?' + (c.fotoId ? ' (también su foto)' : ''))) { PP.cuaderno.borrar(c.id); renderCuaderno(st); }
      });
      flex.appendChild(cuerpo);
      fila.appendChild(flex);
      card2.appendChild(fila);
    });
    cont.appendChild(card2);

    // Export / import
    const card3 = el('div', 'pp-card');
    const be = el('button', 'pp-chip', PP.iconos.html('descarga') + 'Exportar (copiar JSON)');
    be.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(PP.cuaderno.exportar()); alert('Cuaderno copiado al portapapeles (las fotos no se incluyen).'); }
      catch (e) { prompt('Copia el contenido:', PP.cuaderno.exportar()); }
    });
    const bi = el('button', 'pp-chip', PP.iconos.html('subida') + 'Importar');
    bi.addEventListener('click', () => {
      const txt = prompt('Pega el JSON del cuaderno:');
      if (txt) { try { PP.cuaderno.importar(txt); renderCuaderno(st); } catch (e) { alert('JSON no válido'); } }
    });
    card3.appendChild(be); card3.appendChild(bi);
    card3.appendChild(el('p', 'pp-nota', 'La exportación lleva los datos de las capturas; las fotos permanecen en este dispositivo.'));
    cont.appendChild(card3);
  }

  /* Visor de foto a pantalla completa con los datos de la captura */
  function modalFoto(c) {
    const e = PP.especiePorId(c.especie);
    const cuerpo = el('div');
    const img = document.createElement('img');
    img.className = 'pp-foto-grande';
    img.alt = e ? e.nombre : c.especie;
    PP.fotos.obtener(c.fotoId).then(d => { if (d) img.src = d; });
    cuerpo.appendChild(img);
    cuerpo.appendChild(el('div', 'pp-campo',
      '<b>' + (e ? e.icono + ' ' + e.nombre : c.especie) + '</b>' +
      (c.talla ? ' · ' + c.talla + ' cm' : '') + (c.peso ? ' · ' + c.peso + ' kg' : '')));
    cuerpo.appendChild(el('div', 'pp-captura-sub',
      new Date(c.fecha).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) +
      (c.spot && c.spot.nombre ? ' · ' + PP.iconos.html('pin') + c.spot.nombre : '')));
    const cond = c.condiciones || {};
    if (cond.faseMarea || cond.luna) {
      cuerpo.appendChild(el('div', 'pp-captura-cond',
        '🌊 Marea ' + (cond.faseMarea || '—') + (cond.luna ? ' · ' + cond.luna : '') +
        (cond.viento != null ? ' · 💨 ' + Math.round(cond.viento) + ' km/h' : '') +
        (cond.ola != null ? ' · 🌊 ' + Number(cond.ola).toFixed(1) + ' m' : '') +
        (cond.indice != null ? ' · índice ' + cond.indice : '')));
    }
    if (c.notas) cuerpo.appendChild(el('div', 'pp-captura-notas', c.notas));
    modal(cuerpo);
  }

  function statsBarras(titulo, obj, orden, fmtKey) {
    const box = el('div', 'pp-stats');
    box.appendChild(el('div', 'pp-stats-titulo', titulo));
    const claves = orden ? Object.keys(orden).filter(k => obj[k]) : Object.keys(obj);
    const max = Math.max(1, ...claves.map(k => obj[k] || 0));
    if (!claves.length) { box.appendChild(el('p', 'pp-nota', 'Sin datos aún.')); return box; }
    claves.sort((a, b) => (obj[b] || 0) - (obj[a] || 0)).forEach(k => {
      const fila = el('div', 'pp-factor');
      fila.appendChild(el('span', 'pp-factor-nombre', fmtKey ? fmtKey(k) : (orden ? orden[k] : k)));
      const barra = el('div', 'pp-barra');
      const rel = el('div', 'pp-barra-rel');
      rel.style.width = Math.round((obj[k] || 0) / max * 100) + '%';
      rel.style.background = 'var(--azul)';
      barra.appendChild(rel);
      fila.appendChild(barra);
      fila.appendChild(el('span', 'pp-factor-peso', obj[k]));
      box.appendChild(fila);
    });
    return box;
  }

  function modalCaptura(st) {
    const cuerpo = el('div');
    cuerpo.appendChild(el('h3', null, '➕ Registrar captura'));
    const form = el('div', 'pp-form');
    const selEsp = el('select', 'pp-input');
    PP.ESPECIES.forEach(e => {
      const o = el('option', null, e.icono + ' ' + e.nombre); o.value = e.id; selEsp.appendChild(o);
    });
    const oOtra = el('option', null, 'Otra'); oOtra.value = 'otra'; selEsp.appendChild(oOtra);
    const talla = el('input', 'pp-input'); talla.type = 'number'; talla.placeholder = 'Talla (cm)';
    const peso = el('input', 'pp-input'); peso.type = 'number'; peso.step = '0.1'; peso.placeholder = 'Peso (kg)';
    const selModo = el('select', 'pp-input');
    Object.values(PP.MODOS).forEach(m => { const o = el('option', null, m.nombre); o.value = m.id; selModo.appendChild(o); });
    selModo.value = st.modo;
    const senuelo = el('input', 'pp-input'); senuelo.placeholder = 'Señuelo / cebo';
    const notas = el('input', 'pp-input'); notas.placeholder = 'Notas (opcional)';

    // Foto: cámara o galería (el selector del sistema ofrece ambas)
    const foto = document.createElement('input');
    foto.type = 'file'; foto.accept = 'image/*'; foto.style.display = 'none';
    const camTexto = (t) => PP.iconos.html('camara') + t;
    const btnFoto = el('button', 'pp-chip', camTexto('Añadir foto')); btnFoto.type = 'button';
    const preview = document.createElement('img');
    preview.className = 'pp-foto-preview'; preview.style.display = 'none'; preview.alt = '';
    let fotoData = null;
    btnFoto.addEventListener('click', () => foto.click());
    foto.addEventListener('change', async () => {
      const f = foto.files && foto.files[0];
      if (!f) return;
      btnFoto.innerHTML = camTexto('Procesando…');
      try {
        fotoData = await PP.fotos.comprimir(f);
        preview.src = fotoData; preview.style.display = 'block';
        btnFoto.innerHTML = camTexto('Cambiar foto');
      } catch (e2) {
        fotoData = null;
        btnFoto.innerHTML = camTexto('No se pudo leer la foto — prueba otra');
      }
    });

    [selEsp, talla, peso, selModo, senuelo, notas, foto, btnFoto, preview].forEach(x => form.appendChild(x));
    const guardar = el('button', 'pp-boton-principal', 'Guardar con condiciones actuales');
    guardar.addEventListener('click', async () => {
      guardar.disabled = true;
      let condiciones = null;
      if (st.ctx) {
        const h = PP.indice.horaMasCercana(st.datos.horas, new Date());
        const idx = PP.indice.indiceHora(h, selModo.value, st.ctx);
        const em = st.ctx.mareas.ahora;
        const luna = PP.solunar.luna(new Date(), st.spot.lat, st.spot.lon);
        condiciones = {
          viento: h.viento, ola: h.ola, sst: h.sst, presion: h.presion,
          faseMarea: em ? em.fase : null, luna: luna.nombre,
          momento: PP.solunar.momentoDelDia(new Date(), st.spot.lat, st.spot.lon),
          indice: idx.valor
        };
      }
      let fotoId = null;
      if (fotoData) {
        fotoId = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        try { await PP.fotos.guardar(fotoId, fotoData); }
        catch (e3) { fotoId = null; }
      }
      PP.cuaderno.anadir({
        especie: selEsp.value,
        talla: talla.value ? Number(talla.value) : null,
        peso: peso.value ? Number(peso.value) : null,
        modalidad: selModo.value,
        senuelo: senuelo.value || null,
        notas: notas.value || null,
        spot: { nombre: st.spot.nombre, lat: st.spot.lat, lon: st.spot.lon },
        fotoId,
        condiciones
      });
      cerrarModal();
      renderCuaderno(st);
    });
    form.appendChild(guardar);
    cuerpo.appendChild(form);
    modal(cuerpo);
  }

  /* ============ MODAL GENÉRICO ============ */

  function modal(cuerpo) {
    cerrarModal();
    const fondo = el('div', 'pp-modal-fondo');
    fondo.id = 'pp-modal';
    const caja = el('div', 'pp-modal');
    const x = el('button', 'pp-modal-x', PP.iconos.svg('cerrar'));
    x.addEventListener('click', cerrarModal);
    caja.appendChild(x);
    caja.appendChild(cuerpo);
    fondo.appendChild(caja);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrarModal(); });
    document.body.appendChild(fondo);
  }
  function cerrarModal() {
    const m = document.getElementById('pp-modal');
    if (m) m.remove();
  }

  /* ============ CABECERA ============ */

  function renderCabecera(st) {
    if (st.spot && PP.solunar) {
      document.body.dataset.momento = PP.solunar.momentoDelDia(new Date(), st.spot.lat, st.spot.lon);
    }
    $('#hdr-spot-nombre').textContent = st.spot.nombre || (st.spot.lat.toFixed(3) + ', ' + st.spot.lon.toFixed(3));
    const u = $('#hdr-update');
    if (st.datos && st.datos.obtenido) {
      const min = Math.round((Date.now() - st.datos.obtenido) / 60000);
      u.textContent = st.cargando ? 'actualizando…' : (min <= 1 ? 'ahora mismo' : 'hace ' + (min < 60 ? min + ' min' : Math.round(min / 60) + ' h'));
      u.className = 'pp-update' + (min > 90 ? ' viejo' : '');
    } else {
      u.textContent = st.cargando ? 'cargando…' : 'sin datos';
    }
  }

  return { renderAhora, renderPrevision, renderEspecies, renderCuaderno, renderCabecera, modal, cerrarModal, modalEspecie, modalFoto };
})();
