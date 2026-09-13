// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { abrirModal, cerrarModal } from './modal.js';

describe('abrirModal/cerrarModal: reemplaza modal()/cerrarModal() de www/js/ui.js:635-651', () => {
  it('crea un <ion-modal> con el contenido dentro de ion-content', () => {
    const cuerpo = document.createElement('div');
    cuerpo.textContent = 'hola';
    const modal = abrirModal(cuerpo);
    expect(document.getElementById('pp-modal')).toBe(modal);
    expect(modal.querySelector('ion-content').textContent).toContain('hola');
    cerrarModal();
  });

  it('por defecto usa breakpoints (bottom-sheet); con breakpoints:null no los fija (fullscreen)', () => {
    const m1 = abrirModal(document.createElement('div'));
    expect(m1.breakpoints).toEqual([0, 0.5, 0.9]);
    cerrarModal();
    const m2 = abrirModal(document.createElement('div'), { breakpoints: null });
    expect(m2.breakpoints).toBeUndefined();
    cerrarModal();
  });

  it('abrir un segundo modal cierra el anterior (solo uno a la vez, igual que el original)', () => {
    abrirModal(document.createElement('div'));
    const antes = document.querySelectorAll('ion-modal').length;
    abrirModal(document.createElement('div'));
    const despues = document.querySelectorAll('ion-modal').length;
    expect(antes).toBe(1);
    expect(despues).toBe(1);
    cerrarModal();
  });

  it('el boton de cerrar (icono close-outline) llama a cerrarModal', () => {
    const modal = abrirModal(document.createElement('div'));
    modal.querySelector('ion-button').click();
    expect(document.getElementById('pp-modal')).toBeNull();
  });

  it('cerrarModal() sin modal abierto no revienta', () => {
    expect(() => cerrarModal()).not.toThrow();
  });
});
