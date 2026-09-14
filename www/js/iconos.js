/* PescaPro - Sistema de iconos propio (SVG en línea, trazo tipo SF Symbols).
   Sustituye al emoji en los controles de navegación, cabecera y las
   rejillas de condiciones. El emoji de contenido (especies, logros,
   medallas, cabeceras decorativas) se mantiene tal cual: aporta calidez
   donde no hace falta precisión de trazo. */
window.PP = window.PP || {};

PP.iconos = (function () {
  let contador = 0;

  function envolver(inner, extra) {
    return '<svg class="pp-ico' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  const TRAZOS = {
    cana: '<path d="M4 20 16 6"/><path d="M16 6c2 3.5 3 7 1.6 10.5"/><path d="M17.6 16.5c-1.6.6-2.2 1.8-1.6 3"/><circle cx="6" cy="18" r="1.1" fill="currentColor" stroke="none"/>',
    calamar: '<ellipse cx="12" cy="8" rx="4.4" ry="5.4"/><path d="M9 13c-1 2-1 4-2 6M11 13.4c0 2-.3 4-.6 6M13 13.4c0 2 .3 4 .6 6M15 13c1 2 1 4 2 6"/>',
    surf: '<path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M17 18 21 5"/>',
    grafico: '<path d="M3 17 9 11 13 14 21 5"/><path d="M21 5h-5M21 5v5"/>',
    mapa: '<path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z"/><circle cx="12" cy="8" r="2.4"/>',
    pin: '<path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z"/><circle cx="12" cy="8" r="2.4"/>',
    pez: '<path d="M3 12c2-4 7-6 11-6 2 2 4 4 4 6s-2 4-4 6c-4 0-9-2-11-6Z"/><circle cx="9" cy="10.5" r=".8" fill="currentColor" stroke="none"/>',
    libreta: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4M12 16h3"/>',
    trofeo: '<path d="M8 3h8v4c0 2.5-1.8 4.5-4 4.5S8 9.5 8 7Z"/><path d="M8 5C5 5 5 9 8 9M16 5c3 0 3 4 0 4"/><path d="M12 11.5V15M9.5 18h5M9 21h6"/>',
    estrella: '<path d="M12 2l2.9 6.6 7.1.7-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7Z"/>',
    estrellaLlena: '<path d="M12 2l2.9 6.6 7.1.7-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7Z" fill="currentColor"/>',
    refrescar: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M18 4v4h-4M6 20v-4h4"/>',
    alerta: '<path d="M12 3 22 20H2Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
    stop: '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8Z"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r=".9" fill="currentColor" stroke="none"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    solNube: '<circle cx="8" cy="8" r="2.3"/><path d="M8 3.5v1.3M4.6 6l.9.9M2.7 9.5H4"/><path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1.9c.3-.05.6-.1.9-.1a3.5 3.5 0 0 1 0 7Z"/>',
    nuboso: '<path d="M6.5 18a4.2 4.2 0 0 1-.5-8.4 5.3 5.3 0 0 1 10.2-2c.35-.07.7-.1 1.05-.1a3.6 3.6 0 0 1 0 7.2H6.5Z"/>',
    niebla: '<path d="M3 8h18M3 12h18M3 16h12"/>',
    llovizna: '<path d="M6.5 14a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 4.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M9 18l-1 2M15 18l-1 2"/>',
    lluvia: '<path d="M6.5 13a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 3.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M8 17l-1.5 3M12 17l-1.5 3M16 17l-1.5 3"/>',
    lluviaFuerte: '<path d="M6.5 12a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 2.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M7 16l-1.5 3M10.5 16l-1.5 3M14 16l-1.5 3M17.5 16l-1.5 3"/>',
    nieve: '<path d="M6.5 13a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 3.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M9 18v3M7.5 19.5h3M13 18v3M11.5 19.5h3M17 18v3M15.5 19.5h3"/>',
    tormenta: '<path d="M6.5 12a3.7 3.7 0 0 1-.4-7.4A4.7 4.7 0 0 1 15 2.7c.3-.06.6-.1.9-.1a3.1 3.1 0 0 1 0 6.2H6.5Z"/><path d="M13 13l-3 5h3l-2 4 5-6h-3l2-3Z" fill="currentColor" stroke="none"/>',
    viento: '<path d="M2 8h13a2.5 2.5 0 1 0-2.5-2.5"/><path d="M2 12h17a2.5 2.5 0 1 1-2.5 2.5"/><path d="M2 16h10"/>',
    ola: '<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    termometro: '<path d="M14 13.5V4a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>',
    corriente: '<path d="M3 8c3 0 3 2 6 2s3-2 6-2 3 2 5.5 2"/><path d="M18 7.3l2 1.7-2 1.7"/><path d="M3 16c3 0 3 2 6 2s3-2 6-2 3 2 5.5 2"/>',
    brujula: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5 13 13l-3.5 1.5L11 11Z" fill="currentColor" stroke="none"/>',
    presion: '<circle cx="12" cy="13" r="7"/><path d="M12 13l3-3.6M12 6V4"/><circle cx="12" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M9 20h6"/>',
    ojo: '<path d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.6"/>',
    gota: '<path d="M12 3S5 12.2 5 16a7 7 0 0 0 14 0C19 12.2 12 3 12 3Z"/>',
    lunaGenerica: '<path d="M15 3a9 9 0 1 0 6 15.9A9 9 0 0 1 15 3Z"/>',
    amanecer: '<path d="M2 18h20"/><path d="M6 18a6 6 0 0 1 12 0"/><path d="M12 6v3M4.8 10.8l1.8 1.8M19.2 10.8l-1.8 1.8"/><path d="M9.5 5l2.5-2.5L14.5 5"/>',
    atardecer: '<path d="M2 18h20"/><path d="M6 18a6 6 0 0 1 12 0"/><path d="M12 6v3M4.8 10.8l1.8 1.8M19.2 10.8l-1.8 1.8"/><path d="M9.5 3.5 12 6l2.5-2.5"/>',
    flechaSube: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
    flechaBaja: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    flechaSubeFuerte: '<path d="M6 16l6-6 6 6"/><path d="M6 10l6-6 6 6"/>',
    flechaBajaFuerte: '<path d="M6 8l6 6 6-6"/><path d="M6 14l6 6 6-6"/>',
    flechaIgual: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    flechaDiagSube: '<path d="M6 18 18 6"/><path d="M10 6h8v8"/>',
    flechaDiagBaja: '<path d="M6 6 18 18"/><path d="M18 10v8h-8"/>',
    llama: '<path d="M12 2c-1 3-5 5-5 10a5 5 0 0 0 10 0c0-2-1-3-2-4 0 2-1 3-2 2-1-1 0-3-1-4-1 1-1 3 0 4-1-1-2 0-2-1s1-3 2-3Z"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    anadir: '<path d="M12 5v14M5 12h14"/>',
    camara: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.4-2.5h5.2L16 7"/><circle cx="12" cy="14" r="3.2"/>',
    ubicacion: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    compartir: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    papelera: '<path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>',
    descarga: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
    subida: '<path d="M12 20V9"/><path d="M7 13l5-5 5 5"/><path d="M5 4h14"/>',
    bandeja: '<path d="M4 12V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6"/><path d="M4 12h4l2 3h4l2-3h4"/><path d="M4 12v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
    tarjeta: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h6M13 14h4"/>'
  };

  function svg(nombre, extra) {
    const t = TRAZOS[nombre];
    if (!t) return '';
    return envolver(t, extra);
  }

  function html(nombre, extra) {
    return '<span class="pp-ico-wrap">' + svg(nombre, extra) + '</span>';
  }

  /* Icono lunar dinámico: dibuja la fase real a partir de la iluminación (%)
     con el truco del "eclipse" (dos discos que se solapan), sin depender de
     8 emoji distintos. */
  function luna(iluminacion, creciente, extra) {
    const id = 'ppluna' + (contador++);
    const p = Math.max(0, Math.min(100, iluminacion == null ? 50 : iluminacion)) / 100;
    const r = 8, cx = 12, cy = 12;
    const d = 2 * r * p;
    const scx = cx + (creciente === false ? -1 : 1) * d;
    const inner =
      '<defs><clipPath id="' + id + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath></defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="var(--panel2)" stroke="currentColor" stroke-width="1.1"/>' +
      '<circle cx="' + scx + '" cy="' + cy + '" r="' + r + '" fill="var(--fondo)" clip-path="url(#' + id + ')"/>';
    return envolver(inner, extra);
  }

  /* Firma visual de la app: la curva de marea, reutilizada como motivo de UI
     (indicador de pestaña activa, divisores, estado de carga). */
  const ONDA_PATH = 'M1 6c2.2-3 4.4-3 6.6 0s4.4 3 6.6 0 4.4-3 6.6 0 4.4 3 6.6 0';

  return { svg, html, luna, ONDA_PATH };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PP;
