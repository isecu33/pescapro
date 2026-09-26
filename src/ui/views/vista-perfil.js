/* <Vista Perfil> -- perfil del pescador: tarjeta publica (banner, avatar,
   nombre, @usuario, bio, clan, insignias favoritas), estadisticas, capturas
   destacadas elegidas por el autor, logros y gestion del clan.
   No es una pestana del tab-bar: se abre desde el menu lateral (hamburguesa).

   Igual que vista-trofeos.js: nada de innerHTML con datos de usuario o de
   codigos ajenos; todo con createElement/textContent. */
import { abrirModal, cerrarModal } from '../util/modal.js';
import { leer as leerCuaderno } from '../../domain/cuaderno.js';
import { calcular as calcularRecords } from '../../domain/records/records.js';
import { evaluar as evaluarLogros } from '../../domain/records/logros.js';
import { especiePorId, espImgEl } from '../../domain/especies.js';
import {
  obtener as obtenerFoto, guardar as guardarFoto, borrar as borrarFoto, comprimir as comprimirFoto
} from '../../domain/fotos.js';
import {
  leer as leerPerfil, actualizar as actualizarPerfil, publico as perfilPublico,
  alternarInsignia, alternarDestacada, destacadasVigentes,
  crearClan, unirseClan, salirClan, codigoClan,
  normalizarUsuario, usuarioValido,
  BANNERS, LIMITES, FOTO_BANNER, FOTO_AVATAR
} from '../../domain/perfil.js';
import { crearTarjetaPerfil, cargarImagenesPropias, crearIcoLogro } from '../util/perfil-tarjeta.js';

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

function crearError() {
  const p = document.createElement('p');
  p.className = 'pp-perfil-error';
  p.setAttribute('role', 'alert');
  return p;
}

/* Emite un aviso para que el shell (menu lateral) refresque su cabecera. */
function avisarCambio(contenedor) {
  contenedor.dispatchEvent(new CustomEvent('pp-perfil-cambiado', { bubbles: true, composed: true }));
}

/* ============ RENDER PRINCIPAL ============ */

export function renderPerfil(contenedor, _st) {
  contenedor.textContent = '';
  const repintar = () => { avisarCambio(contenedor); renderPerfil(contenedor, _st); };
  const perfil = leerPerfil();
  const capturas = leerCuaderno();
  const logros = evaluarLogros(capturas);

  const wrap = document.createElement('div');
  wrap.className = 'pp-perfil-vista';
  wrap.appendChild(seccionCabecera(perfil, logros, repintar));
  wrap.appendChild(seccionStats(capturas, logros));
  wrap.appendChild(seccionDestacadas(capturas, repintar));
  wrap.appendChild(seccionLogros(logros, perfil, repintar));
  wrap.appendChild(seccionClan(perfil, repintar));
  contenedor.appendChild(wrap);
}

/* ============ CABECERA (tarjeta publica) ============ */

function seccionCabecera(perfil, logros, repintar) {
  const sec = document.createElement('div');
  sec.className = 'pp-perfil-cabecera';
  const tarjeta = crearTarjetaPerfil(perfilPublico(perfil), { logros });
  cargarImagenesPropias(perfil, tarjeta);
  sec.appendChild(tarjeta);

  const acciones = document.createElement('div');
  acciones.className = 'pp-perfil-acciones';
  const editar = crearBoton('Editar perfil', { fill: 'solid' });
  editar.classList.add('pp-perfil-btn-editar');
  editar.addEventListener('click', () => modalEditar(repintar));
  acciones.appendChild(editar);
  sec.appendChild(acciones);

  if (!perfil.nombre) {
    sec.appendChild(crearNota('Ponle nombre a tu perfil: es lo que verán los demás en rankings, clanes y capturas compartidas.'));
  }
  return sec;
}

/* ============ ESTADISTICAS ============ */

function seccionStats(capturas, logros) {
  const r = calcularRecords(capturas);
  const fila = document.createElement('div');
  fila.className = 'pp-perfil-stats';
  const datos = [
    [r.total, r.total === 1 ? 'captura' : 'capturas'],
    [r.especiesDistintas, r.especiesDistintas === 1 ? 'especie' : 'especies'],
    [logros.filter(l => l.conseguido).length + '/' + logros.length, 'logros'],
    [r.spotsDistintos, r.spotsDistintos === 1 ? 'spot' : 'spots']
  ];
  datos.forEach(([n, etiqueta]) => {
    const s = document.createElement('div');
    s.className = 'pp-perfil-stat';
    const b = document.createElement('b');
    b.textContent = String(n);
    const small = document.createElement('small');
    small.textContent = etiqueta;
    s.append(b, small);
    fila.appendChild(s);
  });
  return fila;
}

/* ============ CAPTURAS DESTACADAS ============ */

function miniaturaCaptura(c) {
  const especie = especiePorId(c.especie);
  const mini = document.createElement('div');
  mini.className = 'pp-perfil-destacada';
  if (c.fotoId) {
    const img = document.createElement('img');
    img.alt = especie ? especie.nombre : c.especie;
    obtenerFoto(c.fotoId).then(d => { if (d) img.src = d; });
    mini.appendChild(img);
  } else {
    const ico = document.createElement('div');
    ico.className = 'pp-perfil-destacada-ico';
    ico.appendChild(espImgEl(especie, 'pp-esp-cab-ico'));
    mini.appendChild(ico);
  }
  const pie = document.createElement('div');
  pie.className = 'pp-perfil-destacada-pie';
  pie.textContent = (especie ? especie.nombre : c.especie) + (c.talla ? ' · ' + c.talla + ' cm' : '');
  mini.appendChild(pie);
  return mini;
}

function seccionDestacadas(capturas, repintar) {
  const card = document.createElement('div');
  card.className = 'pp-card pp-perfil-seccion-destacadas';
  card.appendChild(crearTitulo('Capturas destacadas'));
  const destacadas = destacadasVigentes(capturas);
  if (destacadas.length) {
    const grid = document.createElement('div');
    grid.className = 'pp-perfil-destacadas';
    destacadas.forEach(c => grid.appendChild(miniaturaCaptura(c)));
    card.appendChild(grid);
  } else {
    card.appendChild(crearNota(capturas.length
      ? 'Elige hasta ' + LIMITES.destacadas + ' capturas para lucirlas en tu perfil.'
      : 'Registra capturas en el Cuaderno y podrás destacar tus mejores piezas aquí.'));
  }
  if (capturas.length) {
    const btn = crearBoton('Elegir capturas');
    btn.classList.add('pp-mt', 'pp-perfil-btn-destacadas');
    btn.addEventListener('click', () => modalDestacadas(capturas, repintar));
    card.appendChild(btn);
  }
  return card;
}

function modalDestacadas(capturas, repintar) {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-modal';
  cuerpo.appendChild(crearTitulo('Capturas destacadas'));
  const nota = crearNota('Toca para añadir o quitar (máx. ' + LIMITES.destacadas + ').');
  cuerpo.appendChild(nota);
  const error = crearError();
  cuerpo.appendChild(error);

  const grid = document.createElement('div');
  grid.className = 'pp-perfil-destacadas pp-perfil-selector';
  const pintar = () => {
    const sel = new Set(leerPerfil().destacadas);
    grid.querySelectorAll('.pp-perfil-destacada').forEach(el => {
      el.classList.toggle('seleccionada', sel.has(el.dataset.id));
    });
  };
  capturas.forEach(c => {
    const mini = miniaturaCaptura(c);
    mini.dataset.id = c.id;
    mini.addEventListener('click', () => {
      error.textContent = '';
      try { alternarDestacada(c.id); } catch (e) { error.textContent = e.message; }
      pintar();
    });
    grid.appendChild(mini);
  });
  cuerpo.appendChild(grid);
  pintar();

  const listo = crearBoton('Listo', { fill: 'solid' });
  listo.classList.add('pp-mt');
  listo.addEventListener('click', () => { cerrarModal(); repintar(); });
  cuerpo.appendChild(listo);
  abrirModal(cuerpo);
}

/* ============ LOGROS + INSIGNIAS FAVORITAS ============ */

function seccionLogros(logros, perfil, repintar) {
  const card = document.createElement('div');
  card.className = 'pp-card';
  const conseguidos = logros.filter(l => l.conseguido);
  card.appendChild(crearTitulo('Logros (' + conseguidos.length + '/' + logros.length + ')'));

  const favs = new Set(perfil.insignias);
  const grid = document.createElement('div');
  grid.className = 'pp-logros';
  // Conseguidos primero: es lo que interesa ver en un perfil.
  [...conseguidos, ...logros.filter(l => !l.conseguido)].forEach(l => {
    const c = document.createElement('div');
    c.className = 'pp-logro' + (l.conseguido ? ' conseguido' : '') + (favs.has(l.id) ? ' favorito' : '');
    c.dataset.id = l.id;
    c.appendChild(crearIcoLogro(l));
    const nombre = document.createElement('div');
    nombre.className = 'pp-logro-nombre';
    nombre.textContent = l.nombre;
    c.appendChild(nombre);
    grid.appendChild(c);
  });
  card.appendChild(grid);

  if (conseguidos.length) {
    const btn = crearBoton('Elegir insignias favoritas');
    btn.classList.add('pp-mt', 'pp-perfil-btn-insignias');
    btn.addEventListener('click', () => modalInsignias(conseguidos, repintar));
    card.appendChild(btn);
  } else {
    card.appendChild(crearNota('Desbloquea logros para mostrarlos como insignias en tu tarjeta de perfil.'));
  }
  return card;
}

function modalInsignias(conseguidos, repintar) {
  const ids = conseguidos.map(l => l.id);
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-modal';
  cuerpo.appendChild(crearTitulo('Insignias favoritas'));
  cuerpo.appendChild(crearNota('Elige hasta ' + LIMITES.insignias + '. Aparecerán en tu tarjeta de perfil.'));
  const error = crearError();
  cuerpo.appendChild(error);

  const grid = document.createElement('div');
  grid.className = 'pp-logros pp-perfil-selector';
  const pintar = () => {
    const sel = new Set(leerPerfil().insignias);
    grid.querySelectorAll('.pp-logro').forEach(el => el.classList.toggle('seleccionada', sel.has(el.dataset.id)));
  };
  conseguidos.forEach(l => {
    const c = document.createElement('div');
    c.className = 'pp-logro conseguido';
    c.dataset.id = l.id;
    c.appendChild(crearIcoLogro(l));
    const nombre = document.createElement('div');
    nombre.className = 'pp-logro-nombre';
    nombre.textContent = l.nombre;
    c.appendChild(nombre);
    c.addEventListener('click', () => {
      error.textContent = '';
      try { alternarInsignia(l.id, ids); } catch (e) { error.textContent = e.message; }
      pintar();
    });
    grid.appendChild(c);
  });
  cuerpo.appendChild(grid);
  pintar();

  const listo = crearBoton('Listo', { fill: 'solid' });
  listo.classList.add('pp-mt');
  listo.addEventListener('click', () => { cerrarModal(); repintar(); });
  cuerpo.appendChild(listo);
  abrirModal(cuerpo);
}

/* ============ CLAN ============ */

function seccionClan(perfil, repintar) {
  const card = document.createElement('div');
  card.className = 'pp-card pp-perfil-seccion-clan';
  card.appendChild(crearTitulo('Clan'));

  if (perfil.clan) {
    const c = perfil.clan;
    const cab = document.createElement('div');
    cab.className = 'pp-perfil-clan-cab';
    const tag = document.createElement('span');
    tag.className = 'pp-perfil-clan-tag grande';
    tag.textContent = c.etiqueta;
    const txt = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = c.nombre;
    const small = document.createElement('small');
    small.textContent = (c.fundador ? 'Fundador' : 'Miembro') + ' desde ' + c.desde;
    txt.append(b, document.createElement('br'), small);
    cab.append(tag, txt);
    card.appendChild(cab);

    const acciones = document.createElement('div');
    acciones.className = 'pp-perfil-acciones';
    const invitar = crearBoton('Invitar');
    invitar.classList.add('pp-perfil-btn-invitar');
    invitar.addEventListener('click', modalInvitarClan);
    const salir = crearBoton('Salir del clan', { color: 'danger' });
    salir.addEventListener('click', () => {
      if (window.confirm('¿Salir de «' + c.nombre + '»?')) { salirClan(); repintar(); }
    });
    acciones.append(invitar, salir);
    card.appendChild(acciones);
  } else {
    card.appendChild(crearNota('Únete a un grupo de pesca o funda el tuyo. Sin servidor: los clanes se comparten con un código por WhatsApp o cualquier chat.'));
    const acciones = document.createElement('div');
    acciones.className = 'pp-perfil-acciones';
    const crear = crearBoton('Fundar clan', { fill: 'solid' });
    crear.classList.add('pp-perfil-btn-fundar');
    crear.addEventListener('click', () => modalCrearClan(repintar));
    const unirse = crearBoton('Unirme con código');
    unirse.classList.add('pp-perfil-btn-unirse');
    unirse.addEventListener('click', () => modalUnirseClan(repintar));
    acciones.append(crear, unirse);
    card.appendChild(acciones);
  }
  return card;
}

function campoTexto(etiqueta, valor, opts) {
  opts = opts || {};
  const wrap = document.createElement('label');
  wrap.className = 'pp-perfil-campo';
  const lbl = document.createElement('span');
  lbl.textContent = etiqueta;
  const input = document.createElement(opts.multilinea ? 'textarea' : 'input');
  input.className = 'pp-input';
  if (opts.nombre) input.name = opts.nombre;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  if (opts.max) input.maxLength = opts.max;
  if (opts.multilinea) input.rows = 3;
  input.value = valor || '';
  wrap.append(lbl, input);
  if (opts.max) {
    const cont = document.createElement('small');
    cont.className = 'pp-perfil-contador';
    const act = () => { cont.textContent = input.value.length + '/' + opts.max; };
    input.addEventListener('input', act);
    act();
    wrap.appendChild(cont);
  }
  return { wrap, input };
}

function modalCrearClan(repintar) {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-modal';
  cuerpo.appendChild(crearTitulo('Fundar clan'));
  const nombre = campoTexto('Nombre del clan', '', { nombre: 'clan-nombre', max: LIMITES.clan, placeholder: 'P. ej. Los del Espigón' });
  const etiqueta = campoTexto('Etiqueta (2-5)', '', { nombre: 'clan-etiqueta', max: LIMITES.etiqueta, placeholder: 'ESP' });
  const error = crearError();
  const ok = crearBoton('Fundar', { fill: 'solid' });
  ok.classList.add('pp-mt');
  ok.addEventListener('click', () => {
    try {
      crearClan({ nombre: nombre.input.value, etiqueta: etiqueta.input.value });
      cerrarModal();
      repintar();
    } catch (e) { error.textContent = e.message; }
  });
  cuerpo.append(nombre.wrap, etiqueta.wrap, error, ok);
  abrirModal(cuerpo);
}

function modalUnirseClan(repintar) {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-modal';
  cuerpo.appendChild(crearTitulo('Unirme a un clan'));
  cuerpo.appendChild(crearNota('Pega el código de invitación que te ha pasado un miembro del clan.'));
  const codigo = campoTexto('Código', '', { nombre: 'clan-codigo', multilinea: true, placeholder: 'PESCAPRO-CLAN1:…' });
  const error = crearError();
  const ok = crearBoton('Unirme', { fill: 'solid' });
  ok.classList.add('pp-mt');
  ok.addEventListener('click', () => {
    try {
      unirseClan(codigo.input.value);
      cerrarModal();
      repintar();
    } catch (e) { error.textContent = e.message; }
  });
  cuerpo.append(codigo.wrap, error, ok);
  abrirModal(cuerpo);
}

function modalInvitarClan() {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-modal';
  cuerpo.appendChild(crearTitulo('Invitar al clan'));
  cuerpo.appendChild(crearNota('Comparte este código. Quien lo pegue en «Unirme con código» entrará en tu clan.'));
  const codigo = campoTexto('Código', codigoClan(), { nombre: 'clan-codigo', multilinea: true });
  codigo.input.readOnly = true;
  const copiar = crearBoton('Copiar', { fill: 'solid' });
  copiar.classList.add('pp-mt');
  copiar.addEventListener('click', () => {
    const texto = codigo.input.value;
    const marcarCopiado = () => { copiar.textContent = 'Copiado ✓'; };
    const marcarSeleccionado = () => {
      codigo.input.select();
      copiar.textContent = 'Selecciona y copia (Ctrl+C)';
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(marcarCopiado, marcarSeleccionado);
    } else {
      marcarSeleccionado();
    }
  });
  cuerpo.append(codigo.wrap, copiar);
  abrirModal(cuerpo);
}

/* ============ EDITAR PERFIL ============ */

function selectorImagen(texto, idFoto, maxLado, alCambiar) {
  const fila = document.createElement('div');
  fila.className = 'pp-perfil-acciones';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;
  const subir = crearBoton(texto);
  subir.addEventListener('click', () => input.click());
  const quitar = crearBoton('Quitar', { color: 'medium' });
  quitar.addEventListener('click', () => {
    borrarFoto(idFoto).then(() => alCambiar(false));
  });
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    if (!f) return;
    comprimirFoto(f, maxLado, 0.8)
      .then(d => guardarFoto(idFoto, d))
      .then(() => alCambiar(true))
      .catch(() => alCambiar(null));
  });
  fila.append(input, subir, quitar);
  return fila;
}

function modalEditar(repintar) {
  const p = leerPerfil();
  const cuerpo = document.createElement('div');
  cuerpo.className = 'pp-perfil-modal pp-perfil-editar';
  cuerpo.appendChild(crearTitulo('Editar perfil'));

  // Vista previa en vivo de la tarjeta publica
  const preview = document.createElement('div');
  preview.className = 'pp-perfil-preview';
  cuerpo.appendChild(preview);

  const nombre = campoTexto('Nombre', p.nombre, { nombre: 'nombre', max: LIMITES.nombre, placeholder: 'Cómo te verán los demás' });
  const usuario = campoTexto('Usuario', p.usuario ? '@' + p.usuario : '', { nombre: 'usuario', max: LIMITES.usuario + 1, placeholder: '@tu_usuario' });
  const bio = campoTexto('Biografía', p.bio, { nombre: 'bio', max: LIMITES.bio, multilinea: true, placeholder: 'Spots, modalidades, especie fetiche…' });
  cuerpo.append(nombre.wrap, usuario.wrap, bio.wrap);

  const estado = { banner: p.banner, bannerFoto: p.bannerFoto, avatarFoto: p.avatarFoto };
  const error = crearError();

  const pintarPreview = () => {
    const usuarioPreview = normalizarUsuario(usuario.input.value);
    const datos = perfilPublico(Object.assign({}, p, {
      nombre: nombre.input.value.trim(),
      usuario: usuarioValido(usuarioPreview) ? usuarioPreview : '',
      bio: bio.input.value.trim(),
      banner: estado.banner
    }));
    const tarjeta = crearTarjetaPerfil(datos, { logros: evaluarLogros(leerCuaderno()) });
    cargarImagenesPropias(estado, tarjeta);
    preview.replaceChildren(tarjeta);
  };
  [nombre.input, usuario.input, bio.input].forEach(i => i.addEventListener('input', pintarPreview));

  // Banner: degradados predefinidos o foto propia
  const lblBanner = document.createElement('div');
  lblBanner.className = 'pp-perfil-campo-titulo';
  lblBanner.textContent = 'Banner';
  const swatches = document.createElement('div');
  swatches.className = 'pp-perfil-banners';
  const pintarSwatches = () => {
    swatches.querySelectorAll('button').forEach(b => {
      b.classList.toggle('activo', !estado.bannerFoto && b.dataset.banner === estado.banner);
    });
  };
  BANNERS.forEach(b => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'pp-perfil-banner-opcion';
    s.dataset.banner = b.id;
    s.style.background = b.css;
    s.title = b.nombre;
    s.setAttribute('aria-label', 'Banner ' + b.nombre);
    s.addEventListener('click', () => {
      estado.banner = b.id;
      if (estado.bannerFoto) {
        estado.bannerFoto = false;
        borrarFoto(FOTO_BANNER);
      }
      pintarSwatches();
      pintarPreview();
    });
    swatches.appendChild(s);
  });
  const selBanner = selectorImagen('Usar foto', FOTO_BANNER, 1200, (ok) => {
    if (ok === null) { error.textContent = 'No se pudo leer la imagen'; return; }
    estado.bannerFoto = ok;
    pintarSwatches();
    pintarPreview();
  });

  const lblAvatar = document.createElement('div');
  lblAvatar.className = 'pp-perfil-campo-titulo';
  lblAvatar.textContent = 'Foto de perfil';
  const selAvatar = selectorImagen('Elegir foto', FOTO_AVATAR, 400, (ok) => {
    if (ok === null) { error.textContent = 'No se pudo leer la imagen'; return; }
    estado.avatarFoto = ok;
    pintarPreview();
  });

  cuerpo.append(lblBanner, swatches, selBanner, lblAvatar, selAvatar, error);

  const guardar = crearBoton('Guardar', { fill: 'solid' });
  guardar.classList.add('pp-mt', 'pp-perfil-btn-guardar');
  guardar.addEventListener('click', () => {
    error.textContent = '';
    try {
      actualizarPerfil({
        nombre: nombre.input.value,
        usuario: usuario.input.value,
        bio: bio.input.value,
        banner: estado.banner,
        bannerFoto: estado.bannerFoto,
        avatarFoto: estado.avatarFoto
      });
      cerrarModal();
      repintar();
    } catch (e) { error.textContent = e.message; }
  });
  cuerpo.appendChild(guardar);

  pintarSwatches();
  pintarPreview();
  abrirModal(cuerpo, { breakpoints: [0, 1], initialBreakpoint: 1 });
}
