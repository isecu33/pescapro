/* PescaPro - Fotos de capturas: compresión con canvas y almacenamiento en
   IndexedDB (mucho más capacidad que localStorage; todo queda en el dispositivo).
   Si el navegador no tiene IndexedDB, la app degrada sin fotos y sin errores. */

const DB = 'pp_fotos', STORE = 'fotos';
let dbp = null;

function db() {
  if (typeof indexedDB === 'undefined' || !indexedDB) {
    return Promise.reject(new Error('IndexedDB no disponible'));
  }
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('No se pudo abrir IndexedDB'));
    });
  }
  return dbp;
}

/* Guarda un dataURL JPEG bajo un id. Devuelve promesa. */
export function guardar(id, dataUrl) {
  return db().then(d => new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  }));
}

/* Devuelve el dataURL o null (nunca rechaza) */
export function obtener(id) {
  return db().then(d => new Promise((res, rej) => {
    const rq = d.transaction(STORE).objectStore(STORE).get(id);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  })).catch(() => null);
}

export function borrar(id) {
  return db().then(d => new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  })).catch(() => false);
}

/* Comprime un File/Blob de imagen a JPEG (máx. maxLado px) y devuelve dataURL */
export function comprimir(file, maxLado, calidad) {
  maxLado = maxLado || 1000; calidad = calidad || 0.72;
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const esc = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * esc));
        const h = Math.max(1, Math.round(img.height * esc));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', calidad));
      } catch (e) { URL.revokeObjectURL(url); rej(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagen no legible')); };
    img.src = url;
  });
}
