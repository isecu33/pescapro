/* PescaPro - Récords personales, derivados del cuaderno de capturas. */
import { util } from '../config.js';

export function calcular(capturas) {
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
    const dia = util.diaLocal(c.fecha);
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
