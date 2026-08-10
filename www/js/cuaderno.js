/* PescaPro - Cuaderno de capturas. Guarda cada captura con una foto fija de
   las condiciones del momento y calcula TUS estadísticas (por fase de marea,
   luna, franja horaria, especie...). Con el tiempo revela tus propios patrones
   — la mejor "predicción" es tu propio historial. Sin IA: recuento puro.
   Las fotos se guardan aparte en IndexedDB (ver fotos.js) referenciadas por fotoId. */
window.PP = window.PP || {};

PP.cuaderno = (function () {
  const KEY = 'pp_cuaderno';

  function leer() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function guardar(lista) {
    localStorage.setItem(KEY, JSON.stringify(lista));
  }

  /* Crea una captura. condiciones = snapshot {viento, ola, sst, presion, faseMarea, luna, indice, momento} */
  function anadir(c) {
    const lista = leer();
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
      fotoId: c.fotoId || null,
      condiciones: c.condiciones || null
    });
    guardar(lista);
    return lista;
  }

  function borrar(id) {
    const lista = leer();
    const item = lista.find(x => x.id === id);
    if (item && item.fotoId && window.PP && PP.fotos) PP.fotos.borrar(item.fotoId);
    const nueva = lista.filter(x => x.id !== id);
    guardar(nueva);
    return nueva;
  }

  /* Estadísticas agregadas del historial */
  function estadisticas() {
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

  function exportar() {
    return JSON.stringify(leer(), null, 2);
  }
  function importar(json) {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) throw new Error('Formato no válido');
    guardar(arr);
    return arr;
  }

  return { leer, anadir, borrar, estadisticas, exportar, importar };
})();

/* Spots favoritos */
PP.favoritos = (function () {
  const KEY = 'pp_favoritos';
  function leer() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function guardar(l) { localStorage.setItem(KEY, JSON.stringify(l)); }
  function anadir(spot) {
    const l = leer();
    if (!l.some(s => Math.abs(s.lat - spot.lat) < 1e-4 && Math.abs(s.lon - spot.lon) < 1e-4)) {
      l.push({ nombre: spot.nombre, lat: spot.lat, lon: spot.lon });
      guardar(l);
    }
    return l;
  }
  function borrar(i) { const l = leer(); l.splice(i, 1); guardar(l); return l; }
  return { leer, anadir, borrar };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PP;
