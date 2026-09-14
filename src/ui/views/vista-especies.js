/* Vista Especies -- grid de tarjetas con la actividad actual (0..100) de
   cada especie del Cantabrico, y un modal de ficha completa al pulsar una.

   Reemplaza renderEspecies()/modalEspecie() de www/js/ui.js:347-408. Alli
   el modal se montaba con `cuerpo.appendChild(el('h3', null, '... <small>...'))`
   y variantes que inyectaban HTML (`'<b>' + k + ':</b> ' + v`) via innerHTML
   -- inocuo hoy porque todos los datos vienen del dominio propio (ESPECIES,
   nunca de usuario), pero se reescribe con createElement/textContent para
   mantener consistencia con el resto de la migracion (ver pp-captura-card.js,
   que si corrige un CRITICAL real de XSS con datos de usuario).

   API: renderEspecies(contenedor, st) -- limpia `contenedor` y lo reconstruye
   por completo, igual que hacian las demas renderX(st) originales con
   `cont.innerHTML = ''`. */
import { especiesEn, mejoresHorasEspecie } from '../../domain/indice.js';
import { util } from '../../domain/config.js';
import { abrirModal } from '../util/modal.js';

const MESES_INICIALES = 'EFMAMJJASOND';
const HORIZONTE_MEJORES_HORAS = 72;
const UMBRAL_MEJORES_HORAS = 30;

export function renderEspecies(contenedor, st) {
  contenedor.textContent = '';

  if (!st.ctx) {
    contenedor.appendChild(crearCargando());
    return;
  }

  const rank = especiesEn(new Date(), st.ctx);

  const nota = document.createElement('p');
  nota.className = 'pp-nota pp-pad';
  nota.textContent = 'Actividad estimada AHORA en tu spot. Toca una especie para ver ficha completa, temporada y mejores horas.';
  contenedor.appendChild(nota);

  const grid = document.createElement('div');
  grid.className = 'pp-esp-grid';
  rank.forEach(r => grid.appendChild(crearTarjeta(r, st)));
  contenedor.appendChild(grid);
}

function crearCargando() {
  const div = document.createElement('div');
  div.className = 'pp-cargando';
  div.textContent = 'Cargando…';
  return div;
}

function crearTarjeta(r, st) {
  const card = document.createElement('ion-card');
  card.className = 'pp-esp-card';
  card.setAttribute('button', 'true');

  const content = document.createElement('ion-card-content');

  const ico = document.createElement('div');
  ico.className = 'pp-esp-card-ico';
  ico.textContent = r.especie.icono;

  const nombre = document.createElement('div');
  nombre.className = 'pp-esp-card-nombre';
  nombre.textContent = r.especie.nombre;

  const valor = document.createElement('div');
  valor.className = 'pp-esp-card-val';
  valor.textContent = String(r.act.valor);
  valor.style.color = util.colorIndice(r.act.valor);

  const motivo = document.createElement('div');
  motivo.className = 'pp-esp-card-motivo';
  motivo.textContent = r.act.motivo;

  content.append(ico, nombre, valor, motivo);
  card.appendChild(content);
  card.addEventListener('click', () => abrirModalEspecie(r.especie, st));
  return card;
}

function abrirModalEspecie(esp, st) {
  const cuerpo = document.createElement('div');

  const titulo = document.createElement('h3');
  titulo.append(esp.icono + ' ' + esp.nombre + ' ');
  const cientifico = document.createElement('small');
  cientifico.textContent = '(' + esp.cientifico + ')';
  titulo.appendChild(cientifico);
  cuerpo.appendChild(titulo);

  const cabeceraTemporada = document.createElement('div');
  cabeceraTemporada.className = 'pp-campo';
  const bTemporada = document.createElement('b');
  bTemporada.textContent = 'Temporada';
  cabeceraTemporada.appendChild(bTemporada);
  cuerpo.appendChild(cabeceraTemporada);
  cuerpo.appendChild(crearHeatmapMensual(esp));

  camposFicha(esp).forEach(([etiqueta, valor]) => cuerpo.appendChild(crearCampo(etiqueta, valor)));

  if (st.ctx) cuerpo.appendChild(crearMejoresHoras(esp, st.ctx));

  abrirModal(cuerpo);
}

function camposFicha(esp) {
  return [
    ['📍 Zonas', esp.zonas],
    ['🎣 Técnicas', esp.tecnicas],
    ['🪱 Cebos/señuelos', esp.cebos],
    ['🌡️ Agua óptima', esp.sst[1] + '–' + esp.sst[2] + ' °C'],
    ['🌊 Mar óptimo', esp.oleaje[1] + '–' + esp.oleaje[2] + ' m'],
    ['📏 Talla mínima', tallaMinTexto(esp)],
    ['💡 Consejo', esp.notas]
  ];
}

function tallaMinTexto(esp) {
  if (esp.tallaMin) return esp.tallaMin + ' cm (orientativa: verifica la normativa de tu comunidad)';
  if (esp.pesoMin) return esp.pesoMin + ' kg mínimo (orientativo)';
  return 'Consulta la normativa local';
}

function crearCampo(etiqueta, valor) {
  const div = document.createElement('div');
  div.className = 'pp-campo';
  const b = document.createElement('b');
  b.textContent = etiqueta + ':';
  div.appendChild(b);
  div.append(' ' + valor);
  return div;
}

function crearHeatmapMensual(esp) {
  const heat = document.createElement('div');
  heat.className = 'pp-heat';
  const mesActual = new Date().getMonth();
  esp.meses.forEach((v, i) => {
    const celda = document.createElement('div');
    celda.className = 'pp-heat-celda';
    celda.textContent = MESES_INICIALES[i];
    celda.style.background = 'rgba(47,179,68,' + (v * 0.85) + ')';
    if (i === mesActual) celda.classList.add('pp-heat-actual');
    heat.appendChild(celda);
  });
  return heat;
}

function crearMejoresHoras(esp, ctx) {
  const cont = document.createElement('div');

  const cabecera = document.createElement('div');
  cabecera.className = 'pp-campo';
  const b = document.createElement('b');
  b.textContent = '⏰ Mejores momentos (72 h):';
  cabecera.appendChild(b);
  cont.appendChild(cabecera);

  const mejores = mejoresHorasEspecie(esp, ctx, HORIZONTE_MEJORES_HORAS)
    .filter(m => m.act.valor >= UMBRAL_MEJORES_HORAS);

  if (!mejores.length) {
    const p = document.createElement('p');
    p.className = 'pp-nota';
    p.textContent = 'Sin buenos momentos previstos. Probablemente fuera de temporada o mal estado del mar.';
    cont.appendChild(p);
    return cont;
  }

  mejores.forEach(m => cont.appendChild(crearFilaMejorHora(m)));
  return cont;
}

function crearFilaMejorHora(m) {
  const fila = document.createElement('div');
  fila.className = 'pp-mejor-hora';

  const punto = document.createElement('span');
  punto.style.color = util.colorIndice(m.act.valor);
  punto.textContent = '●';
  fila.appendChild(punto);

  fila.append(' ' + util.fmtDia(m.hora.fecha) + ' ' + util.fmtHora(m.hora.fecha) + ' — actividad ' + m.act.valor);
  return fila;
}
