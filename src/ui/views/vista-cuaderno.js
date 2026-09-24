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
import { leer, anadir, borrar as borrarCaptura, estadisticas, exportar, importar } from '../../domain/cuaderno.js';
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
    const aviso = '¿Borrar esta captura?' + (c.fotoId ? ' (también su foto)' : '');
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

  const img = document.createElement('img');
  img.className = 'pp-foto-grande';
  img.alt = especie ? especie.nombre : c.especie;
  if (c.fotoId) obtenerFoto(c.fotoId).then(d => { if (d) img.src = d; });
  cuerpo.appendChild(img);

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

function actualizarBotonFoto(btn, icono, texto) {
  btn.textContent = '';
  const ico = document.createElement('ion-icon');
  ico.setAttribute('name', icono);
  ico.slot = 'start';
  btn.append(ico, document.createTextNode(texto));
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
  Object.values(MODOS).forEach(m => {
    const o = document.createElement('ion-select-option');
    o.value = m.id;
    o.textContent = m.nombre;
    selModo.appendChild(o);
  });
  selModo.value = st.modo;

  const senuelo = document.createElement('ion-input');
  senuelo.setAttribute('label', 'Señuelo / cebo');
  senuelo.setAttribute('placeholder', 'Señuelo / cebo');

  const notas = document.createElement('ion-input');
  notas.setAttribute('label', 'Notas (opcional)');
  notas.setAttribute('placeholder', 'Notas (opcional)');

  // Foto: cámara o galería (el selector del sistema ofrece ambas)
  const foto = document.createElement('input');
  foto.type = 'file';
  foto.accept = 'image/*';
  foto.style.display = 'none';
  const btnFoto = document.createElement('ion-button');
  btnFoto.setAttribute('fill', 'outline');
  btnFoto.type = 'button';
  actualizarBotonFoto(btnFoto, 'camera-outline', 'Añadir foto');
  const preview = document.createElement('img');
  preview.className = 'pp-foto-preview';
  preview.style.display = 'none';
  preview.alt = '';
  let fotoData = null;
  btnFoto.addEventListener('click', () => foto.click());
  foto.addEventListener('change', async () => {
    const f = foto.files && foto.files[0];
    if (!f) return;
    actualizarBotonFoto(btnFoto, 'camera-outline', 'Procesando…');
    try {
      fotoData = await comprimirFoto(f);
      preview.src = fotoData;
      preview.style.display = 'block';
      actualizarBotonFoto(btnFoto, 'camera-outline', 'Cambiar foto');
    } catch (e2) {
      fotoData = null;
      actualizarBotonFoto(btnFoto, 'camera-outline', 'No se pudo leer la foto — prueba otra');
    }
  });

  [selEsp, talla, peso, selModo, senuelo, notas, foto, btnFoto, preview].forEach(x => form.appendChild(x));

  const guardar = document.createElement('ion-button');
  guardar.setAttribute('expand', 'block');
  guardar.textContent = 'Guardar captura';
  guardar.addEventListener('click', async () => {
    guardar.disabled = true;
    let condiciones = null;
    if (st.ctx) {
      const h = horaMasCercana(st.datos.horas, new Date());
      const idx = indiceHora(h, selModo.value, st.ctx);
      const em = st.ctx.mareas.ahora;
      const lunaInfo = lunaEn(new Date(), st.spot.lat, st.spot.lon);
      condiciones = {
        viento: h.viento, ola: h.ola, sst: h.sst, presion: h.presion,
        faseMarea: em ? em.fase : null, luna: lunaInfo.nombre,
        momento: momentoDelDia(new Date(), st.spot.lat, st.spot.lon),
        indice: idx.valor
      };
    }
    let fotoId = null;
    if (fotoData) {
      fotoId = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      try { await guardarFoto(fotoId, fotoData); }
      catch (e3) { fotoId = null; }
    }
    anadir({
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
    renderCuaderno(contenedor, st);
  });
  form.appendChild(guardar);
  cuerpo.appendChild(form);
  abrirModal(cuerpo);
}
