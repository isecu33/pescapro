/* Sistema de iconos propio — port del legacy www/js/iconos.js como módulo ES.
   Devuelve elementos SVG del DOM (sin innerHTML de datos externos). */

const TRAZOS = {
  reloj:        '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l2.5 2.5"/>',
  ancla:        '<circle cx="12" cy="5" r="2"/><path d="M12 7v4M5 11h14M5 11c0 5 3 8 7 9M19 11c0 5-3 8-7 9"/>',
  viento:       '<path d="M2 8h13a2.5 2.5 0 1 0-2.5-2.5"/><path d="M2 12h17a2.5 2.5 0 1 1-2.5 2.5"/><path d="M2 16h10"/>',
  ola:          '<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  termometro:   '<path d="M14 13.5V4a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>',
  corriente:    '<path d="M3 8c3 0 3 2 6 2s3-2 6-2 3 2 5.5 2"/><path d="M18 7.3l2 1.7-2 1.7"/><path d="M3 16c3 0 3 2 6 2s3-2 6-2 3 2 5.5 2"/>',
  presion:      '<circle cx="12" cy="13" r="7"/><path d="M12 13l3-3.6M12 6V4"/><circle cx="12" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M9 20h6"/>',
  ojo:          '<path d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.6"/>',
  gota:         '<path d="M12 3S5 12.2 5 16a7 7 0 0 0 14 0C19 12.2 12 3 12 3Z"/>',
  sol:          '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  solNube:      '<circle cx="8" cy="8" r="2.3"/><path d="M8 3.5v1.3M4.6 6l.9.9M2.7 9.5H4"/><path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1.9c.3-.05.6-.1.9-.1a3.5 3.5 0 0 1 0 7Z"/>',
  nuboso:       '<path d="M6.5 18a4.2 4.2 0 0 1-.5-8.4 5.3 5.3 0 0 1 10.2-2c.35-.07.7-.1 1.05-.1a3.6 3.6 0 0 1 0 7.2H6.5Z"/>',
  niebla:       '<path d="M3 8h18M3 12h18M3 16h12"/>',
  llovizna:     '<path d="M6.5 14a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 4.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M9 18l-1 2M15 18l-1 2"/>',
  lluvia:       '<path d="M6.5 13a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 3.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M8 17l-1.5 3M12 17l-1.5 3M16 17l-1.5 3"/>',
  lluviaFuerte: '<path d="M6.5 12a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 2.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M7 16l-1.5 3M10.5 16l-1.5 3M14 16l-1.5 3M17.5 16l-1.5 3"/>',
  nieve:        '<path d="M6.5 13a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 3.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M9 18v3M7.5 19.5h3M13 18v3M11.5 19.5h3"/>',
  tormenta:     '<path d="M6.5 12a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 2.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M13 13l-3 5h3l-2 4 5-6h-3l2-3Z" fill="currentColor" stroke="none"/>',
  flechaSube:       '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  flechaBaja:       '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  flechaSubeFuerte: '<path d="M6 16l6-6 6 6"/><path d="M6 10l6-6 6 6"/>',
  flechaBajaFuerte: '<path d="M6 8l6 6 6-6"/><path d="M6 14l6 6 6-6"/>',
  flechaIgual:      '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  flechaDiagSube:   '<path d="M6 18 18 6"/><path d="M10 6h8v8"/>',
  flechaDiagBaja:   '<path d="M6 6 18 18"/><path d="M18 10v8h-8"/>',
  lunaGenerica:     '<path d="M15 3a9 9 0 1 0 6 15.9A9 9 0 0 1 15 3Z"/>',
  amanecer:         '<path d="M2 18h20"/><path d="M6 18a6 6 0 0 1 12 0"/><path d="M12 6v3M4.8 10.8l1.8 1.8M19.2 10.8l-1.8 1.8"/><path d="M9.5 5l2.5-2.5L14.5 5"/>',
  atardecer:        '<path d="M2 18h20"/><path d="M6 18a6 6 0 0 1 12 0"/><path d="M12 6v3M4.8 10.8l1.8 1.8M19.2 10.8l-1.8 1.8"/><path d="M9.5 3.5 12 6l2.5-2.5"/>',
  alerta:           '<path d="M12 3 22 20H2Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  stop:             '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8Z"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r=".9" fill="currentColor" stroke="none"/>',
  pin:              '<path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z"/><circle cx="12" cy="8" r="2.4"/>',
  ubicacion:        '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  estrellaLlena:    '<path d="M12 2l2.9 6.6 7.1.7-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7Z" fill="currentColor"/>',
  spot:             '<path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z"/><circle cx="12" cy="8" r="2.4"/>',
  favorito:         '<path d="M12 2l2.9 6.6 7.1.7-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7Z" fill="currentColor"/>',
  cerrar:           '<path d="M6 6l12 12M18 6 6 18"/>',
};

export function svg(nombre) {
  const t = TRAZOS[nombre];
  if (!t) return null;
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('class', 'pp-ico');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.7');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = t; // seguro: siempre constante hardcoded, nunca datos externos
  return el;
}

export function wmoIconName(codigo) {
  if (codigo == null || codigo <= 1) return 'sol';
  if (codigo <= 3)  return 'solNube';
  if (codigo <= 48) return 'niebla';
  if (codigo <= 55) return 'llovizna';
  if (codigo <= 67) return 'lluvia';
  if (codigo <= 79) return 'nieve';
  if (codigo <= 82) return 'lluviaFuerte';
  return 'tormenta';
}
