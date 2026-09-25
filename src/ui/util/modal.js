/* Dos helpers para abrir dialogos:
   - abrirModal(): usa <ion-modal> (bottom-sheet gestual por defecto).
   - abrirModalCentrado(): modal centrado en pantalla, div-based (sin
     ion-modal), equivalente al modal() de www/js/ui.js pero con
     align-items:center en vez de flex-end. Evita el colapso de
     ion-content cuando --height:auto no tiene padre con altura definida.
   Ambos comparten cerrarModal().
   Guardas `typeof modal.present === 'function'` -- en tests sin el
   loader de Ionic cargado, <ion-modal> es un elemento sin comportamiento
   registrado (no revienta, simplemente no hace nada hasta que Ionic
   este disponible en runtime real). */
import { svg } from '../../domain/iconos.js';
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
  document.removeEventListener('keydown', escCierraModal);
  const m = document.getElementById('pp-modal');
  if (!m) return;
  if (typeof m.dismiss === 'function') m.dismiss();
  else m.remove();
}

export function abrirModalCentrado(cuerpoEl) {
  cerrarModal();
  const fondo = document.createElement('div');
  fondo.id = 'pp-modal';
  fondo.className = 'pp-modal-fondo';

  const caja = document.createElement('div');
  caja.className = 'pp-modal';

  const btnCerrar = document.createElement('button');
  btnCerrar.className = 'pp-modal-x';
  btnCerrar.setAttribute('aria-label', 'Cerrar');
  const icoEl = svg('cerrar');
  if (icoEl) btnCerrar.appendChild(icoEl);
  btnCerrar.addEventListener('click', cerrarModal);
  caja.appendChild(btnCerrar);
  caja.appendChild(cuerpoEl);

  fondo.appendChild(caja);
  document.body.appendChild(fondo);
  // Diferir el listener de cierre un tick: el tap/click que abre el modal
  // sigue propagándose en el mismo microtask; registrarlo ahora lo recibiría
  // inmediatamente y cerraría el modal al instante (bug en iOS/Android).
  setTimeout(() => {
    fondo.addEventListener('click', e => { if (e.target === fondo) cerrarModal(); });
  }, 0);
  document.addEventListener('keydown', escCierraModal);
}

function escCierraModal(e) {
  if (e.key === 'Escape') cerrarModal();
}
