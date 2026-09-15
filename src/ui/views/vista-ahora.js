/* Vista "Ahora" -- pantalla principal: banner de seguridad, selector de
   modalidad, gauge del indice de pesca, desglose de factores, condiciones
   actuales, marea, sol/luna y especies activas ahora.

   Reemplaza renderAhora() y las funciones que ensambla en www/js/ui.js
   (17-264): selectorModo (61-69), desgloseFactores (91-111),
   condicionesActuales (112-137), tendenciaTxt (138-146), cardMarea
   (147-182), cardSolLuna (212-240), cardEspeciesAhora (241-264).
   gauge() (71-84) y curvaMarea() (183-210) ya estan reemplazadas por los
   Custom Elements <pp-gauge> y <pp-curva-marea>.

   Fix CRITICAL de auditoria: el original construia casi todo el marcado
   con `el(tag, cls, html)` que asigna a innerHTML strings con datos
   dinamicos concatenados (marea, presion, condiciones...) sin escapar.
   Aqui TODO se crea con createElement/textContent (o via propiedades de
   Custom Element), cero innerHTML con datos.

   No orquesta nada: al cambiar de modalidad solo emite `pp-cambiar-modo`
   (bubbles+composed) para que la capa de orquestacion (Fase 4, app.js)
   decida que hacer -- igual que pp-app-shell emite pp-cambiar-vista/
   pp-cambiar-spot/etc. en vez de llamar a PP.app.* directamente. */
import { MODOS, WMO, util } from '../../domain/config.js';
import { indiceHora, horaMasCercana, mejoresVentanas, especiesEn } from '../../domain/indice.js';
import { sol, luna, curvaSolunar } from '../../domain/solunar.js';
import { espImgEl } from '../../domain/especies.js';
import '../components/pp-gauge.js';
import '../components/pp-curva-marea.js';
import '../components/pp-curva-solunar.js';

const NOMBRES_FACTOR = {
  viento: 'Viento', oleaje: 'Oleaje', marea: 'Marea', solunar: 'Solunar',
  momento: 'Momento del día', presion: 'Presión', cielo: 'Cielo', corriente: 'Corriente', sst: 'Tª agua'
};

const VENTANA_CURVA_ANTES_H = 6;
const VENTANA_CURVA_DESPUES_H = 30;

export function renderAhora(contenedor, st, delta = null) {
  contenedor.replaceChildren();

  if (!st.ctx) {
    contenedor.appendChild(elCargando());
    return;
  }

  const ahora = new Date();
  const h = horaMasCercana(st.datos.horas, ahora);
  const idx = indiceHora(h, st.modo, st.ctx);

  contenedor.appendChild(bannerSeguridad(idx.seguridad));
  contenedor.appendChild(resumenDia(st, idx, delta));
  contenedor.appendChild(selectorModo(st));
  contenedor.appendChild(cardIndiceFull(idx, st));
  const alerta = cardAlertaFactor(idx.factores, st.modo);
  if (alerta) contenedor.appendChild(alerta);
  contenedor.appendChild(cardMarea(st));
  contenedor.appendChild(condicionesActuales(h));
  contenedor.appendChild(cardSolLuna(st, ahora));
  contenedor.appendChild(cardEspeciesAhora(st, ahora));
}

function elCargando() {
  const div = document.createElement('div');
  div.className = 'pp-cargando';
  div.appendChild(document.createElement('ion-spinner'));
  const p = document.createElement('p');
  p.textContent = 'Cargando datos…';
  div.appendChild(p);
  return div;
}

function fmtHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function resumenDia(st, idx, delta) {
  const { card, content } = crearCard(null);
  card.classList.add('pp-resumen-dia');

  const v = idx.valor;
  const colorVar = v >= 65 ? 'var(--acento)' : v >= 40 ? 'var(--ambar)' : 'var(--rojo)';
  const label = v >= 65 ? 'BUENAS' : v >= 40 ? 'REGULARES' : 'MALAS';

  const cabeza = document.createElement('div');
  cabeza.className = 'pp-resumen-cabeza';
  const punto = document.createElement('span');
  punto.className = 'pp-resumen-punto';
  punto.style.color = colorVar;
  punto.textContent = '●';
  const veredicto = document.createElement('span');
  veredicto.className = 'pp-resumen-veredicto';
  veredicto.style.color = colorVar;
  veredicto.textContent = label + ' CONDICIONES';
  cabeza.append(punto, veredicto);
  content.appendChild(cabeza);

  const sub = document.createElement('div');
  sub.className = 'pp-resumen-sub';
  sub.textContent = (MODOS[st.modo]?.nombre ?? st.modo) + ' · ' + v + '/100';
  if (delta?.delta != null) {
    const d = document.createElement('span');
    d.className = 'pp-delta ' + (delta.delta >= 0 ? 'pp-delta-sube' : 'pp-delta-baja');
    d.textContent = ' ' + (delta.delta >= 0 ? '▲' : '▼') + Math.abs(delta.delta) + ' vs ayer';
    sub.appendChild(d);
  }
  content.appendChild(sub);

  const ventanas = mejoresVentanas(st.ctx, st.modo, { umbral: 50, maxVentanas: 1, horas: 18 });
  if (ventanas.length) {
    const vent = document.createElement('div');
    vent.className = 'pp-resumen-ventana';
    vent.textContent = 'Mejor momento: ' + fmtHora(ventanas[0].inicio) + '-' + fmtHora(ventanas[0].fin);
    content.appendChild(vent);
  }

  const marea = st.ctx.mareas?.ahora;
  if (marea) {
    const tm = document.createElement('div');
    tm.className = 'pp-resumen-marea';
    tm.textContent = marea.subiendo ? '↗ Marea subiendo' : '↘ Bajando';
    content.appendChild(tm);
  }

  return card;
}

/* Persistente (no ion-toast): oculto (display:none) si nivel === 'ok',
   igual que el banner global del original (www/js/ui.js:27-31). */
function bannerSeguridad(seg) {
  const card = document.createElement('ion-card');
  card.className = 'pp-banner';
  if (!seg || seg.nivel === 'ok') {
    card.style.display = 'none';
    return card;
  }
  card.style.display = 'block';
  card.setAttribute('color', seg.nivel === 'rojo' ? 'danger' : 'warning');
  const content = document.createElement('ion-card-content');
  content.textContent = (seg.nivel === 'rojo' ? '⛔ ' : '⚠️ ') + seg.motivos.join(' · ');
  card.appendChild(content);
  return card;
}

/* No llama a orquestacion: solo re-emite el cambio como evento propio para
   que Fase 4 decida (igual patron que pp-app-shell). */
function selectorModo(st) {
  const segment = document.createElement('ion-segment');
  segment.value = st.modo;
  segment.setAttribute('value', st.modo);

  Object.values(MODOS).forEach(m => {
    const btn = document.createElement('ion-segment-button');
    btn.value = m.id;
    btn.setAttribute('value', m.id);
    const label = document.createElement('ion-label');
    label.textContent = m.icono + ' ' + m.nombre;
    btn.appendChild(label);
    segment.appendChild(btn);
  });

  segment.addEventListener('ionChange', (ev) => {
    const modo = ev.detail && ev.detail.value;
    if (!modo) return;
    segment.dispatchEvent(new CustomEvent('pp-cambiar-modo', {
      detail: { modo }, bubbles: true, composed: true
    }));
  });

  return segment;
}

function cardIndiceFull(idx, st) {
  const card = document.createElement('ion-card');
  card.classList.add('pp-card-indice-full');

  const header = document.createElement('ion-card-header');
  const headerRow = document.createElement('div');
  headerRow.className = 'pp-card-header-row';
  const title = document.createElement('ion-card-title');
  title.textContent = 'Índice de pesca';
  const btnInfo = document.createElement('button');
  btnInfo.className = 'pp-btn-info';
  btnInfo.textContent = 'ⓘ';
  btnInfo.setAttribute('aria-label', 'Ver desglose completo');
  headerRow.append(title, btnInfo);
  header.appendChild(headerRow);
  card.appendChild(header);

  const content = document.createElement('ion-card-content');

  const split = document.createElement('div');
  split.className = 'pp-indice-split';

  // Panel izquierdo: puntuación
  const scorePanel = document.createElement('div');
  scorePanel.className = 'pp-score-panel';
  const v = idx.valor;
  const colorVar = v >= 65 ? 'var(--acento)' : v >= 40 ? 'var(--ambar)' : 'var(--rojo)';

  const scoreNum = document.createElement('div');
  scoreNum.className = 'pp-score-num';
  scoreNum.style.color = colorVar;
  scoreNum.textContent = v;
  const scoreDenom = document.createElement('div');
  scoreDenom.className = 'pp-score-denom';
  scoreDenom.textContent = '/ 100';
  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'pp-score-label';
  scoreLabel.style.color = colorVar;
  scoreLabel.textContent = util.etiquetaIndice(v).toUpperCase();
  const scoreModo = document.createElement('div');
  scoreModo.className = 'pp-score-modo';
  scoreModo.textContent = MODOS[st.modo].icono + ' ' + MODOS[st.modo].nombre;
  scorePanel.append(scoreNum, scoreDenom, scoreLabel, scoreModo);

  // Panel derecho: top 3 factores compactos
  const factoresPanel = document.createElement('div');
  factoresPanel.className = 'pp-factores-panel';
  const pesos = MODOS[st.modo].pesos;
  const sorted = Object.keys(pesos).sort((a, b) => pesos[b] - pesos[a]);

  sorted.slice(0, 3).forEach(k => {
    const vf = idx.factores[k] != null ? idx.factores[k] : 0.5;
    const colorBarra = vf >= 0.7 ? 'var(--acento)' : vf >= 0.45 ? 'var(--ambar)' : 'var(--rojo)';
    const fila = document.createElement('div');
    fila.className = 'pp-factor-mini';
    const nombre = document.createElement('span');
    nombre.className = 'pp-factor-mini-nombre';
    nombre.textContent = NOMBRES_FACTOR[k] || k;
    const barra = document.createElement('div');
    barra.className = 'pp-factor-mini-barra';
    const rel = document.createElement('div');
    rel.className = 'pp-factor-mini-rel';
    rel.style.width = Math.round(vf * 100) + '%';
    rel.style.background = colorBarra;
    barra.appendChild(rel);
    const val = document.createElement('span');
    val.className = 'pp-factor-mini-val';
    val.style.color = colorBarra;
    val.textContent = Math.round(vf * 100) + '%';
    fila.append(nombre, barra, val);
    factoresPanel.appendChild(fila);
  });

  split.append(scorePanel, factoresPanel);
  content.appendChild(split);

  // Sección expandible: todos los factores
  const todos = document.createElement('div');
  todos.className = 'pp-factores-todos';
  todos.style.display = 'none';
  sorted.forEach(k => todos.appendChild(filaFactor(idx.factores, pesos, k)));
  const notaTodos = document.createElement('p');
  notaTodos.className = 'pp-nota';
  notaTodos.style.marginTop = '6px';
  notaTodos.textContent = 'El % de peso indica la influencia de cada factor para esta modalidad.';
  todos.appendChild(notaTodos);
  content.appendChild(todos);
  card.appendChild(content);

  btnInfo.addEventListener('click', () => {
    const oculto = todos.style.display === 'none';
    todos.style.display = oculto ? 'block' : 'none';
    btnInfo.classList.toggle('pp-btn-info--activo', oculto);
  });

  return card;
}

function cardAlertaFactor(factores, modo) {
  const pesos = MODOS[modo].pesos;
  const malos = Object.keys(pesos)
    .filter(k => factores[k] != null && factores[k] < 0.25 && pesos[k] >= 0.10)
    .sort((a, b) => factores[a] - factores[b]);

  if (!malos.length) return null;

  const card = document.createElement('ion-card');
  card.className = 'pp-alerta-factor';
  malos.forEach(k => {
    const row = document.createElement('div');
    row.className = 'pp-alerta-factor-row';
    const titulo = document.createElement('span');
    titulo.className = 'pp-alerta-factor-titulo';
    titulo.textContent = (NOMBRES_FACTOR[k] || k) + ' muy desfavorable';
    const val = document.createElement('span');
    val.className = 'pp-alerta-factor-val';
    val.textContent = Math.round(factores[k] * 100) + '%';
    row.append(titulo, val);
    card.appendChild(row);
  });

  return card;
}

function crearCard(titulo) {
  const card = document.createElement('ion-card');
  if (titulo != null && titulo !== '') {
    const header = document.createElement('ion-card-header');
    const title = document.createElement('ion-card-title');
    title.textContent = titulo;
    header.appendChild(title);
    card.appendChild(header);
  }
  const content = document.createElement('ion-card-content');
  card.appendChild(content);
  return { card, content };
}

function wmoIcoName(codigo) {
  if (!codigo || codigo <= 1) return 'sunny-outline';
  if (codigo <= 3) return 'partly-sunny-outline';
  if (codigo <= 49) return 'cloud-outline';
  if (codigo <= 67) return 'rainy-outline';
  if (codigo <= 79) return 'snow-outline';
  if (codigo <= 82) return 'rainy-outline';
  return 'thunderstorm-outline';
}

function filaFactor(f, pesos, k) {
  const v = f[k] != null ? f[k] : 0.5;
  const fila = document.createElement('div');
  fila.className = 'pp-factor';

  const nombre = document.createElement('span');
  nombre.className = 'pp-factor-nombre';
  nombre.textContent = NOMBRES_FACTOR[k] || k;
  fila.appendChild(nombre);

  const barra = document.createElement('div');
  barra.className = 'pp-barra';
  const rel = document.createElement('div');
  rel.className = 'pp-barra-rel';
  rel.style.width = Math.round(v * 100) + '%';
  const colorBarra = v >= 0.7 ? 'var(--acento)' : v >= 0.45 ? 'var(--ambar)' : 'var(--rojo)';
  rel.style.background = colorBarra;
  barra.appendChild(rel);
  fila.appendChild(barra);

  const val = document.createElement('span');
  val.className = 'pp-factor-val';
  val.textContent = Math.round(v * 100) + '%';
  val.style.color = colorBarra;
  fila.appendChild(val);

  const peso = document.createElement('span');
  peso.className = 'pp-factor-peso';
  peso.textContent = Math.round(pesos[k] * 100) + '%';
  fila.appendChild(peso);

  return fila;
}


function tendenciaTxt(t) {
  if (t == null) return '';
  if (t <= -3) return '⬇⬇';
  if (t <= -1) return '⬇';
  if (t < 1) return '→';
  if (t < 3) return '⬆';
  return '⬆⬆';
}

function condicionesActuales(h) {
  const { card, content } = crearCard('Condiciones ahora');
  const wmo = WMO[h.codigo] || ['—', ''];

  // Cabecera: icono del tiempo + descripción + temperatura
  const cielo = document.createElement('div');
  cielo.className = 'pp-cond-cielo';
  const icoWmo = document.createElement('ion-icon');
  icoWmo.setAttribute('name', wmoIcoName(h.codigo));
  icoWmo.className = 'pp-cond-ico-ion pp-cond-ico-cielo';
  const cieloDesc = document.createElement('span');
  cieloDesc.className = 'pp-cond-cielo-desc';
  cieloDesc.textContent = wmo[0];
  const cieloTemp = document.createElement('span');
  cieloTemp.className = 'pp-cond-cielo-temp';
  cieloTemp.textContent = h.temp != null ? Math.round(h.temp) + '°' : '—';
  cielo.append(icoWmo, cieloDesc, cieloTemp);
  content.appendChild(cielo);

  // Cuadrícula 2 col: icono | etiqueta + valor
  const grid = document.createElement('div');
  grid.className = 'pp-cond-grid3';

  function cel(iconName, lbl, val) {
    const c = document.createElement('div');
    c.className = 'pp-cond-cel';
    const ico = document.createElement('ion-icon');
    ico.setAttribute('name', iconName);
    ico.className = 'pp-cond-ico-ion';
    const texto = document.createElement('div');
    texto.className = 'pp-cond-texto';
    const le = document.createElement('div');
    le.className = 'pp-cond-lbl2';
    le.textContent = lbl;
    const ve = document.createElement('div');
    ve.className = 'pp-cond-val2';
    ve.textContent = val;
    texto.append(le, ve);
    c.append(ico, texto);
    return c;
  }

  grid.appendChild(cel('wind-outline',
    'Viento ' + util.gradosACardinal(h.vientoDir),
    h.viento != null ? Math.round(h.viento) + ' km/h' + (h.racha != null ? '  r.' + Math.round(h.racha) : '') : '—'));
  grid.appendChild(cel('water-outline',
    'Oleaje ' + util.gradosACardinal(h.olaDir),
    h.ola != null ? h.ola.toFixed(1) + ' m · ' + (h.olaPeriodo != null ? Math.round(h.olaPeriodo) + ' s' : '—') : '—'));
  grid.appendChild(cel('thermometer-outline',
    'Agua',
    h.sst != null ? h.sst.toFixed(1) + '°C' : '—'));
  grid.appendChild(cel('navigate-outline',
    'Corriente ' + util.gradosACardinal(h.corrienteDir),
    h.corriente != null ? h.corriente.toFixed(2) + ' m/s' : '—'));
  grid.appendChild(cel('speedometer-outline',
    'Presión',
    h.presion != null ? Math.round(h.presion) + ' hPa ' + tendenciaTxt(h.presionTend) : '—'));
  grid.appendChild(cel('rainy-outline',
    'Lluvia',
    h.lluvia != null ? h.lluvia.toFixed(1) + ' mm' : '—'));
  grid.appendChild(cel('eye-outline',
    'Visibilidad',
    h.visibilidad != null ? (h.visibilidad / 1000).toFixed(0) + ' km' : '—'));

  content.appendChild(grid);
  return card;
}

/* Construye la propiedad `.data` de <pp-curva-marea> a partir de la
   ventana [-6h, +30h] alrededor de "ahora", igual que curvaMarea()
   (www/js/ui.js:183-210) pero sin reconstruir SVG a mano con strings. */
function curvaMareaEl(st) {
  const el = document.createElement('pp-curva-marea');
  const ahora = Date.now();
  const desde = ahora - VENTANA_CURVA_ANTES_H * 3600e3;
  const hasta = ahora + VENTANA_CURVA_DESPUES_H * 3600e3;

  const puntos = st.datos.horas
    .filter(h => h.fecha.getTime() >= desde && h.fecha.getTime() <= hasta && h.nivelMar != null)
    .map(h => ({ t: h.fecha.getTime(), nivel: h.nivelMar }));

  const extremos = st.ctx.mareas.extremos
    .filter(e => e.fecha.getTime() >= desde && e.fecha.getTime() <= hasta)
    .map(e => ({ tipo: e.tipo, t: e.fecha.getTime(), altura: e.altura }));

  el.data = { puntos, extremos, ahora };
  return el;
}

function cardMarea(st) {
  const { card, content } = crearCard('Marea');
  card.classList.add('pp-card-marea');
  const m = st.ctx.mareas;

  if (!m.ahora) {
    const nota = document.createElement('p');
    nota.className = 'pp-nota';
    nota.style.padding = '10px 14px';
    nota.textContent = 'Sin datos de marea para este punto (¿demasiado lejos del mar?).';
    content.appendChild(nota);
    return card;
  }

  const est  = m.ahora;
  const prox = est.siguiente;
  const resta = Math.max(0, prox.fecha - Date.now());
  const hh = Math.floor(resta / 3600e3);
  const mm = Math.round((resta % 3600e3) / 60000);

  // Cabecera: dirección + próximo extremo + badge amplitud
  const header = document.createElement('div');
  header.className = 'pp-marea-header';

  const dir = document.createElement('span');
  dir.className = 'pp-marea-dir';
  dir.textContent = est.subiendo ? '↗ Subiendo' : '↘ Bajando';

  const nextChip = document.createElement('span');
  nextChip.className = 'pp-marea-next';
  nextChip.textContent =
    (prox.tipo === 'pleamar' ? '⬆ ' : '⬇ ') +
    util.fmtHora(prox.fecha) + '  en ' + hh + 'h ' + String(mm).padStart(2, '0') + 'm';

  header.append(dir, nextChip);

  if (m.amplitud) {
    const amp = document.createElement('span');
    amp.className = 'pp-marea-amp-badge';
    amp.style.color = m.amplitud.color;
    amp.style.borderColor = m.amplitud.color;
    amp.textContent = m.amplitud.etiqueta + '  ' + m.amplitud.rango.toFixed(1) + ' m';
    header.appendChild(amp);
  }

  content.appendChild(header);

  // Gráfico a ancho completo
  content.appendChild(curvaMareaEl(st));

  // Próximos extremos: cuadrícula 2 × 2
  if (m.proximos?.length) {
    const grid = document.createElement('div');
    grid.className = 'pp-mareas-grid';
    m.proximos.slice(0, 4).forEach(e => {
      const it  = document.createElement('div');
      it.className = 'pp-marea-it';
      const ico = document.createElement('div');
      ico.className = 'pp-marea-it-ico';
      ico.style.color = e.tipo === 'pleamar' ? '#ff7200' : 'var(--pp-texto2)';
      ico.textContent = e.tipo === 'pleamar' ? '⬆' : '⬇';
      const info = document.createElement('div');
      info.className = 'pp-marea-it-info';
      const when = document.createElement('div');
      when.className = 'pp-marea-it-when';
      when.textContent = util.fmtDia(e.fecha) + ' · ' + util.fmtHora(e.fecha);
      const alt = document.createElement('div');
      alt.className = 'pp-marea-it-alt';
      alt.textContent = e.altura.toFixed(1) + ' m';
      info.append(when, alt);
      it.append(ico, info);
      grid.appendChild(it);
    });
    content.appendChild(grid);
  }

  return card;
}

function cardSolLuna(st, hoy) {
  const { card, content } = crearCard('Sol y solunar');
  const s = sol(hoy, st.spot.lat, st.spot.lon);
  const l = luna(hoy, st.spot.lat, st.spot.lon);
  const periodosDia = st.ctx.periodosDe(hoy);

  // Fila de datos: amanecer/ocaso a la izquierda, luna a la derecha
  const infoRow = document.createElement('div');
  infoRow.className = 'pp-sol-info-row';

  const solPart = document.createElement('div');
  const solLbl = document.createElement('div');
  solLbl.className = 'pp-sol-dato-lbl';
  solLbl.textContent = 'Amanecer · Ocaso';
  const solVal = document.createElement('div');
  solVal.className = 'pp-sol-dato-val';
  solVal.textContent =
    (s.amanecer ? util.fmtHora(s.amanecer) : '—') + '  ·  ' +
    (s.ocaso ? util.fmtHora(s.ocaso) : '—');
  solPart.append(solLbl, solVal);

  const lunaPart = document.createElement('div');
  lunaPart.style.textAlign = 'right';
  const lunaLbl = document.createElement('div');
  lunaLbl.className = 'pp-sol-dato-lbl';
  lunaLbl.textContent = l.nombre;
  const lunaVal = document.createElement('div');
  lunaVal.className = 'pp-sol-dato-val';
  lunaVal.textContent = l.iluminacion + '%' +
    (l.salida ? '  ·  ' + util.fmtHora(l.salida) : '');
  lunaPart.append(lunaLbl, lunaVal);

  infoRow.append(solPart, lunaPart);
  content.appendChild(infoRow);

  // Gráfico uPlot 24h: altitud sol + luna + bandas solunares
  const chart = document.createElement('pp-curva-solunar');
  const curva = curvaSolunar(hoy, st.spot.lat, st.spot.lon);
  chart.data = { ...curva, periodos: periodosDia, ahora: hoy.getTime() };
  content.appendChild(chart);

  // Chips de periodos solunares
  if (periodosDia.length) {
    const chips = document.createElement('div');
    chips.className = 'pp-solunar-chips';
    periodosDia.forEach(p => {
      const chip = document.createElement('span');
      chip.className = 'pp-tag' + (p.tipo === 'mayor' ? ' pp-tag-mayor' : '');
      chip.textContent =
        (p.tipo === 'mayor' ? '● ' : '○ ') +
        util.fmtHora(p.inicio) + '–' + util.fmtHora(p.fin);
      chips.appendChild(chip);
    });
    content.appendChild(chips);
  }

  return card;
}

function cardEspeciesAhora(st, fecha) {
  const { card, content } = crearCard('Especies activas ahora');
  const rank = especiesEn(fecha, st.ctx).slice(0, 6);
  rank.forEach(r => {
    const fila = document.createElement('div');
    fila.className = 'pp-esp-fila';

    const ico = espImgEl(r.especie, 'pp-esp-ico');

    const nombre = document.createElement('span');
    nombre.className = 'pp-esp-nombre';
    nombre.textContent = r.especie.nombre;

    const barra = document.createElement('div');
    barra.className = 'pp-barra pp-barra-esp';
    const rel = document.createElement('div');
    rel.className = 'pp-barra-rel';
    rel.style.width = r.act.valor + '%';
    rel.style.background = util.colorIndice(r.act.valor);
    barra.appendChild(rel);

    const val = document.createElement('span');
    val.className = 'pp-esp-val';
    val.textContent = r.act.valor;

    fila.append(ico, nombre, barra, val);
    content.appendChild(fila);
  });

  const nota = document.createElement('p');
  nota.className = 'pp-nota';
  nota.textContent = 'Actividad estimada por reglas (temporada, agua, mar, marea, luz, luna). Toca una especie para ver su ficha.';
  content.appendChild(nota);
  return card;
}
