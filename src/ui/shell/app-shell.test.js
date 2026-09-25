// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import './app-shell.js';

describe('<pp-app-shell>: reemplaza header/nav estaticos de www/index.html', () => {
  it('se registra como custom element y monta ion-app con 6 pestanas', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    expect(el.querySelector('ion-app')).not.toBeNull();
    expect(el.querySelectorAll('ion-tab-button')).toHaveLength(6);
    el.remove();
  });

  it('vistaActiva por defecto es "ahora" y el boton correspondiente queda seleccionado', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    expect(el.vistaActiva).toBe('ahora');
    expect(el.querySelector('ion-tab-button[tab="ahora"]').getAttribute('selected')).toBe('true');
    expect(el.querySelector('ion-tab-button[tab="mapa"]').hasAttribute('selected')).toBe(false);
    el.remove();
  });

  it('cambiar vistaActiva emite pp-cambiar-vista y actualiza la pestana seleccionada', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    const spy = vi.fn();
    el.addEventListener('pp-cambiar-vista', spy);
    el.vistaActiva = 'cuaderno';
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.vista).toBe('cuaderno');
    expect(el.querySelector('ion-tab-button[tab="cuaderno"]').getAttribute('selected')).toBe('true');
    expect(el.querySelector('ion-tab-button[tab="ahora"]').hasAttribute('selected')).toBe(false);
    el.remove();
  });

  it('hacer click en una pestana cambia vistaActiva igual que asignarla por codigo', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    el.querySelector('ion-tab-button[tab="especies"]').click();
    expect(el.vistaActiva).toBe('especies');
    el.remove();
  });

  it('ignora un id de vista desconocido', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    el.vistaActiva = 'no-existe';
    expect(el.vistaActiva).toBe('ahora');
    el.remove();
  });

  it('.contenido expone un contenedor real donde montar la vista activa', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    expect(el.contenido).toBeInstanceOf(HTMLElement);
    expect(el.contenido.tagName.toLowerCase()).toBe('main');
    el.remove();
  });

  it('.spot actualiza el nombre del selector de cabecera', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    el.spot = { nombre: 'Zarautz' };
    expect(el.querySelector('.pp-spot-selector span').textContent).toBe('Zarautz');
    el.remove();
  });

  it('.actualizado y .seguridad son no-ops en el shell (movidos a cada vista)', () => {
    // .actualizado (timestamp) se eliminó del header; .seguridad ahora se
    // renderiza dentro de cada vista (ver vista-ahora.js), no en el shell.
    // Los setters se mantienen por compatibilidad de API y no deben lanzar.
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    expect(() => { el.actualizado = 'hace 3 min'; }).not.toThrow();
    expect(() => { el.seguridad = { nivel: 'rojo', motivos: ['Viento muy fuerte'] }; }).not.toThrow();
    el.remove();
  });

  it('clicar el selector de spot y los botones de favorito/refrescar emiten sus eventos', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    const spySpot = vi.fn(), spyFav = vi.fn(), spyRef = vi.fn();
    el.addEventListener('pp-cambiar-spot', spySpot);
    el.addEventListener('pp-favorito', spyFav);
    el.addEventListener('pp-refrescar', spyRef);
    el.querySelector('.pp-spot-selector').click();
    el.querySelectorAll('ion-button')[0].click();
    el.querySelectorAll('ion-button')[1].click();
    expect(spySpot).toHaveBeenCalledTimes(1);
    expect(spyFav).toHaveBeenCalledTimes(1);
    expect(spyRef).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('el menu incluye "Modo desarrollador" (import.meta.env.DEV=true en tests) y emite pp-abrir-dev', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    const spyDev = vi.fn();
    el.addEventListener('pp-abrir-dev', spyDev);

    const items = Array.from(el.querySelectorAll('ion-item'));
    const itemDev = items.find(i => i.textContent.includes('Modo desarrollador'));
    expect(itemDev).toBeTruthy();
    itemDev.click();

    expect(spyDev).toHaveBeenCalledTimes(1);
    el.remove();
  });
});
