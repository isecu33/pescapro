/* <Vista Trofeos> -- records personales, logros y competiciones entre
   amigos (ligas por codigo). Conversion de www/js/trofeos.js a Ionic Web
   Components (Fase 3).

   Superficie sensible de seguridad: los "codigos de invitacion/resultado"
   pegados aqui vienen de OTRO dispositivo (ver domain/records/liga.js,
   que ya valida su esquema antes de persistir). Esta vista NUNCA vuelve a
   meter esos datos (nombre de liga, nombre/detalle de un participante) en
   innerHTML -- usa <pp-liga-item>/<pp-rank-fila> (Custom Elements con
   Shadow DOM que ya usan textContent internamente) o textContent directo
   para todo lo que ella misma construye a mano (formularios, records,
   logros). modalImportar() muestra el error de liga.importar() tal cual
   en un parrafo del propio modal (nunca alert(), nunca lo oculta): es
   precisamente el mensaje que la auditoria de seguridad queria visible. */
import { abrirModal, cerrarModal } from '../util/modal.js';
import { leer as leerCuaderno } from '../../domain/cuaderno.js';
import { calcular as calcularRecords } from '../../domain/records/records.js';
import { evaluar as evaluarLogros } from '../../domain/records/logros.js';
import { especiePorId, espImgEl } from '../../domain/especies.js';
import {
  MODOS_LIGA,
  perfil as perfilLiga,
  setNombre as setNombreLiga,
  listar as listarLigas,
  porId as porIdLiga,
  crear as crearLiga,
  borrar as borrarLiga,
  estado as estadoLiga,
  actualizarMiResultado as actualizarMiResultadoLiga,
  ranking as rankingLiga,
  codigoInvitacion as codigoInvitacionLiga,
  codigoResultado as codigoResultadoLiga,
  importar as importarLiga
} from '../../domain/records/liga.js';
import '../components/pp-liga-item.js';
import '../components/pp-rank-fila.js';

/* Formateo de fecha defensivo: nunca devuelve el string crudo si la fecha
   no es valida (mismo criterio que la version corregida dentro de
   <pp-liga-item>; aqui aplica a fechas del propio cuaderno/liga local, no
   solo a las importadas, como defensa en profundidad). */
function fmtDia(iso) {
  const d = new Date(String(iso == null ? '' : iso) + 'T12:00');
  return isNaN(d) ? '—' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function crearTitulo(texto) {
  const h = document.createElement('h3');
  h.textContent = texto;
  return h;
}

function crearNota(texto) {
  const p = document.createElement('p');
  p.className = 'pp-nota';
  p.textContent = texto;
  return p;
}

function crearBoton(texto, opts) {
  const b = document.createElement('ion-button');
  b.textContent = texto;
  b.setAttribute('fill', (opts && opts.fill) || 'outline');
  b.setAttribute('size', 'small');
  if (opts && opts.color) b.setAttribute('color', opts.color);
  return b;
}

/* ============ RENDER PRINCIPAL ============ */

export function renderTrofeos(contenedor, st) {
  contenedor.textContent = '';
  const repintar = () => renderTrofeos(contenedor, st);
  const capturas = leerCuaderno();
  contenedor.appendChild(seccionRecords(capturas));
  contenedor.appendChild(seccionLogros(capturas));
  contenedor.appendChild(seccionLigas(repintar));
}

/* ============ RECORDS ============ */

function seccionRecords(capturas) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  card.appendChild(crearTitulo('Récords personales'));

  const r = calcularRecords(capturas);
  const lista = document.createElement('ion-list');
  const items = [
    ['Capturas totales', String(r.total)],
    ['Especies distintas', String(r.especiesDistintas)],
    ['Mejor día', r.mejorDia ? r.mejorDia.n + ' (' + fmtDia(r.mejorDia.dia) + ')' : '—'],
    ['Spots con capturas', String(r.spotsDistintos)]
  ];
  items.forEach(([etiqueta, valor]) => {
    const item = document.createElement('ion-item');
    item.setAttribute('lines', 'none');
    item.textContent = etiqueta + ': ' + valor;
    lista.appendChild(item);
  });
  card.appendChild(lista);

  const ids = Object.keys(r.porEspecie);
  if (ids.length) {
    const titulo = document.createElement('div');
    titulo.className = 'pp-stats-titulo pp-mt';
    titulo.textContent = 'Mejores piezas';
    card.appendChild(titulo);

    ids
      .sort((a, b) => {
        const ta = r.porEspecie[a].talla ? r.porEspecie[a].talla.valor : 0;
        const tb = r.porEspecie[b].talla ? r.porEspecie[b].talla.valor : 0;
        return tb - ta;
      })
      .forEach(id => {
        const especie = especiePorId(id);
        const d = r.porEspecie[id];
        const partes = [];
        if (d.talla) partes.push(d.talla.valor + ' cm' + (d.talla.fecha ? ' (' + fmtDia(d.talla.fecha.slice(0, 10)) + ')' : ''));
        if (d.peso) partes.push(d.peso.valor + ' kg');
        const fila = document.createElement('div');
        fila.className = 'pp-record-fila';
        if (especie) {
          fila.appendChild(espImgEl(especie, 'pp-esp-cab-ico'));
          const txt = document.createElement('span');
          txt.textContent = especie.nombre + ' · ' + d.n + ' uds' + (partes.length ? ' · ' + partes.join(' · ') : '');
          fila.appendChild(txt);
        } else {
          fila.textContent = id + ' · ' + d.n + ' uds' + (partes.length ? ' · ' + partes.join(' · ') : '');
        }
        card.appendChild(fila);
      });
  } else {
    card.appendChild(crearNota('Registra capturas en el Cuaderno (con talla y peso) y aquí aparecerán tus récords.'));
  }
  return card;
}

/* ============ LOGROS ============ */

function seccionLogros(capturas) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  const logros = evaluarLogros(capturas);
  const conseguidos = logros.filter(l => l.conseguido).length;
  card.appendChild(crearTitulo('Logros (' + conseguidos + '/' + logros.length + ')'));

  const grid = document.createElement('div');
  grid.className = 'pp-logros';

  logros.forEach(l => {
    const c = document.createElement('div');
    c.className = 'pp-logro' + (l.conseguido ? ' conseguido' : '');

    const ico = document.createElement('img');
    ico.className = 'pp-logro-ico';
    ico.src = './img/logros/' + l.id + '.svg';
    ico.alt = l.nombre;
    ico.onerror = () => {
      ico.onerror = null;
      const fb = document.createElement('span');
      fb.className = 'pp-logro-ico';
      fb.textContent = l.icono;
      ico.replaceWith(fb);
    };

    const nombre = document.createElement('div');
    nombre.className = 'pp-logro-nombre';
    nombre.textContent = l.nombre;

    c.append(ico, nombre);

    if (!l.conseguido && l.progreso) {
      const prog = document.createElement('div');
      prog.className = 'pp-logro-prog';
      prog.textContent = l.progreso[0] + '/' + l.progreso[1];
      c.appendChild(prog);
    }

    c.addEventListener('click', () => modalLogro(l));
    grid.appendChild(c);
  });
  card.appendChild(grid);
  return card;
}

function modalLogro(l) {
  const cuerpo = document.createElement('div');
  cuerpo.appendChild(crearTitulo(l.nombre));
  const desc = document.createElement('p');
  desc.textContent = l.desc;
  cuerpo.appendChild(desc);
  cuerpo.appendChild(crearNota(l.conseguido
    ? 'Conseguido'
    : (l.progreso ? 'Progreso: ' + l.progreso[0] + ' de ' + l.progreso[1] : 'Aún pendiente')));
  abrirModal(cuerpo);
}

/* ============ COMPETICIONES ============ */

function seccionLigas(repintar) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  card.appendChild(crearTitulo('Competiciones con amigos'));

  const fila = document.createElement('div');
  fila.className = 'pp-btn-fila';

  const bCrear = crearBoton('Crear');
  bCrear.addEventListener('click', () => conNombre(() => modalCrear(repintar)));
  const bUnirse = crearBoton('Unirse / añadir código');
  bUnirse.addEventListener('click', () => conNombre(() => modalImportar(repintar)));
  fila.append(bCrear, bUnirse);
  card.appendChild(fila);

  const ligas = listarLigas();
  if (!ligas.length) {
    card.appendChild(crearNota(
      'Crea una competición (p. ej. "Liga de agosto"), comparte el código de invitación por WhatsApp y ' +
      'que cada amigo envíe su código de resultado. El ranking se calcula aquí, sin cuentas ni servidores.'));
    return card;
  }

  const lista = document.createElement('div');
  lista.addEventListener('pp-abrir-liga', (ev) => modalLiga(ev.detail.id, repintar));
  ligas.forEach(liga => {
    const item = document.createElement('pp-liga-item');
    item.liga = liga;
    lista.appendChild(item);
  });
  card.appendChild(lista);
  return card;
}

/* Pide el nombre de pescador si aun no existe y luego continua. */
function conNombre(sigue) {
  const p = perfilLiga();
  if (p && p.nombre) { sigue(); return; }

  const cuerpo = document.createElement('div');
  cuerpo.appendChild(crearTitulo('Tu nombre de pescador'));
  cuerpo.appendChild(crearNota('Aparecerá en los rankings que compartas con tus amigos.'));
  const input = document.createElement('ion-input');
  input.setAttribute('placeholder', 'P. ej. Iker');
  input.maxlength = 24;
  const boton = document.createElement('ion-button');
  boton.textContent = 'Guardar';
  boton.className = 'pp-mt';
  boton.addEventListener('click', () => {
    const valor = String(input.value == null ? '' : input.value).trim();
    if (!valor) { if (typeof input.setFocus === 'function') input.setFocus(); return; }
    setNombreLiga(valor);
    cerrarModal();
    sigue();
  });
  cuerpo.append(input, boton);
  abrirModal(cuerpo);
}

function modalCrear(repintar) {
  const cuerpo = document.createElement('div');
  cuerpo.appendChild(crearTitulo('Nueva competición'));

  const nombre = document.createElement('ion-input');
  nombre.setAttribute('placeholder', 'Nombre (p. ej. Liga de agosto)');
  nombre.maxlength = 40;

  const hoy = new Date();
  const fin = new Date(Date.now() + 14 * 86400e3);
  const desde = document.createElement('ion-input');
  desde.type = 'date';
  desde.value = hoy.toISOString().slice(0, 10);
  const hasta = document.createElement('ion-input');
  hasta.type = 'date';
  hasta.value = fin.toISOString().slice(0, 10);

  const modo = document.createElement('ion-select');
  modo.setAttribute('interface', 'popover');
  Object.values(MODOS_LIGA).forEach(m => {
    const opt = document.createElement('ion-select-option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    modo.appendChild(opt);
  });
  modo.value = 'puntos';

  const msg = crearNota('');

  const boton = document.createElement('ion-button');
  boton.textContent = 'Crear y compartir invitación';
  boton.className = 'pp-mt';
  boton.addEventListener('click', () => {
    try {
      const liga = crearLiga({
        nombre: String(nombre.value == null ? '' : nombre.value).trim(),
        desde: desde.value,
        hasta: hasta.value,
        modo: modo.value
      });
      actualizarMiResultadoLiga(liga.id);
      cerrarModal();
      repintar();
      compartirInvitacion(liga);
    } catch (e) {
      msg.textContent = '⚠️ ' + e.message;
    }
  });

  cuerpo.append(
    crearNota('Nombre'), nombre,
    crearNota('Desde / hasta'), desde, hasta,
    crearNota('Cómo se gana'), modo,
    boton, msg,
    crearNota('Puntos por talla: cada cm cuenta 1 punto (captura sin medir: 10 pts). Así una buena pieza ' +
      'vale más que muchas pequeñas, pero la constancia también suma.')
  );
  abrirModal(cuerpo);
}

function modalImportar(repintar) {
  const cuerpo = document.createElement('div');
  cuerpo.appendChild(crearTitulo('Pegar código'));
  cuerpo.appendChild(crearNota(
    'Vale tanto un código de invitación (para unirte) como un código de resultado de un amigo (para actualizar el ranking).'));

  const area = document.createElement('ion-textarea');
  area.setAttribute('placeholder', 'PESCAPRO1:…');
  area.rows = 4;

  // Mensaje de error de liga.importar(): SIEMPRE se muestra tal cual en
  // este parrafo del modal (nunca alert(), nunca se oculta). Fix de
  // auditoria: antes el mensaje de error del codigo invalido no era
  // suficientemente visible; aqui es el primer sitio donde el usuario lo ve.
  const msg = crearNota('');

  const boton = document.createElement('ion-button');
  boton.textContent = 'Importar';
  boton.className = 'pp-mt';
  boton.addEventListener('click', () => {
    try {
      const r = importarLiga(area.value);
      cerrarModal();
      repintar();
      modalLiga(r.liga.id, repintar);
    } catch (e) {
      msg.textContent = '⚠️ ' + e.message;
    }
  });

  cuerpo.append(area, boton, msg);
  abrirModal(cuerpo);
}

function modalLiga(id, repintar) {
  const liga = actualizarMiResultadoLiga(id) || porIdLiga(id);
  if (!liga) return;

  const cuerpo = document.createElement('div');
  const est = estadoLiga(liga);
  cuerpo.appendChild(crearTitulo(liga.nombre + ' · ' + est));
  const modoNombre = MODOS_LIGA[liga.modo] ? MODOS_LIGA[liga.modo].nombre : liga.modo;
  cuerpo.appendChild(crearNota(fmtDia(liga.desde) + ' → ' + fmtDia(liga.hasta) + ' · ' + modoNombre));

  const rank = rankingLiga(liga);
  rank.forEach((p, i) => {
    const fila = document.createElement('pp-rank-fila');
    fila.entrada = { posicion: i + 1, nombre: p.nombre, esYo: p.esYo, detalle: p.detalle };
    cuerpo.appendChild(fila);
  });
  if (rank.length === 1) {
    cuerpo.appendChild(crearNota('De momento estás solo: comparte la invitación y pide a tus amigos su código de resultado.'));
  }

  const acciones = document.createElement('div');
  acciones.className = 'pp-acciones';

  const errAcciones = crearNota('');

  const bInv = crearBoton('Compartir invitación');
  bInv.addEventListener('click', () => compartirInvitacion(liga));

  const bRes = crearBoton('Enviar mi resultado');
  bRes.addEventListener('click', () => {
    try {
      const codigo = codigoResultadoLiga(liga.id);
      const yo = rankingLiga(porIdLiga(liga.id)).find(p => p.esYo);
      compartir('🏆 Mi resultado en «' + liga.nombre + '» (PescaPro): ' + (yo ? yo.detalle : '') +
        '\nPega este código en Trofeos → Unirse/añadir código:\n' + codigo);
    } catch (e) {
      errAcciones.textContent = '⚠️ ' + e.message;
    }
  });

  const bAdd = crearBoton('Añadir resultado de un amigo');
  bAdd.addEventListener('click', () => { cerrarModal(); modalImportar(repintar); });

  const bDel = crearBoton('Borrar competición', { color: 'danger' });
  bDel.addEventListener('click', () => modalConfirmarBorrado(liga, repintar));

  acciones.append(bInv, bRes, bAdd, bDel);
  cuerpo.appendChild(acciones);
  cuerpo.appendChild(errAcciones);
  cuerpo.appendChild(crearNota(
    'Tu resultado se calcula solo, con las capturas del Cuaderno dentro del periodo. Sistema de confianza: ' +
    'aquí no hay árbitro, hay cuadrilla 😄'));
  abrirModal(cuerpo);
}

/* Confirmacion de borrado dentro de un modal propio en vez de window.confirm()
   (bloqueante, dificil de testear, e inconsistente con el resto de la vista,
   que ya evita dialogos nativos como alert()). */
function modalConfirmarBorrado(liga, repintar) {
  const cuerpo = document.createElement('div');
  cuerpo.appendChild(crearTitulo('Borrar competición'));
  cuerpo.appendChild(crearNota('¿Borrar «' + liga.nombre + '» de tu móvil? (a tus amigos no les afecta)'));

  const acciones = document.createElement('div');
  acciones.className = 'pp-acciones';

  const bSi = crearBoton('Borrar', { fill: 'solid', color: 'danger' });
  bSi.addEventListener('click', () => { borrarLiga(liga.id); cerrarModal(); repintar(); });
  const bNo = crearBoton('Cancelar');
  bNo.addEventListener('click', () => modalLiga(liga.id, repintar));

  acciones.append(bSi, bNo);
  cuerpo.appendChild(acciones);
  abrirModal(cuerpo);
}

function compartirInvitacion(liga) {
  const modoNombre = MODOS_LIGA[liga.modo] ? MODOS_LIGA[liga.modo].nombre : liga.modo;
  compartir('🎣 Te reto en PescaPro: «' + liga.nombre + '» del ' + fmtDia(liga.desde) + ' al ' + fmtDia(liga.hasta) +
    ' (' + modoNombre + ').\nInstala PescaPro, registra tus capturas y pega este código en Trofeos → Unirse:\n' +
    codigoInvitacionLiga(liga));
}

/* Comparte texto: usa el share sheet nativo si esta disponible; si no (o si
   el usuario lo cancela), cae a copiar al portapapeles con un modal que
   muestra el codigo integro para copiarlo a mano como ultimo recurso. Nunca
   usa alert()/prompt() (bloqueantes, no testeables sin stubs globales). */
async function compartir(texto) {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try { await navigator.share({ text: texto }); return; }
    catch (e) { /* cancelado o no soportado: sigue con el fallback */ }
  }
  mostrarCodigoParaCopiar(texto);
}

function mostrarCodigoParaCopiar(texto) {
  const cuerpo = document.createElement('div');
  cuerpo.appendChild(crearTitulo('Compartir'));
  const area = document.createElement('ion-textarea');
  area.value = texto;
  area.setAttribute('readonly', 'true');
  area.rows = 6;
  const estado = crearNota('Preparando…');
  cuerpo.append(area, estado);
  abrirModal(cuerpo);

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(texto)
      .then(() => { estado.textContent = 'Copiado al portapapeles: pégalo en WhatsApp o donde quieras.'; })
      .catch(() => { estado.textContent = 'No se pudo copiar automáticamente. Copia el texto de arriba a mano.'; });
  } else {
    estado.textContent = 'Copia el texto de arriba a mano y pégalo en WhatsApp o donde quieras.';
  }
}
