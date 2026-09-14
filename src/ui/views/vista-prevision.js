/* Vista Previsión: mejores ventanas de pesca proximas (72h) + grafico de
   indice hora a hora navegable. Puerto 1:1 de www/js/ui.js:265-343
   (renderPrevision/motivoVentana/graficoHoras/modalDetalleHora) a Custom
   Elements/Ionic -- sin framework, solo createElement/textContent (nunca
   innerHTML con datos dinamicos: es la causa raiz del CRITICAL de XSS ya
   resuelto en el resto de la capa de presentacion, ver src/ui/util/escape.js).

   El modal de detalle de hora usa abrirModal() (src/ui/util/modal.js,
   sobre <ion-modal>) en vez del modal()/cerrarModal() a mano del original. */
import { util, WMO, MODOS } from '../../domain/config.js';
import { serie, mejoresVentanas, especiesEn } from '../../domain/indice.js';
import { abrirModal } from '../util/modal.js';

const NOMBRES_FACTOR = {
  viento: 'Viento', oleaje: 'Oleaje', marea: 'Marea', solunar: 'Solunar',
  momento: 'Momento del día', presion: 'Presión', cielo: 'Cielo',
  corriente: 'Corriente', sst: 'Tª agua'
};

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

  const titulo = document.createElement('h3');
  titulo.textContent = '🎯 Mejores ventanas (72 h)';
  card.appendChild(titulo);

  const vents = mejoresVentanas(st.ctx, st.modo);
  if (!vents.length) {
    const nota = document.createElement('p');
    nota.className = 'pp-nota';
    nota.textContent = 'No hay ventanas buenas (índice ≥ 55) en las próximas 72 h. Revisa el gráfico para ver lo menos malo.';
    card.appendChild(nota);
    return card;
  }

  const lista = document.createElement('ion-list');
  vents.forEach(v => lista.appendChild(filaVentana(v)));
  card.appendChild(lista);
  return card;
}

function filaVentana(v) {
  const item = document.createElement('ion-item');
  item.setAttribute('lines', 'none');

  const idx = document.createElement('div');
  idx.className = 'pp-vent-idx';
  idx.slot = 'start';
  idx.style.background = util.colorIndice(v.max);
  idx.textContent = String(v.max);
  item.appendChild(idx);

  const info = document.createElement('div');
  info.className = 'pp-vent-info';
  const rango = document.createElement('b');
  const finVentana = new Date(v.fin.getTime() + 3600e3);
  rango.textContent = util.fmtDia(v.inicio) + ' · ' + util.fmtHora(v.inicio) + '–' + util.fmtHora(finVentana);
  const motivo = document.createElement('span');
  motivo.textContent = motivoVentana(v);
  info.append(rango, motivo);
  item.appendChild(info);

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

  const titulo = document.createElement('h3');
  titulo.textContent = 'Índice hora a hora';
  card.appendChild(titulo);

  card.appendChild(graficoHoras(st));

  const nota = document.createElement('p');
  nota.className = 'pp-nota';
  nota.textContent = 'Toca una barra para ver el detalle de esa hora.';
  card.appendChild(nota);

  return card;
}

/* Barras a medida (no hay componente Ionic equivalente para esto):
   contenedor con scroll horizontal + una columna por hora, con la barra
   coloreada segun el indice/seguridad y la hora debajo. */
export function graficoHoras(st) {
  const wrap = document.createElement('div');
  wrap.className = 'pp-grafico-scroll';

  const inner = document.createElement('div');
  inner.className = 'pp-grafico';

  const s = serie(st.ctx, st.modo).slice(0, 96);
  let diaActual = null;
  s.forEach(x => {
    const d = x.hora.fecha;
    if (diaActual !== d.getDate()) {
      diaActual = d.getDate();
      const dia = document.createElement('div');
      dia.className = 'pp-graf-dia';
      dia.textContent = util.fmtDia(d);
      inner.appendChild(dia);
    }

    const col = document.createElement('div');
    col.className = 'pp-graf-col';

    const barra = document.createElement('div');
    barra.className = 'pp-graf-barra';
    barra.style.height = Math.max(4, x.valor) + '%';
    barra.style.background = x.seguridad.nivel === 'rojo' ? '#e03131' : util.colorIndice(x.valor);
    col.appendChild(barra);

    const hora = document.createElement('div');
    hora.className = 'pp-graf-hora';
    hora.textContent = String(d.getHours()).padStart(2, '0');
    col.appendChild(hora);

    col.addEventListener('click', () => modalDetalleHora(x, st));
    inner.appendChild(col);
  });

  wrap.appendChild(inner);
  return wrap;
}

function modalDetalleHora(x, st) {
  const d = x.hora;
  const cuerpo = document.createElement('div');

  const titulo = document.createElement('h3');
  titulo.textContent = util.fmtDia(d.fecha) + ' · ' + util.fmtHora(d.fecha) +
    ' — índice ' + x.valor + ' (' + util.etiquetaIndice(x.valor) + ')';
  cuerpo.appendChild(titulo);

  if (x.seguridad.nivel !== 'ok') {
    const banner = document.createElement('p');
    banner.className = 'pp-banner pp-banner-' + x.seguridad.nivel;
    banner.textContent = x.seguridad.motivos.join(' · ');
    cuerpo.appendChild(banner);
  }

  cuerpo.appendChild(listaFactores(x.factores, st.modo));

  const wmo = WMO[d.codigo] || ['—', ''];
  const resumen = document.createElement('p');
  resumen.textContent = wmo[1] + ' ' + wmo[0] + ' · 💨 ' + Math.round(d.viento || 0) + ' km/h · 🌊 ' +
    (d.ola != null ? d.ola.toFixed(1) : '—') + ' m · 🌡️ agua ' + (d.sst != null ? d.sst.toFixed(1) : '—') + '°C';
  cuerpo.appendChild(resumen);

  const rank = especiesEn(d.fecha, st.ctx).slice(0, 3);
  if (rank.length) {
    const especiesP = document.createElement('p');
    const etiqueta = document.createElement('b');
    etiqueta.textContent = 'Especies: ';
    especiesP.appendChild(etiqueta);
    especiesP.appendChild(document.createTextNode(
      rank.map(r => r.especie.icono + ' ' + r.especie.nombre + ' (' + r.act.valor + ')').join(' · ')
    ));
    cuerpo.appendChild(especiesP);
  }

  abrirModal(cuerpo);
}

/* Version simplificada de desgloseFactores() (www/js/ui.js:91-107): mismos
   datos (nombre + peso%) pero como ion-list/ion-item en vez de las barras
   .pp-barra a mano -- el modal ya viene con su propio scroll de ion-content. */
function listaFactores(f, modo) {
  const lista = document.createElement('ion-list');
  const pesos = MODOS[modo].pesos;
  Object.keys(pesos).sort((a, b) => pesos[b] - pesos[a]).forEach(k => {
    const v = f[k] != null ? f[k] : 0.5;
    const item = document.createElement('ion-item');
    item.setAttribute('lines', 'inset');

    const nombre = document.createElement('span');
    nombre.slot = 'start';
    nombre.textContent = NOMBRES_FACTOR[k] || k;
    item.appendChild(nombre);

    const valor = document.createElement('span');
    valor.slot = 'end';
    valor.textContent = Math.round(v * 100) + '%';
    item.appendChild(valor);

    lista.appendChild(item);
  });
  return lista;
}
