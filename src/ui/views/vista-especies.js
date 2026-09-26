/* Vista Especies -- grid de tarjetas con la actividad actual (0..100) de
   cada especie del Cantabrico, y un modal de ficha completa al pulsar una.

   Cambios respecto al original:
   - La tarjeta muestra la silueta SVG de la especie en vez del emoji `icono`
   - El modal incluye datos reglamentarios de Galicia
     (reglamento.{tallaMin, pesoMin, cupo, veda, nota}); el bloque de `foto`
     se retiró (ver src/domain/especies.js) porque el asset era la misma
     silueta de `imagen` en negro, no una fotografía real
   - Etiquetas de camposFicha sin emoji (usar texto puro)

   API: renderEspecies(contenedor, st) */
import { especiesEn, mejoresHorasEspecie } from '../../domain/indice.js';
import { util } from '../../domain/config.js';
import { abrirModal } from '../util/modal.js';
import { espImgEl } from '../../domain/especies.js';

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
  nota.textContent = 'Actividad estimada ahora en tu spot. Toca una especie para ver ficha completa, temporada y mejores horas.';
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

  const ico = espImgEl(r.especie, 'pp-esp-card-ico');

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

export function abrirModalEspecie(esp, st) {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-esp-modal';

  const titulo = document.createElement('h3');
  titulo.className = 'pp-esp-modal-titulo';
  titulo.appendChild(espImgEl(esp, 'pp-esp-modal-ico'));
  titulo.append(' ' + esp.nombre + ' ');
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

  const regla = crearSeccionReglamento(esp);
  if (regla) cuerpo.appendChild(regla);

  if (st.ctx) cuerpo.appendChild(crearMejoresHoras(esp, st.ctx));

  abrirModal(cuerpo);
}

function camposFicha(esp) {
  return [
    ['Zonas', esp.zonas],
    ['Técnicas', esp.tecnicas],
    ['Cebos / señuelos', esp.cebos],
    ['Agua óptima', esp.sst[1] + '–' + esp.sst[2] + ' °C'],
    ['Mar óptimo', esp.oleaje[1] + '–' + esp.oleaje[2] + ' m'],
    ['Consejo', esp.notas]
  ];
}

function crearSeccionReglamento(esp) {
  const reg = esp.reglamento;
  if (!reg) return null;

  const sec = document.createElement('div');
  sec.className = 'pp-reglamento';

  const titulo = document.createElement('div');
  titulo.className = 'pp-campo';
  const b = document.createElement('b');
  b.textContent = 'Reglamento Galicia';
  titulo.appendChild(b);
  sec.appendChild(titulo);

  const filas = [];
  if (reg.tallaMin) filas.push(['Talla mínima', reg.tallaMin + ' cm']);
  if (reg.pesoMin)  filas.push(['Peso mínimo', reg.pesoMin + ' kg']);
  if (reg.cupo)     filas.push(['Cupo diario', reg.cupo + ' ejemplares']);
  if (reg.veda)     filas.push(['Veda', reg.veda]);

  filas.forEach(([k, v]) => {
    const fila = document.createElement('div');
    fila.className = 'pp-campo';
    const bk = document.createElement('b');
    bk.textContent = k + ':';
    fila.appendChild(bk);
    fila.append(' ' + v);
    sec.appendChild(fila);
  });

  if (reg.nota) {
    const nota = document.createElement('p');
    nota.className = 'pp-nota pp-nota-reglamento';
    nota.textContent = reg.nota;
    sec.appendChild(nota);
  }

  return sec;
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
    celda.style.background = 'rgba(255,114,0,' + (v * 0.85) + ')';
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
  b.textContent = 'Mejores momentos (72 h):';
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
