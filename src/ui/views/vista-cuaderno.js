/* Vista Cuaderno: registrar capturas (con foto y snapshot de condiciones),
   galeria de fotos, estadisticas por fase de marea/franja/luna/especie,
   historial y export/import JSON.

   Reemplaza www/js/ui.js: renderCuaderno (412-502), modalFoto (505-529),
   statsBarras (531-550), modalCaptura (552-631).

   ESTA ES LA VISTA MAS SENSIBLE DE SEGURIDAD DEL REPO (ver auditoria):
   www/js/ui.js insertaba c.notas / c.spot.nombre / c.senuelo directamente
   en `innerHTML` sin escapar, y PP.cuaderno.importar() permite pegar
   cualquier JSON (incluido el de otra persona) sin validar su contenido.
   El vector ya esta resuelto ESTRUCTURALMENTE en <pp-captura-card>
   (Shadow DOM + textContent, nunca innerHTML) -- aqui usamos ese
   componente para todo el listado y NO reintroducimos innerHTML con
   datos de una captura en ningun otro punto (galeria, visor de foto,
   formulario). Regla de esta vista: CERO innerHTML con datos dinamicos. */
import '../components/pp-captura-card.js';
import { leer, anadir, borrar as borrarCaptura, estadisticas, exportar, importar, favoritos, MAX_FOTOS, condicionesIncompletas } from '../../domain/cuaderno.js';
import { obtener as obtenerFoto, comprimir as comprimirFoto, guardar as guardarFoto } from '../../domain/fotos.js';
import { ESPECIES, especiePorId, espImgEl } from '../../domain/especies.js';
import { MODOS } from '../../domain/config.js';
import { horaMasCercana, indiceHora } from '../../domain/indice.js';
import { luna as lunaEn, momentoDelDia } from '../../domain/solunar.js';
import { abrirModal, cerrarModal } from '../util/modal.js';

export function renderCuaderno(contenedor, st) {
  contenedor.textContent = '';

  const btn = document.createElement('ion-button');
  btn.setAttribute('expand', 'block');
  const icoAdd = document.createElement('ion-icon');
  icoAdd.setAttribute('name', 'add-outline');
  icoAdd.slot = 'start';
  btn.append(icoAdd, document.createTextNode('Registrar captura'));
  btn.addEventListener('click', () => abrirModalCaptura(contenedor, st));
  contenedor.appendChild(btn);

  const lista = leer();

  const conFoto = lista.filter(c => c.fotoId);
  if (conFoto.length) contenedor.appendChild(crearGaleria(conFoto));

  const stats = estadisticas();
  if (stats.total > 0) contenedor.appendChild(crearTarjetaStats(stats));

  contenedor.appendChild(crearHistorial(lista, contenedor, st));
  contenedor.appendChild(crearExportImport(contenedor, st));
}

/* ---- Galería de fotos ---- */

function crearGaleria(conFoto) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  const h3 = document.createElement('h3');
  h3.textContent = 'Galería (' + conFoto.length + ')';
  card.appendChild(h3);

  const grid = document.createElement('div');
  grid.className = 'pp-galeria';
  conFoto.forEach(c => {
    const celda = document.createElement('div');
    celda.className = 'pp-galeria-celda';
    const img = document.createElement('img');
    img.alt = '';
    obtenerFoto(c.fotoId).then(d => { if (d) img.src = d; });
    celda.appendChild(img);
    celda.addEventListener('click', () => abrirModalFoto(c));
    grid.appendChild(celda);
  });
  card.appendChild(grid);
  return card;
}

/* ---- Estadísticas ---- */

function crearTarjetaStats(stats) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  const h3 = document.createElement('h3');
  h3.textContent = 'Tus patrones (' + stats.total + ' capturas)';
  card.appendChild(h3);

  card.appendChild(statsBarras('Por fase de marea', stats.porFaseMarea,
    { subiendo: 'Subiendo', pleamar: 'Pleamar', bajando: 'Bajando', bajamar: 'Bajamar' }));
  card.appendChild(statsBarras('Por momento', stats.porFranja));
  card.appendChild(statsBarras('Por luna', stats.porLuna));
  card.appendChild(statsBarras('Por especie', stats.porEspecie, null, (k) => {
    const e = especiePorId(k);
    return e ? e.nombre : k;
  }));

  return card;
}

function statsBarras(titulo, obj, orden, fmtKey) {
  const box = document.createElement('div');
  box.className = 'pp-stats';
  const tit = document.createElement('div');
  tit.className = 'pp-stats-titulo';
  tit.textContent = titulo;
  box.appendChild(tit);

  const claves = orden ? Object.keys(orden).filter(k => obj[k]) : Object.keys(obj);
  if (!claves.length) {
    const nota = document.createElement('p');
    nota.className = 'pp-nota';
    nota.textContent = 'Sin datos aún.';
    box.appendChild(nota);
    return box;
  }

  const max = Math.max(1, ...claves.map(k => obj[k] || 0));
  claves.sort((a, b) => (obj[b] || 0) - (obj[a] || 0)).forEach(k => {
    const fila = document.createElement('div');
    fila.className = 'pp-factor';

    const nombre = document.createElement('span');
    nombre.className = 'pp-factor-nombre';
    nombre.textContent = fmtKey ? fmtKey(k) : (orden ? orden[k] : k);
    fila.appendChild(nombre);

    const barra = document.createElement('div');
    barra.className = 'pp-barra';
    const rel = document.createElement('div');
    rel.className = 'pp-barra-rel';
    rel.style.width = Math.round((obj[k] || 0) / max * 100) + '%';
    rel.style.background = 'var(--ion-color-secondary)';
    barra.appendChild(rel);
    fila.appendChild(barra);

    const peso = document.createElement('span');
    peso.className = 'pp-factor-peso';
    peso.textContent = String(obj[k]);
    fila.appendChild(peso);

    box.appendChild(fila);
  });
  return box;
}

/* ---- Historial: cada fila es un <pp-captura-card>, delegación de eventos
   pp-borrar/pp-abrir-foto en el contenedor (ambos bubbles+composed). ---- */

function crearHistorial(lista, contenedor, st) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  const h3 = document.createElement('h3');
  h3.textContent = 'Historial';
  card.appendChild(h3);

  if (!lista.length) {
    const nota = document.createElement('p');
    nota.className = 'pp-nota';
    nota.textContent = 'Aún no hay capturas. Cada captura guarda automáticamente las ' +
      'condiciones del momento (marea, luna, viento, mar...) y su foto, para descubrir tus patrones.';
    card.appendChild(nota);
    return card;
  }

  card.addEventListener('pp-borrar', (ev) => {
    const c = ev.detail && ev.detail.captura;
    if (!c) return;
    const numFotos = Array.isArray(c.fotoIds) ? c.fotoIds.length : (c.fotoId ? 1 : 0);
    const aviso = '¿Borrar esta captura?' + (numFotos > 1 ? ' (también sus fotos)' : numFotos === 1 ? ' (también su foto)' : '');
    if (window.confirm(aviso)) {
      borrarCaptura(c.id);
      renderCuaderno(contenedor, st);
    }
  });
  card.addEventListener('pp-abrir-foto', (ev) => {
    const c = ev.detail && ev.detail.captura;
    if (c) abrirModalFoto(c);
  });

  lista.forEach(c => {
    const tarjeta = document.createElement('pp-captura-card');
    tarjeta.captura = c;
    card.appendChild(tarjeta);
  });

  return card;
}

/* ---- Visor de foto a pantalla completa. Datos de la captura pintados a
   mano con createElement/textContent -- nunca innerHTML con c.notas,
   c.spot.nombre, etc. ---- */

function abrirModalFoto(c) {
  const especie = especiePorId(c.especie);
  const cuerpo = document.createElement('div');

  const ids = Array.isArray(c.fotoIds) && c.fotoIds.length ? c.fotoIds : (c.fotoId ? [c.fotoId] : []);
  if (ids.length > 1) {
    const tira = document.createElement('div');
    tira.className = 'pp-foto-grande-tira';
    ids.forEach(fotoId => {
      const img = document.createElement('img');
      img.className = 'pp-foto-grande';
      img.alt = especie ? especie.nombre : c.especie;
      obtenerFoto(fotoId).then(d => { if (d) img.src = d; });
      tira.appendChild(img);
    });
    cuerpo.appendChild(tira);
  } else {
    const img = document.createElement('img');
    img.className = 'pp-foto-grande';
    img.alt = especie ? especie.nombre : c.especie;
    if (ids[0]) obtenerFoto(ids[0]).then(d => { if (d) img.src = d; });
    cuerpo.appendChild(img);
  }

  const campo = document.createElement('div');
  campo.className = 'pp-campo';
  if (especie) campo.appendChild(espImgEl(especie, 'pp-esp-cab-ico'));
  const b = document.createElement('b');
  b.textContent = especie ? especie.nombre : c.especie;
  campo.appendChild(b);
  if (c.talla) campo.appendChild(document.createTextNode(' · ' + c.talla + ' cm'));
  if (c.peso) campo.appendChild(document.createTextNode(' · ' + c.peso + ' kg'));
  cuerpo.appendChild(campo);

  const sub = document.createElement('div');
  sub.className = 'pp-captura-sub';
  const fechaTxt = new Date(c.fecha).toLocaleString('es-ES',
    { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  sub.appendChild(document.createTextNode(fechaTxt));
  if (c.spot && c.spot.nombre) {
    sub.appendChild(document.createTextNode(' · '));
    const locIco = document.createElement('ion-icon');
    locIco.setAttribute('name', 'location-outline');
    sub.appendChild(locIco);
    sub.appendChild(document.createTextNode(' ' + c.spot.nombre));
  }
  cuerpo.appendChild(sub);

  const cond = c.condiciones || {};
  if (cond.faseMarea || cond.luna || cond.viento != null || cond.ola != null || cond.indice != null) {
    const condDiv = document.createElement('div');
    condDiv.className = 'pp-captura-cond';
    let sep = false;
    const add = (nodes) => {
      if (sep) condDiv.appendChild(document.createTextNode(' · '));
      nodes.forEach(n => condDiv.appendChild(n));
      sep = true;
    };
    if (cond.faseMarea) {
      const ico = document.createElement('ion-icon');
      ico.setAttribute('name', 'water-outline');
      add([ico, document.createTextNode(' Marea ' + cond.faseMarea)]);
    }
    if (cond.luna) add([document.createTextNode(cond.luna)]);
    if (cond.viento != null) {
      const ico = document.createElement('ion-icon');
      ico.setAttribute('name', 'navigate-outline');
      add([ico, document.createTextNode(' ' + Math.round(cond.viento) + ' km/h')]);
    }
    if (cond.ola != null) add([document.createTextNode(Number(cond.ola).toFixed(1) + ' m')]);
    if (cond.indice != null) add([document.createTextNode('índice ' + cond.indice)]);
    cuerpo.appendChild(condDiv);
  }

  if (c.notas) {
    const notas = document.createElement('div');
    notas.className = 'pp-captura-notas';
    notas.textContent = c.notas;
    cuerpo.appendChild(notas);
  }

  abrirModal(cuerpo, { breakpoints: null });
}

/* ---- Export / import.
   Exportar: intenta clipboard.writeText; si falla (permiso denegado, API
   no disponible...), degrada a prompt() de solo-lectura con el JSON ya
   seleccionado -- igual que el original, evita depender de un modal
   nuevo solo para este caso raro.
   Importar: importar() lanza si el JSON no es un array (no valida el
   contenido de cada captura, eso queda fuera de esta tarea); aquí solo
   capturamos ese throw y lo mostramos con alert(). ---- */

function crearExportImport(contenedor, st) {
  const card = document.createElement('div');
  card.className = 'pp-card';

  const fila = document.createElement('div');
  fila.className = 'pp-export-fila';

  const be = document.createElement('ion-button');
  be.setAttribute('fill', 'outline');
  be.setAttribute('size', 'small');
  const icoExp = document.createElement('ion-icon');
  icoExp.setAttribute('name', 'cloud-download-outline');
  icoExp.slot = 'start';
  be.append(icoExp, document.createTextNode('Exportar'));
  be.addEventListener('click', async () => {
    const json = exportar();
    try {
      await navigator.clipboard.writeText(json);
      window.alert('Cuaderno copiado al portapapeles (las fotos no se incluyen).');
    } catch (e) {
      window.prompt('Copia el contenido:', json);
    }
  });

  const bi = document.createElement('ion-button');
  bi.setAttribute('fill', 'outline');
  bi.setAttribute('size', 'small');
  const icoImp = document.createElement('ion-icon');
  icoImp.setAttribute('name', 'cloud-upload-outline');
  icoImp.slot = 'start';
  bi.append(icoImp, document.createTextNode('Importar'));
  bi.addEventListener('click', () => {
    const txt = window.prompt('Pega el JSON del cuaderno:');
    if (!txt) return;
    try {
      importar(txt);
      renderCuaderno(contenedor, st);
    } catch (e) {
      window.alert('No se pudo importar: ' + (e && e.message ? e.message : 'JSON no válido'));
    }
  });

  fila.append(be, bi);
  card.appendChild(fila);
  const nota = document.createElement('p');
  nota.className = 'pp-nota';
  nota.textContent = 'La exportación lleva los datos de las capturas; las fotos permanecen en este dispositivo.';
  card.appendChild(nota);
  return card;
}

/* ---- Formulario de nueva captura ---- */

/* Selector de hasta `max` fotos: grid de miniaturas + celda "Añadir" (con
   spinner mientras comprime) + texto de ayuda con el contador. Acepta
   selección múltiple del selector nativo; si el usuario elige más de las
   que caben, el resto se ignora sin más aviso que dejar el hueco lleno. */
function crearSelectorFotos(max) {
  const wrap = document.createElement('div');

  const grid = document.createElement('div');
  grid.className = 'pp-fotos-captura';
  wrap.appendChild(grid);

  const ayuda = document.createElement('p');
  ayuda.className = 'pp-foto-ayuda';
  wrap.appendChild(ayuda);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.style.display = 'none';
  wrap.appendChild(input);

  const fotos = [];
  let procesando = false;
  let error = null;

  function pintarAyuda() {
    if (error) { ayuda.textContent = error; return; }
    ayuda.textContent = fotos.length
      ? fotos.length + ' de ' + max + ' fotos'
      : 'Añade hasta ' + max + ' fotos de la captura';
  }

  function render() {
    grid.textContent = '';
    fotos.forEach((dataUrl, i) => {
      const item = document.createElement('div');
      item.className = 'pp-foto-item';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = '';
      item.appendChild(img);

      const quitar = document.createElement('button');
      quitar.type = 'button';
      quitar.className = 'pp-foto-quitar';
      quitar.setAttribute('aria-label', 'Quitar foto');
      const icoQ = document.createElement('ion-icon');
      icoQ.setAttribute('name', 'close-outline');
      quitar.appendChild(icoQ);
      quitar.addEventListener('click', () => { fotos.splice(i, 1); error = null; render(); });
      item.appendChild(quitar);

      grid.appendChild(item);
    });

    if (fotos.length < max) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'pp-foto-add';
      add.setAttribute('aria-label', 'Añadir foto');
      if (procesando) {
        add.setAttribute('aria-disabled', 'true');
        add.appendChild(document.createElement('ion-spinner'));
      } else {
        const icoA = document.createElement('ion-icon');
        icoA.setAttribute('name', 'camera-outline');
        const txt = document.createElement('span');
        txt.textContent = 'Añadir';
        add.append(icoA, txt);
        add.addEventListener('click', () => input.click());
      }
      grid.appendChild(add);
    }

    pintarAyuda();
  }

  input.addEventListener('change', async () => {
    const archivos = Array.from(input.files || []);
    input.value = ''; // permite volver a elegir el mismo fichero mas tarde
    if (!archivos.length) return;
    const hueco = archivos.slice(0, max - fotos.length);
    error = null;
    procesando = true;
    render();
    for (const f of hueco) {
      try { fotos.push(await comprimirFoto(f)); }
      catch (e) { error = 'No se pudo leer una de las fotos — prueba otra.'; }
    }
    procesando = false;
    render();
  });

  render();
  return { el: wrap, getFotos: () => fotos.slice() };
}

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtFechaISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function fmtHoraHHMM(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

/* Combina los campos separados de fecha y hora en un Date; si alguno esta
   vacio o el resultado no es valido, cae a "ahora" -- así el registro
   nunca se bloquea por un dato de fecha mal escrito a mano. */
function leerFechaHora(fechaInput, horaInput) {
  const f = fechaInput.value || fmtFechaISO(new Date());
  const h = horaInput.value || fmtHoraHHMM(new Date());
  const d = new Date(f + 'T' + h + ':00');
  return isNaN(d.getTime()) ? new Date() : d;
}

/* Spot activo + favoritos, sin duplicados por coordenadas (mismo criterio
   que favoritos.anadir() en domain/cuaderno.js). */
function candidatosSpot(spotActivo) {
  const vistos = new Set();
  return [spotActivo, ...favoritos.leer()].filter(s => {
    const k = s.lat.toFixed(4) + ',' + s.lon.toFixed(4);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/* Snapshot de condiciones para una captura: viene del pronostico ya cargado
   para st.spot -- si el usuario elige un spot distinto, o una fecha fuera de
   la ventana de pronostico cargada, no hay datos fiables y se devuelve
   null/parcial (mejor eso que un dato erroneo). Usada tanto por el aviso
   junto a Fecha (previsualizacion, no guarda nada) como por el handler de
   guardado -- misma logica, un solo sitio (ver docs/ux-audit/06-cuaderno.md,
   item 2). */
function calcularCondiciones(spotSel, fechaSel, modo, st) {
  const mismoSpot = Math.abs(spotSel.lat - st.spot.lat) < 1e-4 && Math.abs(spotSel.lon - st.spot.lon) < 1e-4;
  if (!st.ctx || !mismoSpot) return null;
  const h = horaMasCercana(st.datos.horas, fechaSel);
  if (!h) return null;
  const idx = indiceHora(h, modo, st.ctx);
  const estado = st.ctx.mareas.estadoEn(fechaSel);
  const lunaInfo = lunaEn(fechaSel, st.spot.lat, st.spot.lon);
  return {
    viento: h.viento, ola: h.ola, sst: h.sst, presion: h.presion,
    faseMarea: estado ? estado.fase : null, luna: lunaInfo.nombre,
    momento: momentoDelDia(fechaSel, st.spot.lat, st.spot.lon),
    indice: idx.valor
  };
}

function abrirModalCaptura(contenedor, st) {
  const cuerpo = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = 'Registrar captura';
  cuerpo.appendChild(h3);

  const form = document.createElement('div');
  form.className = 'pp-form';

  const selEsp = document.createElement('ion-select');
  selEsp.setAttribute('label', 'Especie');
  selEsp.setAttribute('interface', 'action-sheet');
  selEsp.setAttribute('cancel-text', 'Cancelar');
  ESPECIES.forEach(e => {
    const o = document.createElement('ion-select-option');
    o.value = e.id;
    o.textContent = e.nombre;
    selEsp.appendChild(o);
  });
  const oOtra = document.createElement('ion-select-option');
  oOtra.value = 'otra';
  oOtra.textContent = 'Otra';
  selEsp.appendChild(oOtra);
  selEsp.value = ESPECIES.length ? ESPECIES[0].id : 'otra';

  const talla = document.createElement('ion-input');
  talla.type = 'number';
  talla.setAttribute('label', 'Talla (cm)');
  talla.setAttribute('placeholder', 'Talla (cm)');

  const peso = document.createElement('ion-input');
  peso.type = 'number';
  peso.setAttribute('step', '0.1');
  peso.setAttribute('label', 'Peso (kg)');
  peso.setAttribute('placeholder', 'Peso (kg)');

  const selModo = document.createElement('ion-select');
  selModo.setAttribute('label', 'Modalidad');
  selModo.setAttribute('interface', 'action-sheet');
  selModo.setAttribute('cancel-text', 'Cancelar');
  Object.values(MODOS).forEach(m => {
    const o = document.createElement('ion-select-option');
    o.value = m.id;
    o.textContent = m.nombre;
    selModo.appendChild(o);
  });
  selModo.value = st.modo;

  // Spot: el activo en la app + favoritos guardados -- permite registrar
  // una captura de un sitio distinto al que se esta consultando ahora.
  const candidatos = candidatosSpot(st.spot);
  const selSpot = document.createElement('ion-select');
  selSpot.setAttribute('label', 'Spot');
  selSpot.setAttribute('interface', 'action-sheet');
  selSpot.setAttribute('cancel-text', 'Cancelar');
  candidatos.forEach((s, i) => {
    const o = document.createElement('ion-select-option');
    o.value = String(i);
    o.textContent = s.nombre;
    selSpot.appendChild(o);
  });
  selSpot.value = '0';

  // Fecha y hora de la captura, editables -- por defecto ahora, pero no
  // hace falta registrar la captura en el momento: se puede rellenar el
  // cuaderno mas tarde con la fecha/hora real de la marea.
  const ahoraIni = new Date();
  const filaFecha = document.createElement('div');
  filaFecha.className = 'pp-form-fila';
  const fecha = document.createElement('ion-input');
  fecha.type = 'date';
  fecha.setAttribute('label', 'Fecha');
  fecha.setAttribute('max', fmtFechaISO(ahoraIni));
  fecha.value = fmtFechaISO(ahoraIni);
  const hora = document.createElement('ion-input');
  hora.type = 'time';
  hora.setAttribute('label', 'Hora');
  hora.value = fmtHoraHHMM(ahoraIni);
  filaFecha.append(fecha, hora);

  // Aviso junto a Fecha cuando la fecha/hora elegida (o el spot) cae fuera de
  // la ventana de pronostico cargada -- antes esto se guardaba en silencio,
  // sin faseMarea ni luna (ver docs/ux-audit/06-cuaderno.md, item 2).
  const avisoFecha = document.createElement('p');
  avisoFecha.className = 'pp-nota pp-fecha-aviso';
  function actualizarAvisoFecha() {
    const spotSel = candidatos[Number(selSpot.value)] || st.spot;
    const fechaSel = leerFechaHora(fecha, hora);
    const cond = calcularCondiciones(spotSel, fechaSel, selModo.value, st);
    avisoFecha.textContent = condicionesIncompletas(cond)
      ? 'Sin datos de marea/luna para esta fecha: la captura se guardará sin ese snapshot.'
      : '';
  }
  fecha.addEventListener('ionChange', actualizarAvisoFecha);
  hora.addEventListener('ionChange', actualizarAvisoFecha);
  selSpot.addEventListener('ionChange', actualizarAvisoFecha);
  actualizarAvisoFecha();

  const senuelo = document.createElement('ion-input');
  senuelo.setAttribute('label', 'Señuelo / cebo');
  senuelo.setAttribute('placeholder', 'Señuelo / cebo');

  const notas = document.createElement('ion-input');
  notas.setAttribute('label', 'Notas (opcional)');
  notas.setAttribute('placeholder', 'Notas (opcional)');

  // Fotos: cámara o galería (el selector del sistema ofrece ambas), hasta MAX_FOTOS
  const selectorFotos = crearSelectorFotos(MAX_FOTOS);

  [selEsp, talla, peso, selModo, selSpot, filaFecha, avisoFecha, senuelo, notas, selectorFotos.el]
    .forEach(x => form.appendChild(x));

  const guardar = document.createElement('ion-button');
  guardar.setAttribute('expand', 'block');
  guardar.textContent = 'Guardar captura';
  guardar.addEventListener('click', async () => {
    guardar.disabled = true;
    const spotSel = candidatos[Number(selSpot.value)] || st.spot;
    const fechaSel = leerFechaHora(fecha, hora);
    const condiciones = calcularCondiciones(spotSel, fechaSel, selModo.value, st);
    const fotoIds = [];
    for (const dataUrl of selectorFotos.getFotos()) {
      const fotoId = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      try { await guardarFoto(fotoId, dataUrl); fotoIds.push(fotoId); }
      catch (e3) { /* esa foto no se guarda; el resto sigue su curso */ }
    }
    anadir({
      especie: selEsp.value,
      talla: talla.value ? Number(talla.value) : null,
      peso: peso.value ? Number(peso.value) : null,
      modalidad: selModo.value,
      senuelo: senuelo.value || null,
      notas: notas.value || null,
      fecha: fechaSel.toISOString(),
      spot: { nombre: spotSel.nombre, lat: spotSel.lat, lon: spotSel.lon },
      fotoIds,
      condiciones
    });
    cerrarModal();
    renderCuaderno(contenedor, st);
  });
  form.appendChild(guardar);
  cuerpo.appendChild(form);
  // breakpoints [0,1]: sheet a pantalla completa en vez del 90% por defecto
  // -- con fotos el contenido crece y el sheet parcial atrapaba el scroll,
  // dejando el boton "Guardar captura" inalcanzable (mismo patron que el
  // editor de perfil en vista-perfil.js).
  abrirModal(cuerpo, { breakpoints: [0, 1], initialBreakpoint: 1 });
}
