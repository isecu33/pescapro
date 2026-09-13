/* Escapado de HTML centralizado. Generaliza el esc() que hoy solo existe
   (bien hecho) en www/js/trofeos.js:14-17 -- el resto de la capa de
   presentacion antigua (ui.js, app.js, mapa.js) no lo usaba, lo que era
   la causa raiz del CRITICAL de XSS de la auditoria.

   En la capa nueva (Custom Elements con Shadow DOM, ver src/ui/components/)
   la defensa principal es NO usar innerHTML con datos dinamicos -- se
   construye el DOM con textContent/createElement, que escapa por
   construccion. esc() queda para los pocos casos en los que de verdad
   haga falta interpolar texto corto dentro de una plantilla HTML estatica
   (p.ej. un atributo `title`, o un mensaje de confirmacion). */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
