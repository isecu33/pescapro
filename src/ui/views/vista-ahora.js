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
import { indiceHora, horaMasCercana, especiesEn } from '../../domain/indice.js';
import { sol, luna } from '../../domain/solunar.js';
import '../components/pp-gauge.js';
import '../components/pp-curva-marea.js';

const NOMBRES_FACTOR = {
  viento: 'Viento', oleaje: 'Oleaje', marea: 'Marea', solunar: 'Solunar',
  momento: 'Momento del día', presion: 'Presión', cielo: 'Cielo', corriente: 'Corriente', sst: 'Tª agua'
};

const VENTANA_CURVA_ANTES_H = 6;
const VENTANA_CURVA_DESPUES_H = 30;

export function renderAhora(contenedor, st) {
  contenedor.replaceChildren();

  if (!st.ctx) {
    contenedor.appendChild(elCargando());
    return;
  }

  const ahora = new Date();
  const h = horaMasCercana(st.datos.horas, ahora);
  const idx = indiceHora(h, st.modo, st.ctx);

  contenedor.appendChild(bannerSeguridad(idx.seguridad));
  contenedor.appendChild(selectorModo(st));
  contenedor.appendChild(cardIndice(idx, st));
  contenedor.appendChild(desgloseFactores(idx.factores, st.modo));
  contenedor.appendChild(condicionesActuales(h));
  contenedor.appendChild(cardMarea(st));
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

function cardIndice(idx, st) {
  const card = document.createElement('ion-card');
  const content = document.createElement('ion-card-content');
  content.className = 'pp-card-indice';

  const gauge = document.createElement('pp-gauge');
  gauge.value = idx.valor;
  content.appendChild(gauge);

  const info = document.createElement('div');
  info.className = 'pp-indice-info';
  const etiqueta = document.createElement('div');
  etiqueta.className = 'pp-indice-etiqueta';
  etiqueta.textContent = util.etiquetaIndice(idx.valor);
  const sub = document.createElement('div');
  sub.className = 'pp-indice-sub';
  sub.textContent = MODOS[st.modo].icono + ' ' + MODOS[st.modo].nombre + ' · ahora';
  info.append(etiqueta, sub);
  content.appendChild(info);

  card.appendChild(content);
  return card;
}

function crearCard(titulo) {
  const card = document.createElement('ion-card');
  const header = document.createElement('ion-card-header');
  const title = document.createElement('ion-card-title');
  title.textContent = titulo;
  header.appendChild(title);
  const content = document.createElement('ion-card-content');
  card.append(header, content);
  return { card, content };
}

function itemCondicion(icono, etiqueta, valor) {
  const it = document.createElement('div');
  it.className = 'pp-cond';
  const ico = document.createElement('div');
  ico.className = 'pp-cond-ico';
  ico.textContent = icono;
  const lbl = document.createElement('div');
  lbl.className = 'pp-cond-lbl';
  lbl.textContent = etiqueta;
  const val = document.createElement('div');
  val.className = 'pp-cond-val';
  val.textContent = valor;
  it.append(ico, lbl, val);
  return it;
}

function desgloseFactores(f, modo) {
  const { card, content } = crearCard('Qué suma y qué resta');
  const pesos = MODOS[modo].pesos;
  Object.keys(pesos).sort((a, b) => pesos[b] - pesos[a]).forEach(k => {
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
    rel.style.background = v >= 0.7 ? 'var(--verde)' : v >= 0.45 ? 'var(--ambar)' : 'var(--rojo)';
    barra.appendChild(rel);
    fila.appendChild(barra);

    const peso = document.createElement('span');
    peso.className = 'pp-factor-peso';
    peso.textContent = Math.round(pesos[k] * 100) + '%';
    fila.appendChild(peso);

    content.appendChild(fila);
  });

  const nota = document.createElement('p');
  nota.className = 'pp-nota';
  nota.textContent = 'El % es el peso del factor en el índice para esta modalidad.';
  content.appendChild(nota);
  return card;
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
  const items = [
    [wmo[1], wmo[0], h.temp != null ? Math.round(h.temp) + '°C' : '—'],
    ['💨', 'Viento ' + util.gradosACardinal(h.vientoDir), h.viento != null ? Math.round(h.viento) + ' km/h (rachas ' + (h.racha != null ? Math.round(h.racha) : '—') + ')' : '—'],
    ['🌊', 'Olas ' + util.gradosACardinal(h.olaDir), h.ola != null ? h.ola.toFixed(1) + ' m · ' + (h.olaPeriodo != null ? Math.round(h.olaPeriodo) + ' s' : '') : 'sin dato'],
    ['🌡️', 'Agua', h.sst != null ? h.sst.toFixed(1) + '°C' : 'sin dato'],
    ['🧭', 'Corriente', h.corriente != null ? h.corriente.toFixed(2) + ' m/s hacia ' + util.gradosACardinal(h.corrienteDir) : 'sin dato'],
    ['📉', 'Presión', h.presion != null ? Math.round(h.presion) + ' hPa ' + tendenciaTxt(h.presionTend) : '—'],
    ['👁️', 'Visibilidad', h.visibilidad != null ? (h.visibilidad / 1000).toFixed(0) + ' km' : '—'],
    ['🌧️', 'Precipitación', h.lluvia != null ? h.lluvia.toFixed(1) + ' mm' : '—']
  ];
  const grid = document.createElement('div');
  grid.className = 'pp-cond-grid';
  items.forEach(([ic, lbl, val]) => grid.appendChild(itemCondicion(ic, lbl, val)));
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
  const m = st.ctx.mareas;

  if (!m.ahora) {
    const nota = document.createElement('p');
    nota.className = 'pp-nota';
    nota.textContent = 'Sin datos de marea para este punto (¿demasiado lejos del mar?).';
    content.appendChild(nota);
    return card;
  }

  const est = m.ahora;
  const prox = est.siguiente;
  const resta = Math.max(0, prox.fecha - Date.now());
  const hh = Math.floor(resta / 3600e3);
  const mm = Math.round((resta % 3600e3) / 60000);

  const linea = document.createElement('div');
  linea.className = 'pp-marea-linea';
  const flecha = document.createElement('b');
  flecha.textContent = est.subiendo ? '↗ Subiendo' : '↘ Bajando';
  linea.appendChild(flecha);
  linea.appendChild(document.createTextNode(
    ' · ' + (prox.tipo === 'pleamar' ? 'Pleamar' : 'Bajamar') + ' a las '
  ));
  const horaB = document.createElement('b');
  horaB.textContent = util.fmtHora(prox.fecha);
  linea.appendChild(horaB);
  linea.appendChild(document.createTextNode(' (en ' + hh + 'h ' + String(mm).padStart(2, '0') + 'm)'));
  content.appendChild(linea);

  if (m.amplitud) {
    const amp = document.createElement('div');
    amp.className = 'pp-marea-amp';
    const punto = document.createElement('span');
    punto.style.color = m.amplitud.color;
    punto.textContent = '●';
    amp.appendChild(punto);
    amp.appendChild(document.createTextNode(
      ' ' + m.amplitud.etiqueta + ' · amplitud ' + m.amplitud.rango.toFixed(1) + ' m · coef. ~' + m.amplitud.coef
    ));
    content.appendChild(amp);
  }

  content.appendChild(curvaMareaEl(st));

  const tabla = document.createElement('div');
  tabla.className = 'pp-mareas-prox';
  m.proximos.forEach(e => {
    const item = document.createElement('div');
    item.className = 'pp-marea-item';
    item.textContent = (e.tipo === 'pleamar' ? '⬆ Pleamar' : '⬇ Bajamar') + ' · ' +
      util.fmtDia(e.fecha) + ' ' + util.fmtHora(e.fecha) + ' · ' + e.altura.toFixed(1) + ' m';
    tabla.appendChild(item);
  });
  content.appendChild(tabla);

  const nota = document.createElement('p');
  nota.className = 'pp-nota';
  nota.textContent = 'Media marea = máxima corriente = máxima actividad. Las horas de pleamar/bajamar proceden del modelo global; contrasta con las tablas oficiales de tu puerto.';
  content.appendChild(nota);
  return card;
}

function cardSolLuna(st, hoy) {
  const { card, content } = crearCard('Sol, luna y solunar');
  const s = sol(hoy, st.spot.lat, st.spot.lon);
  const l = luna(hoy, st.spot.lat, st.spot.lon);

  const grid = document.createElement('div');
  grid.className = 'pp-cond-grid';
  const items = [
    ['🌅', 'Amanecer', s.amanecer ? util.fmtHora(s.amanecer) : '—'],
    ['🌇', 'Ocaso', s.ocaso ? util.fmtHora(s.ocaso) : '—'],
    [l.icono, l.nombre, l.iluminacion + '%'],
    ['🌙', 'Luna sale/pone', (l.salida ? util.fmtHora(l.salida) : '—') + ' / ' + (l.puesta ? util.fmtHora(l.puesta) : '—')]
  ];
  items.forEach(([ic, lbl, val]) => grid.appendChild(itemCondicion(ic, lbl, val)));
  content.appendChild(grid);

  const periodosDia = st.ctx.periodosDe(hoy);
  const solunarDiv = document.createElement('div');
  solunarDiv.className = 'pp-solunar';
  const titulo = document.createElement('b');
  titulo.textContent = 'Periodos solunares hoy:';
  solunarDiv.append(titulo, document.createElement('br'));
  if (periodosDia.length === 0) {
    solunarDiv.appendChild(document.createTextNode('—'));
  } else {
    periodosDia.forEach((p, i) => {
      const tag = document.createElement('span');
      tag.className = 'pp-tag' + (p.tipo === 'mayor' ? ' pp-tag-mayor' : '');
      tag.textContent = (p.tipo === 'mayor' ? '★ ' : '☆ ') + util.fmtHora(p.inicio) + '–' + util.fmtHora(p.fin);
      solunarDiv.appendChild(tag);
      if (i < periodosDia.length - 1) solunarDiv.appendChild(document.createTextNode(' '));
    });
  }
  content.appendChild(solunarDiv);

  const nota = document.createElement('p');
  nota.className = 'pp-nota';
  nota.textContent = '★ mayores (tránsito lunar) · ☆ menores (orto/ocaso lunar). Coincidiendo con amanecer/atardecer o media marea multiplican las opciones.';
  content.appendChild(nota);
  return card;
}

function cardEspeciesAhora(st, fecha) {
  const { card, content } = crearCard('Especies activas ahora');
  const rank = especiesEn(fecha, st.ctx).slice(0, 6);
  rank.forEach(r => {
    const fila = document.createElement('div');
    fila.className = 'pp-esp-fila';

    const ico = document.createElement('span');
    ico.className = 'pp-esp-ico';
    ico.textContent = r.especie.icono;

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
