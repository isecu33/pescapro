/* Vista Previsión: mejores ventanas de pesca proximas (72h) + grafico de
   indice hora a hora navegable. Puerto 1:1 de www/js/ui.js:265-343
   (renderPrevision/motivoVentana/graficoHoras/modalDetalleHora) a Custom
   Elements/Ionic -- sin framework, solo createElement/textContent (nunca
   innerHTML con datos dinamicos: es la causa raiz del CRITICAL de XSS ya
   resuelto en el resto de la capa de presentacion, ver src/ui/util/escape.js).

   El modal de detalle de hora usa abrirModal() (src/ui/util/modal.js,
   sobre <ion-modal>) en vez del modal()/cerrarModal() a mano del original. */
import { util, MODOS } from '../../domain/config.js';
import { serie, mejoresVentanas, especiesEn } from '../../domain/indice.js';
import { abrirModal } from '../util/modal.js';
import { svg, WMO_ICO } from '../util/icons.js';
import { espImgEl } from '../../domain/especies.js';

const ESCALA_INDICE = [
  { min: 70, etiqueta: 'Excelente' },
  { min: 50, etiqueta: 'Bueno' },
  { min: 35, etiqueta: 'Regular' },
  { min: 20, etiqueta: 'Flojo' },
  { min: 0,  etiqueta: 'Malo' }
];

const NOMBRES_FACTOR = {
  viento: 'Viento', oleaje: 'Oleaje', marea: 'Marea', solunar: 'Solunar',
  momento: 'Momento del día', presion: 'Presión', cielo: 'Cielo',
  corriente: 'Corriente', sst: 'Tª agua'
};

/* Cabecera de tarjeta con icono + título, consistente entre las dos tarjetas
   de la vista (evita el emoji suelto que llevaba el título original). */
function tituloConIcono(cat, texto) {
  const titulo = document.createElement('h3');
  titulo.className = 'pp-card-titulo';
  titulo.appendChild(svg(cat, 15));
  titulo.appendChild(document.createTextNode(texto));
  return titulo;
}

export function renderPrevision(contenedor, st) {
  contenedor.textContent = '';
  if (!st.ctx) {
    const cargando = document.createElement('div');
    cargando.className = 'pp-cargando';
    cargando.textContent = 'Cargando…';
    contenedor.appendChild(cargando);
    return;
  }
  contenedor.appendChild(cardVentanas(st));
  contenedor.appendChild(cardGrafico(st));
}

function cardVentanas(st) {
  const card = document.createElement('div');
  card.className = 'pp-card';

  card.appendChild(tituloConIcono('diana', 'Mejores ventanas (72 h)'));

  const vents = mejoresVentanas(st.ctx, st.modo);
  if (!vents.length) {
    const vacio = document.createElement('div');
    vacio.className = 'pp-vent-vacio';
    const icono = document.createElement('div');
    icono.className = 'pp-vent-vacio-ico';
    icono.appendChild(svg('lluvia', 34));
    const msg = document.createElement('p');
    msg.textContent = 'Sin ventanas buenas en 72 h';
    const sub = document.createElement('span');
    sub.textContent = 'Revisa el gráfico para ver lo menos malo.';
    vacio.append(icono, msg, sub);
    card.appendChild(vacio);
    return card;
  }

  const lista = document.createElement('div');
  lista.className = 'pp-vent-lista';
  vents.forEach(v => lista.appendChild(filaVentana(v)));
  card.appendChild(lista);
  return card;
}

function filaVentana(v) {
  const item = document.createElement('div');
  item.className = 'pp-ventana';

  const idx = document.createElement('div');
  idx.className = 'pp-ventana-idx';
  idx.style.background = util.colorIndice(v.max);
  idx.textContent = String(v.max);
  item.appendChild(idx);

  const info = document.createElement('div');
  info.className = 'pp-ventana-info';

  const rango = document.createElement('div');
  rango.className = 'pp-ventana-rango';
  const finVentana = new Date(v.fin.getTime() + 3600e3);
  rango.textContent = util.fmtDia(v.inicio) + ' · ' + util.fmtHora(v.inicio) + '–' + util.fmtHora(finVentana);
  info.appendChild(rango);

  const motivo = document.createElement('div');
  motivo.className = 'pp-ventana-motivo';
  motivo.textContent = motivoVentana(v);
  info.appendChild(motivo);

  item.appendChild(info);

  const etiq = document.createElement('div');
  etiq.className = 'pp-ventana-etiq';
  etiq.textContent = util.etiquetaIndice(v.max);
  item.appendChild(etiq);

  return item;
}

export function motivoVentana(v) {
  const f = v.mejorHora.factores;
  const razones = [];
  if (f.momento >= 0.9) razones.push(v.mejorHora.momento === 'noche' ? 'noche' : 'cambio de luz');
  if (f.marea >= 0.8) razones.push('marea en movimiento');
  if (f.solunar >= 0.9) razones.push('periodo solunar mayor');
  if (f.oleaje >= 0.9) razones.push('mar ideal');
  if (f.presion >= 0.9) razones.push('presión bajando');
  return razones.length ? 'Suma: ' + razones.join(' + ') : 'Condiciones equilibradas';
}

function cardGrafico(st) {
  const card = document.createElement('div');
  card.className = 'pp-card';

  const cabecera = document.createElement('div');
  cabecera.className = 'pp-graf-cabecera';
  cabecera.appendChild(tituloConIcono('nube-sol', 'Índice hora a hora'));
  const nota = document.createElement('span');
  nota.className = 'pp-graf-nota-tap';
  nota.textContent = 'Toca una barra';
  cabecera.appendChild(nota);
  card.appendChild(cabecera);

  card.appendChild(leyendaIndice());
  card.appendChild(graficoHoras(st));

  return card;
}

/* Explica qué significa el color de cada barra: sin esto el gráfico es
   ilegible para quien no conoce la escala 0-100 del índice. */
function leyendaIndice() {
  const fila = document.createElement('div');
  fila.className = 'pp-graf-leyenda';
  ESCALA_INDICE.forEach(nivel => {
    const item = document.createElement('span');
    item.className = 'pp-graf-leyenda-item';
    const punto = document.createElement('i');
    punto.style.background = util.colorIndice(nivel.min);
    item.appendChild(punto);
    item.appendChild(document.createTextNode(nivel.etiqueta));
    fila.appendChild(item);
  });
  const aviso = document.createElement('span');
  aviso.className = 'pp-graf-leyenda-item pp-graf-leyenda-aviso';
  const puntoAviso = document.createElement('i');
  puntoAviso.style.background = '#e03131';
  aviso.appendChild(puntoAviso);
  aviso.appendChild(document.createTextNode('Aviso de seguridad'));
  fila.appendChild(aviso);
  return fila;
}

/* Barras a medida: scroll horizontal + columna por hora, coloreada segun
   indice/seguridad. Etiqueta de hora solo cada 3h para no saturar. */
export function graficoHoras(st) {
  const wrap = document.createElement('div');
  wrap.className = 'pp-grafico-scroll';

  const inner = document.createElement('div');
  inner.className = 'pp-grafico';

  const s = serie(st.ctx, st.modo).slice(0, 96);
  let diaActual = null;
  s.forEach(x => {
    const d = x.hora.fecha;
    const hora = d.getHours();

    if (diaActual !== d.getDate()) {
      diaActual = d.getDate();
      const sep = document.createElement('div');
      sep.className = 'pp-graf-sep-dia';
      const etiq = document.createElement('span');
      etiq.textContent = util.fmtDia(d);
      sep.appendChild(etiq);
      inner.appendChild(sep);
    }

    const col = document.createElement('div');
    col.className = 'pp-graf-col';
    col.title = util.fmtHora(d) + ' · ' + x.valor;

    const barra = document.createElement('div');
    barra.className = 'pp-graf-barra';
    barra.style.height = Math.max(4, x.valor) + '%';
    barra.style.background = x.seguridad.nivel === 'rojo' ? '#e03131' : util.colorIndice(x.valor);
    col.appendChild(barra);

    const etiqHora = document.createElement('div');
    etiqHora.className = 'pp-graf-hora';
    /* solo marca cada 3 horas; el resto queda en blanco para no saturar */
    etiqHora.textContent = hora % 3 === 0 ? String(hora).padStart(2, '0') : '';
    col.appendChild(etiqHora);

    col.addEventListener('click', () => modalDetalleHora(x, st));
    inner.appendChild(col);
  });

  wrap.appendChild(inner);
  return wrap;
}

function modalDetalleHora(x, st) {
  const d = x.hora;
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-modal-prevision';

  const cabecera = document.createElement('div');
  cabecera.className = 'pp-modal-cab';

  const idx = document.createElement('div');
  idx.className = 'pp-modal-idx';
  idx.style.background = x.seguridad.nivel === 'rojo' ? '#e03131' : util.colorIndice(x.valor);
  idx.textContent = String(x.valor);
  cabecera.appendChild(idx);

  const meta = document.createElement('div');
  const titulo = document.createElement('h3');
  titulo.textContent = util.fmtDia(d.fecha) + ' · ' + util.fmtHora(d.fecha);
  const etiq = document.createElement('span');
  etiq.className = 'pp-modal-etiq';
  etiq.textContent = util.etiquetaIndice(x.valor);
  meta.append(titulo, etiq);
  cabecera.appendChild(meta);
  cuerpo.appendChild(cabecera);

  if (x.seguridad.nivel !== 'ok') {
    const banner = document.createElement('p');
    banner.className = 'pp-banner pp-banner-' + x.seguridad.nivel;
    banner.textContent = x.seguridad.motivos.join(' · ');
    cuerpo.appendChild(banner);
  }

  const secFactores = document.createElement('div');
  secFactores.className = 'pp-modal-sec';
  const titFactores = document.createElement('p');
  titFactores.className = 'pp-modal-sec-titulo';
  titFactores.textContent = 'Factores';
  secFactores.appendChild(titFactores);
  secFactores.appendChild(barrasFactores(x.factores, st.modo));
  cuerpo.appendChild(secFactores);

  const wmo = WMO_ICO[d.codigo] || { texto: '—', cat: 'nube-sol' };
  const secMeteoTitulo = document.createElement('p');
  secMeteoTitulo.className = 'pp-modal-sec-titulo';
  secMeteoTitulo.textContent = 'Condiciones';
  const secMeteo = document.createElement('div');
  secMeteo.className = 'pp-modal-sec pp-modal-meteo';
  secMeteo.appendChild(secMeteoTitulo);

  const filaMeteo = document.createElement('div');
  filaMeteo.className = 'pp-modal-meteo-fila';
  const datosMeteo = [
    { cat: wmo.cat, val: wmo.texto },
    { cat: 'viento', val: Math.round(d.viento || 0) + ' km/h' },
    { cat: 'ola', val: (d.ola != null ? d.ola.toFixed(1) : '—') + ' m' },
    { cat: 'termometro', val: (d.sst != null ? d.sst.toFixed(1) : '—') + '°C' },
  ];
  datosMeteo.forEach(({ cat, val }) => {
    const chip = document.createElement('div');
    chip.className = 'pp-meteo-chip';
    const icoEl = document.createElement('span');
    icoEl.className = 'pp-meteo-ico';
    icoEl.appendChild(svg(cat, 16));
    const valEl = document.createElement('span');
    valEl.textContent = val;
    chip.append(icoEl, valEl);
    filaMeteo.appendChild(chip);
  });
  secMeteo.appendChild(filaMeteo);
  cuerpo.appendChild(secMeteo);

  const rank = especiesEn(d.fecha, st.ctx).slice(0, 3);
  if (rank.length) {
    const secEsp = document.createElement('div');
    secEsp.className = 'pp-modal-sec';
    const titEsp = document.createElement('p');
    titEsp.className = 'pp-modal-sec-titulo';
    titEsp.textContent = 'Especies activas';
    secEsp.appendChild(titEsp);
    const fila = document.createElement('div');
    fila.className = 'pp-modal-especies';
    rank.forEach(r => {
      const chip = document.createElement('div');
      chip.className = 'pp-esp-chip';
      const ico = espImgEl(r.especie, 'pp-esp-ico');
      const nombre = document.createElement('span');
      nombre.className = 'pp-esp-chip-nombre';
      nombre.textContent = r.especie.nombre;
      const act = document.createElement('span');
      act.className = 'pp-esp-chip-act';
      act.textContent = String(r.act.valor);
      chip.append(ico, nombre, act);
      fila.appendChild(chip);
    });
    secEsp.appendChild(fila);
    cuerpo.appendChild(secEsp);
  }

  abrirModal(cuerpo);
}

/* Barras visuales de factores (como .pp-factor/.pp-barra del resto de la app)
   en vez de ion-list con texto plano. */
function barrasFactores(f, modo) {
  const wrap = document.createElement('div');
  wrap.className = 'pp-factores-wrap';
  const pesos = MODOS[modo].pesos;
  Object.keys(pesos).sort((a, b) => pesos[b] - pesos[a]).forEach(k => {
    const v = f[k] != null ? f[k] : 0.5;
    const pct = Math.round(v * 100);

    const fila = document.createElement('div');
    fila.className = 'pp-factor';

    const nombre = document.createElement('span');
    nombre.className = 'pp-factor-nombre';
    nombre.textContent = NOMBRES_FACTOR[k] || k;
    fila.appendChild(nombre);

    const barraWrap = document.createElement('div');
    barraWrap.className = 'pp-barra';
    const barraRel = document.createElement('div');
    barraRel.className = 'pp-barra-rel';
    barraRel.style.width = pct + '%';
    barraRel.style.background = util.colorIndice(pct);
    barraWrap.appendChild(barraRel);
    fila.appendChild(barraWrap);

    const valor = document.createElement('span');
    valor.className = 'pp-factor-val';
    valor.textContent = pct + '%';
    fila.appendChild(valor);

    wrap.appendChild(fila);
  });
  return wrap;
}
