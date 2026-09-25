/* PescaPro - Overrides de modo desarrollador.
   SOLO tienen efecto con `import.meta.env.DEV` (npm run dev / vitest) --
   en el build de produccion (vite build / cap:sync) ACTIVO es `false` en
   tiempo de compilacion, así que Vite elimina esta rama por completo.

   No tocan datos reales (cuaderno, cache...): viven en su propia clave de
   localStorage para poder limpiarlos de un golpe sin afectar al resto de
   la app. */
const ACTIVO = !!import.meta.env.DEV;
const KEY = 'pp_dev_overrides';

function leer() {
  if (!ACTIVO) return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
}

function guardar(o) {
  if (!ACTIVO) return;
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) { /* sin espacio: no persiste */ }
}

export const activo = ACTIVO;

/* true/false fuerza el logro; null = automatico (usa la regla real) */
export function logroOverride(id) {
  if (!ACTIVO) return null;
  const o = leer();
  return o.logros && id in o.logros ? o.logros[id] : null;
}

export function setLogroOverride(id, valor) {
  if (!ACTIVO) return;
  const o = leer();
  o.logros = o.logros || {};
  if (valor == null) delete o.logros[id];
  else o.logros[id] = !!valor;
  guardar(o);
}

/* 'ok'|'amarillo'|'rojo' fuerza el nivel del banner; null = automatico */
export function seguridadOverride() {
  if (!ACTIVO) return null;
  return leer().seguridad || null;
}

export function setSeguridadOverride(nivel) {
  if (!ACTIVO) return;
  const o = leer();
  if (nivel == null) delete o.seguridad;
  else o.seguridad = nivel;
  guardar(o);
}

export function resetOverrides() {
  if (!ACTIVO) return;
  try { localStorage.removeItem(KEY); } catch (_) { /* noop */ }
}
