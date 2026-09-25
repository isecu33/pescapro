/* Iconos SVG inline para PescaPro — sin emoji, sin dependencias.
   ViewBox 24×24, stroke: currentColor, fill: none, stroke-linecap/join: round.
   Uso: icons.svg('ola', 18) → elemento SVGElement listo para appendChild.
   Uso texto: icons.WMO[codigo] → { texto, cat } donde cat es clave para svg(). */

const PATHS = {
  // --- Condiciones meteorológicas ---
  'sol':          'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
  'nube-sol':     'M12 2v1.5m3.5.9-.9.9M4.5 9H3m2.1 5.4-.9.9M9 4.5l-.9-.9M8.5 12A4.5 4.5 0 0 0 13 16.5H17a3.5 3.5 0 0 0 .5-7H17a5 5 0 0 0-8.5-3.5',
  'nube':         'M17 17H7A4 4 0 0 1 6.33 9.06 6 6 0 0 1 17.4 9H18A4 4 0 0 1 18 17z',
  'niebla':       'M4 8h16M6 12h12M8 16h8',
  'lluvia':       'M17 17H7A4 4 0 0 1 6.33 9.06 6 6 0 0 1 17.4 9H18A4 4 0 0 1 18 17zM8 21l-1-2m5 2-1-2m5 2-1-2',
  'tormenta':     'M13 11 9 17h6l-4 6M17 17H7A4 4 0 0 1 6.33 9.06 6 6 0 0 1 17.4 9H18A4 4 0 0 1 18 17z',
  'nieve':        'M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07',

  // --- Parámetros de pesca ---
  'diana':        'M3 12A9 9 0 1 0 21 12A9 9 0 1 0 3 12M6.5 12A5.5 5.5 0 1 0 17.5 12A5.5 5.5 0 1 0 6.5 12M10 12A2 2 0 1 0 14 12A2 2 0 1 0 10 12',
  'viento':       'M4 8h11a2.5 2.5 0 0 0 0-5c-1 0-1.8.5-2.2 1.3M4 12h13a2.5 2.5 0 0 1 0 5c-1 0-1.8-.5-2.2-1.3M4 16h9a2.5 2.5 0 0 0 0-5',
  'ola':          'M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0',
  'termometro':   'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
  'corriente':    'M4 12h14m-4-4 4 4-4 4',
  'presion':      'M12 6v2m-5.66.34 1.41 1.41M6 12H4m2.34 5.66 1.41-1.41M12 18v2m5.66-3.34-1.41-1.41M20 12h-2m-2.34-5.66-1.41 1.41M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 3v-1.5',
  'ojo':          'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'gota':         'M12 2 7 11a5 5 0 1 0 10 0z',

  // --- Especie (genérico, fallback) ---
  'pez':          'M3 12c0 0 4-6 9-6 2 0 4 1 6 3l2-2-1 5 1 5-2-2c-2 2-4 3-6 3-5 0-9-6-9-6zm12 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0z',
  'calamar':      'M12 4c-2 0-3 2-3 4v4l3 2 3-2V8c0-2-1-4-3-4zm-4 8-4 4m8-4 4 4M8 12l-2 6m8-6 2 6M10 20h4',
  'pulpo':        'M12 4a4 4 0 0 1 4 4c0 2-1 3-4 4-3-1-4-2-4-4a4 4 0 0 1 4-4zM8 14c0 2-1 4-2 5m4-5c0 2 0 4-1 5m4-5c0 2 0 4 1 5m2-5c0 2 1 4 2 5'
};

/* Crea y devuelve un elemento SVG listo para insertar en el DOM */
export function svg(nombre, size = 18, color = 'currentColor') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', '1.8');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.style.flexShrink = '0';
  const d = PATHS[nombre];
  if (d) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    el.appendChild(path);
  }
  return el;
}

/* Mapeo WMO → { texto, cat }. cat es la clave para svg(cat). */
export const WMO_ICO = {
  0:  { texto: 'Despejado',                   cat: 'sol' },
  1:  { texto: 'Mayormente despejado',         cat: 'nube-sol' },
  2:  { texto: 'Parcialmente nuboso',          cat: 'nube-sol' },
  3:  { texto: 'Nuboso',                       cat: 'nube' },
  45: { texto: 'Niebla',                       cat: 'niebla' },
  48: { texto: 'Niebla con cencellada',        cat: 'niebla' },
  51: { texto: 'Llovizna débil',               cat: 'lluvia' },
  53: { texto: 'Llovizna',                     cat: 'lluvia' },
  55: { texto: 'Llovizna intensa',             cat: 'lluvia' },
  61: { texto: 'Lluvia débil',                 cat: 'lluvia' },
  63: { texto: 'Lluvia',                       cat: 'lluvia' },
  65: { texto: 'Lluvia fuerte',                cat: 'lluvia' },
  66: { texto: 'Lluvia helada',                cat: 'lluvia' },
  67: { texto: 'Lluvia helada fuerte',         cat: 'lluvia' },
  71: { texto: 'Nieve débil',                  cat: 'nieve' },
  73: { texto: 'Nieve',                        cat: 'nieve' },
  75: { texto: 'Nieve fuerte',                 cat: 'nieve' },
  77: { texto: 'Cinarra',                      cat: 'nieve' },
  80: { texto: 'Chubascos débiles',            cat: 'lluvia' },
  81: { texto: 'Chubascos',                    cat: 'lluvia' },
  82: { texto: 'Chubascos fuertes',            cat: 'tormenta' },
  85: { texto: 'Chubascos de nieve',           cat: 'nieve' },
  86: { texto: 'Chubascos de nieve fuertes',   cat: 'nieve' },
  95: { texto: 'Tormenta',                     cat: 'tormenta' },
  96: { texto: 'Tormenta con granizo',         cat: 'tormenta' },
  99: { texto: 'Tormenta fuerte con granizo',  cat: 'tormenta' }
};
