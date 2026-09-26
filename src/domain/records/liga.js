/* PescaPro - Competiciones entre amigos (ligas por códigos, sin servidor).
   Todo local: las competiciones funcionan intercambiando códigos (texto
   base64) por WhatsApp o cualquier chat. Cada amigo envía su código de
   resultado y la app monta el ranking en el dispositivo.

   Los codigos vienen de OTRO dispositivo/usuario -- son entrada no
   confiable. importar() valida su esquema antes de persistir nada (fix
   CRITICAL/MEDIUM de auditoria, ver comentarios en validarInvitacion/
   validarResultado mas abajo). */
import { leer as leerCuaderno } from '../cuaderno.js';
import { especiePorId } from '../especies.js';
import { util } from '../config.js';

const KEY = 'pp_ligas', KEYP = 'pp_perfil';
const PREFIJO = 'PESCAPRO1:';
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Limite de capturas aceptadas de un codigo de resultado ajeno (fix MEDIUM:
// antes no habia limite, un codigo malicioso podia inflar localStorage).
const CAPS_MAX = 500;

export const MODOS_LIGA = {
  capturas: { id: 'capturas', nombre: 'Más capturas', unidad: 'capturas' },
  mayor: { id: 'mayor', nombre: 'La pieza más grande', unidad: 'cm' },
  puntos: { id: 'puntos', nombre: 'Puntos por talla', unidad: 'pts' }
};

/* ---- perfil ---- */
export function perfil() {
  try { return JSON.parse(localStorage.getItem(KEYP) || 'null'); } catch (e) { return null; }
}
/* `pp_perfil` lo comparte domain/perfil.js (bio, clan, banner...): se
   fusiona en vez de sobrescribir para no borrar el resto del perfil. */
export function setNombre(n) {
  // Misma regla que perfil.actualizar(): el nombre es uno solo en la app.
  const nombre = String(n == null ? '' : n).trim().slice(0, 24);
  if (!nombre) throw new Error('El nombre no puede estar vacío');
  const previo = perfil();
  const base = previo && typeof previo === 'object' ? previo : {};
  localStorage.setItem(KEYP, JSON.stringify(Object.assign({}, base, { nombre })));
  return perfil();
}

/* ---- almacenamiento ---- */
export function listar() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}
function guardar(ligas) { localStorage.setItem(KEY, JSON.stringify(ligas)); }
export function porId(id) { return listar().find(l => l.id === id) || null; }

export function crear(cfg) {
  const p = perfil();
  if (!p || !p.nombre) throw new Error('Falta tu nombre de pescador');
  if (!cfg.nombre || !cfg.desde || !cfg.hasta) throw new Error('Faltan datos de la competición');
  if (cfg.hasta < cfg.desde) throw new Error('La fecha de fin es anterior al inicio');
  const liga = {
    id: 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nombre: String(cfg.nombre).slice(0, 40),
    desde: cfg.desde, hasta: cfg.hasta,
    modo: MODOS_LIGA[cfg.modo] ? cfg.modo : 'puntos',
    participantes: [{ nombre: p.nombre, esYo: true, caps: [], act: Date.now() }],
    creada: Date.now()
  };
  const ligas = listar(); ligas.unshift(liga); guardar(ligas);
  return liga;
}

export function borrar(id) { guardar(listar().filter(l => l.id !== id)); }

export function estado(liga, ahora) {
  const hoy = util.diaLocal(ahora || new Date());
  if (hoy < liga.desde) return 'próxima';
  if (hoy > liga.hasta) return 'finalizada';
  return 'activa';
}

/* ---- capturas y puntuación ---- */

export function dentroDelPeriodo(fechaISO, liga) {
  const d = util.diaLocal(fechaISO);
  return d >= liga.desde && d <= liga.hasta;
}

/* Mis capturas del cuaderno dentro del periodo, en formato compacto [especie, talla, peso, fecha] */
export function misCapturas(liga) {
  return leerCuaderno()
    .filter(c => dentroDelPeriodo(c.fecha, liga))
    .map(c => [c.especie, c.talla, c.peso, c.fecha]);
}

/* Actualiza mi entrada de la liga desde el cuaderno */
export function actualizarMiResultado(id) {
  const ligas = listar();
  const liga = ligas.find(l => l.id === id);
  if (!liga) return null;
  const yo = liga.participantes.find(p => p.esYo);
  if (yo) { yo.caps = misCapturas(liga); yo.act = Date.now(); guardar(ligas); }
  return liga;
}

export function puntuar(liga, caps) {
  const tallas = caps.map(c => c[1]).filter(t => t != null);
  const mayor = tallas.length ? Math.max(...tallas) : 0;
  let metrica, detalle;
  if (liga.modo === 'capturas') {
    metrica = caps.length;
    detalle = caps.length + ' capturas';
  } else if (liga.modo === 'mayor') {
    metrica = mayor;
    const mejor = caps.find(c => c[1] === mayor);
    detalle = mayor > 0 ? (nombreEspecie(mejor[0]) + ' de ' + mayor + ' cm') : 'Sin piezas medidas';
  } else { // puntos: suma de tallas; sin talla = 10 pts
    metrica = caps.reduce((s, c) => s + (c[1] != null ? c[1] : 10), 0);
    metrica = Math.round(metrica);
    detalle = metrica + ' pts · ' + caps.length + ' capturas';
  }
  return { metrica, detalle, n: caps.length, mayor };
}

function nombreEspecie(id) {
  const e = especiePorId(id);
  return e ? e.nombre : id;
}

export function ranking(liga) {
  return liga.participantes
    .map(p => ({ nombre: p.nombre, esYo: !!p.esYo, act: p.act, ...puntuar(liga, p.caps || []) }))
    .sort((a, b) => (b.metrica - a.metrica) || (b.n - a.n) || a.nombre.localeCompare(b.nombre));
}

/* ---- códigos compartibles (base64 unicode-safe) ---- */

function b64e(str) {
  return (typeof btoa !== 'undefined')
    ? btoa(unescape(encodeURIComponent(str)))
    : Buffer.from(str, 'utf8').toString('base64');
}
function b64d(b) {
  return (typeof atob !== 'undefined')
    ? decodeURIComponent(escape(atob(b)))
    : Buffer.from(b, 'base64').toString('utf8');
}
function enc(obj) { return PREFIJO + b64e(JSON.stringify(obj)); }
function dec(s) {
  s = String(s || '').trim();
  const i = s.indexOf(PREFIJO);
  if (i < 0) throw new Error('Código no válido (falta el prefijo PESCAPRO1)');
  let obj;
  try { obj = JSON.parse(b64d(s.slice(i + PREFIJO.length).split(/\s/)[0])); }
  catch (e) { throw new Error('Código dañado o incompleto'); }
  return obj;
}

export function codigoInvitacion(liga) {
  return enc({ t: 'liga', id: liga.id, nombre: liga.nombre, desde: liga.desde, hasta: liga.hasta, modo: liga.modo });
}

export function codigoResultado(id) {
  const liga = actualizarMiResultado(id);
  if (!liga) throw new Error('Competición no encontrada');
  const p = perfil();
  return enc({ t: 'res', id: liga.id, nombre: p.nombre, caps: misCapturas(liga) });
}

/* Valida el esquema de un codigo de invitacion decodificado ANTES de
   persistirlo. Fix de auditoria (CRITICAL/MEDIUM): el codigo viene de otro
   dispositivo -- sin esto, un "nombre" o fechas manipuladas se guardaban
   tal cual y llegaban sin sanear a fmtDia()/innerHTML en la capa de
   presentacion (ver plan de migracion, fixes de XSS). */
function validarInvitacion(o) {
  if (!o.id || typeof o.id !== 'string') throw new Error('Código de invitación sin identificador válido');
  if (!o.nombre || typeof o.nombre !== 'string') throw new Error('Código de invitación sin nombre de competición');
  if (typeof o.desde !== 'string' || !RE_FECHA.test(o.desde) || typeof o.hasta !== 'string' || !RE_FECHA.test(o.hasta)) {
    throw new Error('Código de invitación con fechas no válidas');
  }
}

/* Idem para un codigo de resultado. */
function validarResultado(o) {
  if (!o.id || typeof o.id !== 'string') throw new Error('Código de resultado sin identificador válido');
  if (!o.nombre || typeof o.nombre !== 'string') throw new Error('Código de resultado sin nombre de pescador');
  if (o.caps != null && !Array.isArray(o.caps)) throw new Error('Código de resultado con formato de capturas no válido');
}

/* Importa un código (invitación o resultado). Devuelve {tipo, liga, mensaje}. */
export function importar(codigo) {
  const o = dec(codigo);
  if (o.t === 'liga') {
    validarInvitacion(o);
    if (porId(o.id)) throw new Error('Ya estás en esa competición');
    const p = perfil();
    if (!p || !p.nombre) throw new Error('Falta tu nombre de pescador');
    const liga = {
      id: o.id,
      // Fix MEDIUM: faltaba el mismo .slice(0,40) que ya aplica crear().
      nombre: String(o.nombre).slice(0, 40),
      desde: o.desde, hasta: o.hasta,
      modo: MODOS_LIGA[o.modo] ? o.modo : 'puntos',
      participantes: [{ nombre: p.nombre, esYo: true, caps: [], act: Date.now() }],
      creada: Date.now()
    };
    const ligas = listar(); ligas.unshift(liga); guardar(ligas);
    actualizarMiResultado(liga.id);
    return { tipo: 'liga', liga: porId(liga.id), mensaje: 'Te has unido a «' + liga.nombre + '»' };
  }
  if (o.t === 'res') {
    validarResultado(o);
    const ligas = listar();
    const liga = ligas.find(l => l.id === o.id);
    if (!liga) throw new Error('Ese resultado es de una competición que no tienes. Pide antes el código de invitación.');
    // El nombre se normaliza UNA vez y se usa igual para comparar y para
    // guardar: antes se buscaba por el nombre completo pero se guardaba
    // recortado a 24, y un nombre largo se duplicaba en cada reimportacion.
    const nombre = String(o.nombre).trim().slice(0, 24);
    const yo = liga.participantes.find(p => p.esYo);
    if (yo && yo.nombre === nombre) throw new Error('Ese código es tuyo, no de un amigo');
    // filtra por si acaso al periodo, sanea formato y acota tamaño
    // (fix MEDIUM: sin CAPS_MAX un codigo ajeno podia inflar localStorage)
    const caps = (Array.isArray(o.caps) ? o.caps : [])
      .filter(c => Array.isArray(c) && dentroDelPeriodo(c[3], liga))
      .slice(0, CAPS_MAX)
      .map(c => [String(c[0]), c[1] != null ? Number(c[1]) : null, c[2] != null ? Number(c[2]) : null, c[3]]);
    const previo = liga.participantes.find(p => !p.esYo && p.nombre === nombre);
    if (previo) { previo.caps = caps; previo.act = Date.now(); }
    else liga.participantes.push({ nombre, esYo: false, caps, act: Date.now() });
    guardar(ligas);
    return { tipo: 'res', liga: porId(liga.id), mensaje: 'Resultado de ' + nombre + ' añadido (' + caps.length + ' capturas)' };
  }
  throw new Error('Tipo de código desconocido');
}
