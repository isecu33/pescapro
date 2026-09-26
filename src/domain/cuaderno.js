/* PescaPro - Cuaderno de capturas. Guarda cada captura con una foto fija de
   las condiciones del momento y calcula TUS estadísticas (por fase de marea,
   luna, franja horaria, especie...). Con el tiempo revela tus propios patrones
   — la mejor "predicción" es tu propio historial. Sin IA: recuento puro.
   Las fotos se guardan aparte en IndexedDB (ver fotos.js) referenciadas por
   fotoIds (hasta MAX_FOTOS); fotoId se mantiene como alias del primer
   elemento por compatibilidad con capturas antiguas y con el codigo que
   solo necesita una miniatura (historial, perfil, records/logros). */
import { borrar as borrarFoto } from './fotos.js';

const KEY = 'pp_cuaderno';

export const MAX_FOTOS = 5;

export function leer() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (e) { return []; }
}

/* Fix HIGH de auditoria: antes escribia en localStorage sin try/catch (a
   diferencia de api.js/app.js). Guardar una captura NO es best-effort como
   la cache de api.js, asi que aqui no se traga el fallo: se propaga con un
   mensaje claro para que la UI (Fase 3/4) pueda mostrarlo en vez de dejar
   el formulario de guardado colgado sin explicacion. */
function guardar(lista) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch (e) {
    throw new Error('No se pudo guardar el cuaderno: ' + (e && e.message ? e.message : 'almacenamiento no disponible'));
  }
}

/* Crea una captura. condiciones = snapshot {viento, ola, sst, presion, faseMarea, luna, indice, momento} */
export function anadir(c) {
  const lista = leer();
  const fotoIds = (Array.isArray(c.fotoIds) ? c.fotoIds : (c.fotoId ? [c.fotoId] : []))
    .filter(Boolean).slice(0, MAX_FOTOS);
  lista.unshift({
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    fecha: c.fecha || new Date().toISOString(),
    especie: c.especie || 'otra',
    talla: c.talla || null,
    peso: c.peso || null,
    modalidad: c.modalidad || null,
    senuelo: c.senuelo || null,
    spot: c.spot || null,
    notas: c.notas || null,
    fotoId: fotoIds[0] || null,
    fotoIds,
    condiciones: c.condiciones || null
  });
  guardar(lista);
  return lista;
}

export function borrar(id) {
  const lista = leer();
  const item = lista.find(x => x.id === id);
  if (item) {
    const ids = Array.isArray(item.fotoIds) && item.fotoIds.length
      ? item.fotoIds : (item.fotoId ? [item.fotoId] : []);
    ids.forEach(fid => borrarFoto(fid));
  }
  const nueva = lista.filter(x => x.id !== id);
  guardar(nueva);
  return nueva;
}

/* Estadísticas agregadas del historial */
export function estadisticas() {
  const lista = leer();
  const st = {
    total: lista.length,
    porEspecie: {}, porFaseMarea: {}, porLuna: {}, porFranja: {}, porModalidad: {}
  };
  const franjas = { amanecer: 'Amanecer', dia: 'Día', atardecer: 'Atardecer', noche: 'Noche' };
  for (const c of lista) {
    st.porEspecie[c.especie] = (st.porEspecie[c.especie] || 0) + 1;
    if (c.modalidad) st.porModalidad[c.modalidad] = (st.porModalidad[c.modalidad] || 0) + 1;
    const cond = c.condiciones || {};
    if (cond.faseMarea) st.porFaseMarea[cond.faseMarea] = (st.porFaseMarea[cond.faseMarea] || 0) + 1;
    if (cond.luna) st.porLuna[cond.luna] = (st.porLuna[cond.luna] || 0) + 1;
    if (cond.momento && franjas[cond.momento]) st.porFranja[franjas[cond.momento]] = (st.porFranja[franjas[cond.momento]] || 0) + 1;
  }
  return st;
}

/* Un snapshot de condiciones se considera incompleto cuando falta la fase de
   marea o la luna -- los dos datos que alimentan "Tus patrones" (ver
   estadisticas()) y que pueden faltar en silencio cuando la fecha de la
   captura se edita fuera de la ventana de pronostico cargada (ver
   docs/ux-audit/06-cuaderno.md). Se usa tanto en el formulario de registro
   (aviso antes de guardar) como en la tarjeta de historial (marca tras
   guardar) -- misma señal, una sola definicion. */
export function condicionesIncompletas(cond) {
  return !cond || cond.faseMarea == null || cond.luna == null;
}

export function exportar() {
  return JSON.stringify(leer(), null, 2);
}

export function importar(json) {
  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) throw new Error('Formato no válido');
  guardar(arr);
  return arr;
}

/* Spots favoritos */
const KEY_FAV = 'pp_favoritos';

function leerFav() {
  try { return JSON.parse(localStorage.getItem(KEY_FAV) || '[]'); }
  catch (e) { return []; }
}

function guardarFav(l) {
  try {
    localStorage.setItem(KEY_FAV, JSON.stringify(l));
  } catch (e) {
    throw new Error('No se pudo guardar los favoritos: ' + (e && e.message ? e.message : 'almacenamiento no disponible'));
  }
}

export const favoritos = {
  leer: leerFav,
  anadir(spot) {
    const l = leerFav();
    if (!l.some(s => Math.abs(s.lat - spot.lat) < 1e-4 && Math.abs(s.lon - spot.lon) < 1e-4)) {
      l.push({ nombre: spot.nombre, lat: spot.lat, lon: spot.lon });
      guardarFav(l);
    }
    return l;
  },
  borrar(i) {
    const l = leerFav();
    l.splice(i, 1);
    guardarFav(l);
    return l;
  }
};
