/* PescaPro - Récords personales, logros y competiciones entre amigos.
   Todo local y sin servidor: las competiciones funcionan intercambiando
   códigos (texto base64) por WhatsApp o cualquier chat. Cada amigo envía su
   código de resultado y la app monta el ranking en el dispositivo. */
window.PP = window.PP || {};

/* ============ RÉCORDS PERSONALES (derivados del cuaderno) ============ */

PP.records = (function () {

  function calcular(capturas) {
    const st = {
      total: capturas.length,
      especiesDistintas: 0,
      conFoto: 0,
      spotsDistintos: 0,
      porEspecie: {},   // id -> {n, talla:{valor,fecha}, peso:{valor,fecha}}
      mejorDia: null    // {dia:'yyyy-mm-dd', n}
    };
    const especies = new Set(), spots = new Set(), porDia = {};
    for (const c of capturas) {
      especies.add(c.especie);
      if (c.fotoId) st.conFoto++;
      if (c.spot && c.spot.nombre) spots.add(c.spot.nombre);
      const dia = (c.fecha || '').slice(0, 10);
      if (dia) porDia[dia] = (porDia[dia] || 0) + 1;

      const e = st.porEspecie[c.especie] || (st.porEspecie[c.especie] = { n: 0, talla: null, peso: null });
      e.n++;
      if (c.talla != null && (!e.talla || c.talla > e.talla.valor)) e.talla = { valor: c.talla, fecha: c.fecha };
      if (c.peso != null && (!e.peso || c.peso > e.peso.valor)) e.peso = { valor: c.peso, fecha: c.fecha };
    }
    st.especiesDistintas = especies.size;
    st.spotsDistintos = spots.size;
    for (const d in porDia) {
      if (!st.mejorDia || porDia[d] > st.mejorDia.n) st.mejorDia = { dia: d, n: porDia[d] };
    }
    return st;
  }

  return { calcular };
})();

/* ============ LOGROS (medallas desbloqueables, reglas puras) ============ */

PP.logros = (function () {
  const CEFALOPODOS = ['calamar', 'sepia', 'pulpo'];

  const LISTA = [
    { id: 'primera', icono: '🎣', nombre: 'Primera captura', desc: 'Registra tu primera captura',
      check: (st) => st.total >= 1, prog: (st) => [Math.min(st.total, 1), 1] },
    { id: 'cinco', icono: '🐟', nombre: 'Cogiendo el ritmo', desc: '5 capturas',
      check: (st) => st.total >= 5, prog: (st) => [Math.min(st.total, 5), 5] },
    { id: 'veinticinco', icono: '🎖️', nombre: 'Pescador constante', desc: '25 capturas',
      check: (st) => st.total >= 25, prog: (st) => [Math.min(st.total, 25), 25] },
    { id: 'cien', icono: '👑', nombre: 'Leyenda del espigón', desc: '100 capturas',
      check: (st) => st.total >= 100, prog: (st) => [Math.min(st.total, 100), 100] },
    { id: 'coleccionista', icono: '📚', nombre: 'Coleccionista', desc: '5 especies distintas',
      check: (st) => st.especiesDistintas >= 5, prog: (st) => [Math.min(st.especiesDistintas, 5), 5] },
    { id: 'maestro', icono: '🧙', nombre: 'Maestro de especies', desc: '10 especies distintas',
      check: (st) => st.especiesDistintas >= 10, prog: (st) => [Math.min(st.especiesDistintas, 10), 10] },
    { id: 'trofeo-lubina', icono: '🏆', nombre: 'Lubina de trofeo', desc: 'Una lubina de 50 cm o más',
      check: (st) => !!(st.porEspecie.lubina && st.porEspecie.lubina.talla && st.porEspecie.lubina.talla.valor >= 50) },
    { id: 'calamarero', icono: '🦑', nombre: 'Rey del eging', desc: '10 cefalópodos (calamar, sepia o pulpo)',
      check: (st) => cefalopodos(st) >= 10, prog: (st) => [Math.min(cefalopodos(st), 10), 10] },
    { id: 'madrugador', icono: '🌅', nombre: 'Madrugador', desc: 'Captura entre las 5:00 y las 8:00',
      check: (st, caps) => caps.some(c => horaDe(c) >= 5 && horaDe(c) < 8) },
    { id: 'nocturno', icono: '🌙', nombre: 'Ave nocturna', desc: 'Captura entre las 0:00 y las 5:00',
      check: (st, caps) => caps.some(c => horaDe(c) >= 0 && horaDe(c) < 5) },
    { id: 'contracorriente', icono: '⛈️', nombre: 'Contra pronóstico', desc: 'Captura con índice de pesca < 30',
      check: (st, caps) => caps.some(c => c.condiciones && c.condiciones.indice != null && c.condiciones.indice < 30) },
    { id: 'dia-perfecto', icono: '🔥', nombre: 'Día perfecto', desc: '5 capturas en un mismo día',
      check: (st) => !!(st.mejorDia && st.mejorDia.n >= 5), prog: (st) => [Math.min(st.mejorDia ? st.mejorDia.n : 0, 5), 5] },
    { id: 'fotografo', icono: '📸', nombre: 'Fotógrafo', desc: '5 capturas con foto',
      check: (st) => st.conFoto >= 5, prog: (st) => [Math.min(st.conFoto, 5), 5] },
    { id: 'viajero', icono: '🧭', nombre: 'Explorador de costas', desc: 'Capturas en 3 spots distintos',
      check: (st) => st.spotsDistintos >= 3, prog: (st) => [Math.min(st.spotsDistintos, 3), 3] }
  ];

  function cefalopodos(st) {
    return CEFALOPODOS.reduce((s, id) => s + (st.porEspecie[id] ? st.porEspecie[id].n : 0), 0);
  }
  function horaDe(c) {
    const d = new Date(c.fecha);
    return isNaN(d) ? -1 : d.getHours();
  }

  /* Devuelve la lista de logros con estado {conseguido, progreso:[actual,meta]|null} */
  function evaluar(capturas) {
    const st = PP.records.calcular(capturas);
    return LISTA.map(l => ({
      id: l.id, icono: l.icono, nombre: l.nombre, desc: l.desc,
      conseguido: !!l.check(st, capturas),
      progreso: l.prog ? l.prog(st) : null
    }));
  }

  return { LISTA, evaluar };
})();

/* ============ COMPETICIONES (ligas por códigos, sin servidor) ============ */

PP.liga = (function () {
  const KEY = 'pp_ligas', KEYP = 'pp_perfil';
  const PREFIJO = 'PESCAPRO1:';

  const MODOS = {
    capturas: { id: 'capturas', nombre: 'Más capturas', unidad: 'capturas' },
    mayor: { id: 'mayor', nombre: 'La pieza más grande', unidad: 'cm' },
    puntos: { id: 'puntos', nombre: 'Puntos por talla', unidad: 'pts' }
  };

  /* ---- perfil ---- */
  function perfil() {
    try { return JSON.parse(localStorage.getItem(KEYP) || 'null'); } catch (e) { return null; }
  }
  function setNombre(n) {
    localStorage.setItem(KEYP, JSON.stringify({ nombre: String(n).trim().slice(0, 24) }));
    return perfil();
  }

  /* ---- almacenamiento ---- */
  function listar() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function guardar(ligas) { localStorage.setItem(KEY, JSON.stringify(ligas)); }
  function porId(id) { return listar().find(l => l.id === id) || null; }

  function crear(cfg) {
    const p = perfil();
    if (!p || !p.nombre) throw new Error('Falta tu nombre de pescador');
    if (!cfg.nombre || !cfg.desde || !cfg.hasta) throw new Error('Faltan datos de la competición');
    if (cfg.hasta < cfg.desde) throw new Error('La fecha de fin es anterior al inicio');
    const liga = {
      id: 'l_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nombre: String(cfg.nombre).slice(0, 40),
      desde: cfg.desde, hasta: cfg.hasta,
      modo: MODOS[cfg.modo] ? cfg.modo : 'puntos',
      participantes: [{ nombre: p.nombre, esYo: true, caps: [], act: Date.now() }],
      creada: Date.now()
    };
    const ligas = listar(); ligas.unshift(liga); guardar(ligas);
    return liga;
  }

  function borrar(id) { guardar(listar().filter(l => l.id !== id)); }

  function estado(liga, ahora) {
    const hoy = (ahora || new Date()).toISOString().slice(0, 10);
    if (hoy < liga.desde) return 'próxima';
    if (hoy > liga.hasta) return 'finalizada';
    return 'activa';
  }

  /* ---- capturas y puntuación ---- */

  function dentroDelPeriodo(fechaISO, liga) {
    const d = (fechaISO || '').slice(0, 10);
    return d >= liga.desde && d <= liga.hasta;
  }

  /* Mis capturas del cuaderno dentro del periodo, en formato compacto [especie, talla, peso, fecha] */
  function misCapturas(liga) {
    return PP.cuaderno.leer()
      .filter(c => dentroDelPeriodo(c.fecha, liga))
      .map(c => [c.especie, c.talla, c.peso, c.fecha]);
  }

  /* Actualiza mi entrada de la liga desde el cuaderno */
  function actualizarMiResultado(id) {
    const ligas = listar();
    const liga = ligas.find(l => l.id === id);
    if (!liga) return null;
    const yo = liga.participantes.find(p => p.esYo);
    if (yo) { yo.caps = misCapturas(liga); yo.act = Date.now(); guardar(ligas); }
    return liga;
  }

  function puntuar(liga, caps) {
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
    const e = PP.especiePorId ? PP.especiePorId(id) : null;
    return e ? e.nombre : id;
  }

  function ranking(liga) {
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

  function codigoInvitacion(liga) {
    return enc({ t: 'liga', id: liga.id, nombre: liga.nombre, desde: liga.desde, hasta: liga.hasta, modo: liga.modo });
  }

  function codigoResultado(id) {
    const liga = actualizarMiResultado(id);
    if (!liga) throw new Error('Competición no encontrada');
    const p = perfil();
    return enc({ t: 'res', id: liga.id, nombre: p.nombre, caps: misCapturas(liga) });
  }

  /* Importa un código (invitación o resultado). Devuelve {tipo, liga, mensaje}. */
  function importar(codigo) {
    const o = dec(codigo);
    if (o.t === 'liga') {
      if (porId(o.id)) throw new Error('Ya estás en esa competición');
      const p = perfil();
      if (!p || !p.nombre) throw new Error('Falta tu nombre de pescador');
      const liga = {
        id: o.id, nombre: o.nombre, desde: o.desde, hasta: o.hasta,
        modo: MODOS[o.modo] ? o.modo : 'puntos',
        participantes: [{ nombre: p.nombre, esYo: true, caps: [], act: Date.now() }],
        creada: Date.now()
      };
      const ligas = listar(); ligas.unshift(liga); guardar(ligas);
      actualizarMiResultado(liga.id);
      return { tipo: 'liga', liga: porId(liga.id), mensaje: 'Te has unido a «' + liga.nombre + '»' };
    }
    if (o.t === 'res') {
      const ligas = listar();
      const liga = ligas.find(l => l.id === o.id);
      if (!liga) throw new Error('Ese resultado es de una competición que no tienes. Pide antes el código de invitación.');
      const yo = liga.participantes.find(p => p.esYo);
      if (yo && yo.nombre === o.nombre) throw new Error('Ese código es tuyo, no de un amigo');
      // filtra por si acaso al periodo y sanea formato
      const caps = (Array.isArray(o.caps) ? o.caps : [])
        .filter(c => Array.isArray(c) && dentroDelPeriodo(c[3], liga))
        .map(c => [String(c[0]), c[1] != null ? Number(c[1]) : null, c[2] != null ? Number(c[2]) : null, c[3]]);
      const previo = liga.participantes.find(p => !p.esYo && p.nombre === o.nombre);
      if (previo) { previo.caps = caps; previo.act = Date.now(); }
      else liga.participantes.push({ nombre: String(o.nombre).slice(0, 24), esYo: false, caps, act: Date.now() });
      guardar(ligas);
      return { tipo: 'res', liga: porId(liga.id), mensaje: 'Resultado de ' + o.nombre + ' añadido (' + caps.length + ' capturas)' };
    }
    throw new Error('Tipo de código desconocido');
  }

  return { MODOS, perfil, setNombre, listar, porId, crear, borrar, estado, misCapturas, actualizarMiResultado, puntuar, ranking, codigoInvitacion, codigoResultado, importar, dentroDelPeriodo };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PP;
