/* PescaPro - Perfil del pescador (100% local, sin servidor).
   Guarda nombre visible, @usuario, biografia, clan/grupo, banner, avatar,
   insignias favoritas y capturas destacadas. Es la "tarjeta publica" que
   veran los demas cuando te encuentren o aparezcas junto a una captura.

   Comparte la clave `pp_perfil` con las ligas (records/liga.js lee de aqui
   el nombre de pescador), asi que el nombre es uno solo en toda la app.
   Las imagenes (banner/avatar) no van en localStorage: se guardan en
   IndexedDB via fotos.js con ids fijos y aqui solo queda la referencia.

   Clanes: igual que las ligas, sin servidor. Crear un clan genera un
   codigo de invitacion (texto) que se comparte por chat; unirse = pegar
   ese codigo. Los codigos vienen de OTRO dispositivo -> entrada no
   confiable, se valida el esquema antes de persistir nada. */

const KEY = 'pp_perfil';
const PREFIJO_CLAN = 'PESCAPRO-CLAN1:';

export const LIMITES = { nombre: 24, usuario: 20, bio: 160, clan: 30, etiqueta: 5, insignias: 3, destacadas: 6 };
export const FOTO_BANNER = 'perfil_banner';
export const FOTO_AVATAR = 'perfil_avatar';
const RE_USUARIO = /^[a-z0-9_.]{3,20}$/;
const RE_ETIQUETA = /^[A-Z0-9]{2,5}$/;

/* Banners predefinidos (degradados CSS, sin assets). 'foto' = imagen propia. */
export const BANNERS = [
  { id: 'atardecer', nombre: 'Atardecer', css: 'linear-gradient(135deg,#ff7200 0%,#b3261e 55%,#2a0a1e 100%)' },
  { id: 'oceano', nombre: 'Océano', css: 'linear-gradient(135deg,#0b3d5c 0%,#0e6f8a 50%,#35b3c9 100%)' },
  { id: 'tormenta', nombre: 'Temporal', css: 'linear-gradient(135deg,#1c1f26 0%,#3b4453 55%,#7b8799 100%)' },
  { id: 'arrecife', nombre: 'Arrecife', css: 'linear-gradient(135deg,#0f4c3a 0%,#1f8a70 50%,#d9c36a 100%)' },
  { id: 'noche', nombre: 'Noche', css: 'linear-gradient(135deg,#050814 0%,#1b1f4a 60%,#43307a 100%)' }
];

function base() {
  return {
    nombre: '', usuario: '', bio: '', clan: null,
    banner: 'atardecer', bannerFoto: false, avatarFoto: false,
    insignias: [], destacadas: []
  };
}

/* Perfil completo, siempre con todos los campos (rellena defaults). */
export function leer() {
  let guardado = null;
  try { guardado = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { guardado = null; }
  const p = Object.assign(base(), guardado && typeof guardado === 'object' ? guardado : {});
  if (!Array.isArray(p.insignias)) p.insignias = [];
  if (!Array.isArray(p.destacadas)) p.destacadas = [];
  if (!BANNERS.some(b => b.id === p.banner)) p.banner = 'atardecer';
  return p;
}

function guardar(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
    throw new Error('No se pudo guardar el perfil: ' + (e && e.message ? e.message : 'almacenamiento no disponible'));
  }
  return p;
}

/* Normaliza un @usuario: minusculas, sin @ inicial ni espacios. */
export function normalizarUsuario(u) {
  return String(u == null ? '' : u).trim().replace(/^@+/, '').toLowerCase();
}

/* Valida y aplica los campos editables basicos. Lanza Error con mensaje
   claro para que el formulario lo muestre. */
export function actualizar(cambios) {
  const p = leer();
  if ('nombre' in cambios) {
    const n = String(cambios.nombre == null ? '' : cambios.nombre).trim();
    if (!n) throw new Error('El nombre no puede estar vacío');
    p.nombre = n.slice(0, LIMITES.nombre);
  }
  if ('usuario' in cambios) {
    const u = normalizarUsuario(cambios.usuario);
    if (u && !RE_USUARIO.test(u)) {
      throw new Error('El usuario debe tener 3-20 caracteres: letras minúsculas, números, "_" o "."');
    }
    p.usuario = u;
  }
  if ('bio' in cambios) {
    p.bio = String(cambios.bio == null ? '' : cambios.bio).trim().slice(0, LIMITES.bio);
  }
  if ('banner' in cambios) {
    if (!BANNERS.some(b => b.id === cambios.banner)) throw new Error('Banner no válido');
    p.banner = cambios.banner;
  }
  if ('bannerFoto' in cambios) p.bannerFoto = !!cambios.bannerFoto;
  if ('avatarFoto' in cambios) p.avatarFoto = !!cambios.avatarFoto;
  return guardar(p);
}

/* ---- Insignias favoritas (ids de logros ya conseguidos, max 3) ---- */

export function setInsignias(ids, conseguidos) {
  const validos = new Set(conseguidos || []);
  const limpios = [...new Set((ids || []).filter(id => validos.has(id)))].slice(0, LIMITES.insignias);
  const p = leer();
  p.insignias = limpios;
  return guardar(p);
}

/* Alterna una insignia. Devuelve el perfil; lanza si se supera el maximo. */
export function alternarInsignia(id, conseguidos) {
  const p = leer();
  const actuales = p.insignias.filter(x => x !== id);
  if (actuales.length === p.insignias.length) {
    if (actuales.length >= LIMITES.insignias) throw new Error('Máximo ' + LIMITES.insignias + ' insignias favoritas');
    actuales.push(id);
  }
  return setInsignias(actuales, conseguidos);
}

/* ---- Capturas destacadas (ids del cuaderno, max 6) ---- */

export function alternarDestacada(id) {
  const p = leer();
  const actuales = p.destacadas.filter(x => x !== id);
  if (actuales.length === p.destacadas.length) {
    if (actuales.length >= LIMITES.destacadas) throw new Error('Máximo ' + LIMITES.destacadas + ' capturas destacadas');
    actuales.push(id);
  }
  p.destacadas = actuales;
  return guardar(p);
}

/* Descarta referencias a capturas que ya no existen en el cuaderno. */
export function destacadasVigentes(capturas) {
  const porId = new Map((capturas || []).map(c => [c.id, c]));
  return leer().destacadas.map(id => porId.get(id)).filter(Boolean);
}

/* ---- Clan / grupo ---- */

function b64e(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64d(s) { return decodeURIComponent(escape(atob(s))); }

function limpiarEtiqueta(e) {
  return String(e == null ? '' : e).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function crearClan(cfg) {
  const nombre = String((cfg && cfg.nombre) || '').trim().slice(0, LIMITES.clan);
  if (!nombre) throw new Error('El clan necesita un nombre');
  const etiqueta = limpiarEtiqueta(cfg.etiqueta) || nombre.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  if (!RE_ETIQUETA.test(etiqueta)) throw new Error('La etiqueta debe tener 2-5 letras o números');
  const p = leer();
  p.clan = {
    id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nombre, etiqueta, fundador: true, desde: new Date().toISOString().slice(0, 10)
  };
  return guardar(p);
}

export function codigoClan() {
  const c = leer().clan;
  if (!c) throw new Error('No perteneces a ningún clan');
  return PREFIJO_CLAN + b64e(JSON.stringify({ t: 'clan', id: c.id, nombre: c.nombre, etiqueta: c.etiqueta }));
}

/* Valida el esquema de un codigo de clan ajeno ANTES de persistirlo. */
function validarClan(o) {
  if (!o || o.t !== 'clan') throw new Error('No es un código de clan');
  if (typeof o.id !== 'string' || !/^c_[a-z0-9]{4,24}$/.test(o.id)) throw new Error('Código de clan sin identificador válido');
  if (typeof o.nombre !== 'string' || !o.nombre.trim()) throw new Error('Código de clan sin nombre');
  if (typeof o.etiqueta !== 'string' || !RE_ETIQUETA.test(o.etiqueta)) throw new Error('Código de clan con etiqueta no válida');
}

export function unirseClan(codigo) {
  const s = String(codigo == null ? '' : codigo).trim();
  const i = s.indexOf(PREFIJO_CLAN);
  if (i < 0) throw new Error('No es un código de clan de PescaPro');
  let o;
  try { o = JSON.parse(b64d(s.slice(i + PREFIJO_CLAN.length).split(/\s/)[0])); }
  catch (e) { throw new Error('Código dañado o incompleto'); }
  validarClan(o);
  const p = leer();
  p.clan = {
    id: o.id, nombre: o.nombre.trim().slice(0, LIMITES.clan), etiqueta: o.etiqueta,
    fundador: false, desde: new Date().toISOString().slice(0, 10)
  };
  return guardar(p);
}

export function salirClan() {
  const p = leer();
  p.clan = null;
  return guardar(p);
}

/* Datos que se muestran a otros (tarjeta publica): sin ids internos. */
export function publico(p) {
  p = p || leer();
  return {
    nombre: p.nombre || 'Pescador local',
    usuario: p.usuario || '',
    bio: p.bio || '',
    clan: p.clan ? { nombre: p.clan.nombre, etiqueta: p.clan.etiqueta } : null,
    banner: p.banner,
    insignias: p.insignias.slice()
  };
}

export function bannerCss(id) {
  const b = BANNERS.find(x => x.id === id) || BANNERS[0];
  return b.css;
}
