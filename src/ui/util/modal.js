/* Helper compartido para abrir/cerrar dialogos, sobre <ion-modal> en vez
   del div.pp-modal-fondo + div.pp-modal a mano de www/js/ui.js:635-651
   (funcion `modal(cuerpo)`/`cerrarModal()`, usada por practicamente todas
   las vistas). Con `breakpoints` se comporta como bottom-sheet gestual
   tipo iOS (por defecto); pasa `breakpoints: null` para un modal
   fullscreen clasico (p.ej. el visor de foto).

   Guardas `typeof modal.present === 'function'` -- en tests sin el
   loader de Ionic cargado, <ion-modal> es un elemento sin comportamiento
   registrado (no revienta, simplemente no hace nada hasta que Ionic
   este disponible en runtime real). */
export function abrirModal(cuerpoEl, opts = {}) {
  cerrarModal();

  const modal = document.createElement('ion-modal');
  modal.id = 'pp-modal';
  if (opts.cssClass) modal.classList.add(opts.cssClass);

  if (opts.breakpoints !== null) {
    const breakpoints = opts.breakpoints || [0, 0.5, 0.9];
    modal.breakpoints = breakpoints;
    modal.initialBreakpoint = opts.initialBreakpoint || breakpoints[breakpoints.length - 1];
  }

  const header = document.createElement('ion-header');
  const toolbar = document.createElement('ion-toolbar');
  const botones = document.createElement('ion-buttons');
  botones.slot = 'end';
  const btnCerrar = document.createElement('ion-button');
  const ico = document.createElement('ion-icon');
  ico.setAttribute('name', 'close-outline');
  ico.slot = 'icon-only';
  btnCerrar.appendChild(ico);
  btnCerrar.addEventListener('click', cerrarModal);
  botones.appendChild(btnCerrar);
  toolbar.appendChild(botones);
  header.appendChild(toolbar);

  const contenido = document.createElement('ion-content');
  contenido.appendChild(cuerpoEl);

  modal.append(header, contenido);
  document.body.appendChild(modal);
  if (typeof modal.present === 'function') modal.present();
  return modal;
}

export function cerrarModal() {
  const m = document.getElementById('pp-modal');
  if (!m) return;
  if (typeof m.dismiss === 'function') m.dismiss();
  else m.remove();
}
