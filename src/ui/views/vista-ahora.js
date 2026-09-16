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
import { svg as icoSvg, wmoIconName } from '../../domain/iconos.js';
import { indiceHora, horaMasCercana, mejoresVentanas, especiesEn } from '../../domain/indice.js';
import { sol, luna, curvaSolunar } from '../../domain/solunar.js';
import { espImgEl } from '../../domain/especies.js';
import { abrirModalEspecie } from './vista-especies.js';
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
  contenedor.appendChild(cardSolLuna(st, ahora));
  contenedor.appendChild(condicionesActuales(h));
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

/* Selector de modalidad con chips (no ion-segment): solo re-emite el cambio
   como evento propio para que Fase 4 decida. */
function selectorModo(st) {
  const box = document.createElement('div');
  box.className = 'pp-modos';

  Object.values(MODOS).forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'pp-chip' + (st.modo === m.id ? ' activo' : '');
    btn.textContent = m.icono + ' ' + m.nombre;

    btn.addEventListener('click', () => {
      box.dispatchEvent(new CustomEvent('pp-cambiar-modo', {
        detail: { modo: m.id }, bubbles: true, composed: true
      }));
    });

    box.appendChild(btn);
  });

  return box;
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
  if (t <= -3) return ' ↓↓';
  if (t <= -1) return ' ↓';
  if (t < 1)   return ' →';
  if (t < 3)   return ' ↑';
  return ' ↑↑';
}

function condicionesActuales(h) {
  const { card, content } = crearCard('Condiciones ahora');
  const wmo = WMO[h.codigo] || ['—', ''];

  const grid = document.createElement('div');
  grid.className = 'pp-cond-grid';

  function cel(icoNombre, lbl, val) {
    const c = document.createElement('div');
    c.className = 'pp-cond';
    const ico = document.createElement('div');
    ico.className = 'pp-cond-ico';
    const svgEl = icoSvg(icoNombre);
    if (svgEl) ico.appendChild(svgEl);
    const lblEl = document.createElement('div');
    lblEl.className = 'pp-cond-lbl';
    lblEl.textContent = lbl;
    const valEl = document.createElement('div');
    valEl.className = 'pp-cond-val';
    valEl.textContent = val;
    c.append(ico, lblEl, valEl);
    return c;
  }

  grid.appendChild(cel(wmoIconName(h.codigo), wmo[0],
    h.temp != null ? Math.round(h.temp) + '°C' : '—'));
  grid.appendChild(cel('viento', 'Viento ' + util.gradosACardinal(h.vientoDir),
    h.viento != null ? Math.round(h.viento) + ' km/h (r. ' + (h.racha != null ? Math.round(h.racha) : '—') + ')' : '—'));
  grid.appendChild(cel('ola', 'Olas ' + util.gradosACardinal(h.olaDir),
    h.ola != null ? h.ola.toFixed(1) + ' m · ' + (h.olaPeriodo != null ? Math.round(h.olaPeriodo) + ' s' : '') : 'sin dato'));
  grid.appendChild(cel('termometro', 'Agua',
    h.sst != null ? h.sst.toFixed(1) + '°C' : 'sin dato'));
  grid.appendChild(cel('corriente', 'Corriente ' + util.gradosACardinal(h.corrienteDir),
    h.corriente != null ? h.corriente.toFixed(2) + ' m/s' : 'sin dato'));
  grid.appendChild(cel('presion', 'Presión',
    h.presion != null ? Math.round(h.presion) + ' hPa' + tendenciaTxt(h.presionTend) : '—'));
  grid.appendChild(cel('ojo', 'Visibilidad',
    h.visibilidad != null ? (h.visibilidad / 1000).toFixed(0) + ' km' : '—'));
  grid.appendChild(cel('gota', 'Precipitación',
    h.lluvia != null ? h.lluvia.toFixed(1) + ' mm' : '—'));

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

  // Línea 1: "↗ Subiendo · Pleamar a las 07:36 (en 5h 46m)"
  const tituloMarea = document.createElement('div');
  tituloMarea.className = 'pp-marea-titulo';
  const dirSpan = document.createElement('strong');
  dirSpan.style.color = '#ff7200';
  dirSpan.textContent = est.subiendo ? '↗ Subiendo' : '↘ Bajando';
  const tipoProx = prox.tipo === 'pleamar' ? 'Pleamar' : 'Bajamar';
  const horaSpan = document.createElement('strong');
  horaSpan.textContent = util.fmtHora(prox.fecha);
  tituloMarea.append(
    dirSpan,
    document.createTextNode(' · ' + tipoProx + ' a las '),
    horaSpan,
    document.createTextNode(' (en ' + hh + 'h ' + String(mm).padStart(2, '0') + 'm)')
  );
  content.appendChild(tituloMarea);

  // Línea 2: "● Mareas medias · amplitud 2.7 m · coef. ~67"
  if (m.amplitud) {
    const ampLine = document.createElement('div');
    ampLine.className = 'pp-marea-amp-line';
    const punto = document.createElement('span');
    punto.style.color = m.amplitud.color;
    punto.textContent = '●';
    ampLine.append(
      punto,
      document.createTextNode(
        ' ' + m.amplitud.etiqueta + ' · amplitud ' + m.amplitud.rango.toFixed(1) + ' m · coef. ~' + m.amplitud.coef
      )
    );
    content.appendChild(ampLine);
  }

  // Gráfico a ancho completo
  content.appendChild(curvaMareaEl(st));

  // Próximos extremos: pequeñas cards estilo legacy
  if (m.proximos?.length) {
    const prox = document.createElement('div');
    prox.className = 'pp-mareas-prox';
    m.proximos.slice(0, 4).forEach(e => {
      const item = document.createElement('div');
      item.className = 'pp-marea-item';

      const ico = document.createElement('span');
      ico.className = 'pp-marea-item-ico';
      ico.style.color = e.tipo === 'pleamar' ? '#ff7200' : 'var(--pp-texto2)';
      const icoEl = icoSvg(e.tipo === 'pleamar' ? 'flechaSube' : 'flechaBaja');
      if (icoEl) { icoEl.style.width = '14px'; icoEl.style.height = '14px'; ico.appendChild(icoEl); }

      const txt = document.createElement('span');
      txt.textContent =
        (e.tipo === 'pleamar' ? 'Pleamar' : 'Bajamar') + ' · ' +
        util.fmtDia(e.fecha) + ' ' + util.fmtHora(e.fecha) + ' · ' +
        e.altura.toFixed(1) + ' m';

      item.append(ico, txt);
      prox.appendChild(item);
    });
    content.appendChild(prox);
  }

  return card;
}

function cardSolLuna(st, hoy) {
  const { card, content } = crearCard('Sol y Luna');
  card.classList.add('pp-card-solunar-compact');

  const s = sol(hoy, st.spot.lat, st.spot.lon);
  const l = luna(hoy, st.spot.lat, st.spot.lon);
  const periodosDia = st.ctx.periodosDe(hoy);

  // Grid compacto: 4 items de sol/luna con iconos SVG
  const grid = document.createElement('div');
  grid.className = 'pp-cond-grid';

  function celSol(icoNombre, lbl, val) {
    const c = document.createElement('div');
    c.className = 'pp-cond';
    const icoEl = document.createElement('div');
    icoEl.className = 'pp-cond-ico';
    const svg = icoSvg(icoNombre);
    if (svg) icoEl.appendChild(svg);
    const lblEl = document.createElement('div');
    lblEl.className = 'pp-cond-lbl';
    lblEl.textContent = lbl;
    const valEl = document.createElement('div');
    valEl.className = 'pp-cond-val';
    valEl.textContent = val;
    c.append(icoEl, lblEl, valEl);
    return c;
  }

  grid.appendChild(celSol('amanecer', 'Amanecer', s.amanecer ? util.fmtHora(s.amanecer) : '—'));
  grid.appendChild(celSol('atardecer', 'Ocaso', s.ocaso ? util.fmtHora(s.ocaso) : '—'));
  grid.appendChild(celSol('lunaGenerica', l.nombre.split(' ')[0], l.iluminacion + '%'));
  grid.appendChild(celSol('sol', 'Salida/Puesta',
    (l.salida ? util.fmtHora(l.salida) : '—') + ' / ' + (l.puesta ? util.fmtHora(l.puesta) : '—')));

  content.appendChild(grid);

  // Gráfico compacto 24h
  const chart = document.createElement('pp-curva-solunar');
  chart.style.marginTop = '4px';
  const curva = curvaSolunar(hoy, st.spot.lat, st.spot.lon);
  chart.data = { ...curva, periodos: periodosDia, ahora: hoy.getTime() };
  content.appendChild(chart);

  // Periodos solunares en dos columnas: Mayor y Menor actividad
  if (periodosDia.length) {
    const mayorPeriodos = periodosDia.filter(p => p.tipo === 'mayor');
    const menorPeriodos = periodosDia.filter(p => p.tipo === 'menor');

    // Subtítulo encima de las columnas
    const subtitle = document.createElement('div');
    subtitle.className = 'pp-solunar-subtitle';
    subtitle.textContent = 'Períodos solunares';
    content.appendChild(subtitle);

    const solunares = document.createElement('div');
    solunares.className = 'pp-solunar-cols';

    // Columna Mayor Actividad
    if (mayorPeriodos.length) {
      const colMayor = document.createElement('div');
      colMayor.className = 'pp-solunar-col';
      const tMayor = document.createElement('div');
      tMayor.className = 'pp-solunar-col-header';
      tMayor.textContent = '★ Mayor actividad';
      colMayor.appendChild(tMayor);
      mayorPeriodos.forEach(p => {
        const row = document.createElement('div');
        row.className = 'pp-solunar-row pp-solunar-major';
        row.textContent = util.fmtHora(p.inicio) + ' – ' + util.fmtHora(p.fin);
        colMayor.appendChild(row);
      });
      solunares.appendChild(colMayor);
    }

    // Columna Menor Actividad
    if (menorPeriodos.length) {
      const colMenor = document.createElement('div');
      colMenor.className = 'pp-solunar-col';
      const tMenor = document.createElement('div');
      tMenor.className = 'pp-solunar-col-header';
      tMenor.textContent = '☆ Menor actividad';
      colMenor.appendChild(tMenor);
      menorPeriodos.forEach(p => {
        const row = document.createElement('div');
        row.className = 'pp-solunar-row pp-solunar-minor';
        row.textContent = util.fmtHora(p.inicio) + ' – ' + util.fmtHora(p.fin);
        colMenor.appendChild(row);
      });
      solunares.appendChild(colMenor);
    }

    content.appendChild(solunares);
  }

  return card;
}

function cardEspeciesAhora(st, fecha) {
  const { card, content } = crearCard('Especies activas ahora');
  const rank = especiesEn(fecha, st.ctx).slice(0, 4);
  rank.forEach(r => {
    const fila = document.createElement('div');
    fila.className = 'pp-esp-fila';
    fila.addEventListener('click', () => abrirModalEspecie(r.especie, st));

    const ico = espImgEl(r.especie, 'pp-esp-ico');

    const info = document.createElement('div');
    info.className = 'pp-esp-info';

    const nombre = document.createElement('span');
    nombre.className = 'pp-esp-nombre';
    nombre.textContent = r.especie.nombre;

    const motivo = document.createElement('span');
    motivo.className = 'pp-esp-motivo';
    motivo.textContent = r.act.motivo;

    info.append(nombre, motivo);

    const val = document.createElement('span');
    val.className = 'pp-esp-val';
    val.textContent = r.act.valor;
    val.style.color = util.colorIndice(r.act.valor);

    fila.append(ico, info, val);
    content.appendChild(fila);
  });

  const verTodas = document.createElement('p');
  verTodas.className = 'pp-esp-ver-todas';
  verTodas.textContent = 'Ver todas →';
  verTodas.addEventListener('click', () => {
    verTodas.dispatchEvent(new CustomEvent('pp-cambiar-vista', {
      detail: { vista: 'especies' }, bubbles: true, composed: true
    }));
  });
  content.appendChild(verTodas);
  return card;
}
