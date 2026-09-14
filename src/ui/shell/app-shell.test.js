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

  it('.spot y .actualizado actualizan el selector de cabecera', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    el.spot = { nombre: 'Zarautz' };
    el.actualizado = 'hace 3 min';
    expect(el.querySelector('.pp-spot-selector span').textContent).toBe('Zarautz');
    expect(el.querySelector('.pp-spot-selector small').textContent).toBe('hace 3 min');
    el.remove();
  });

  it('.seguridad muestra/oculta el banner segun el nivel', () => {
    const el = document.createElement('pp-app-shell');
    document.body.appendChild(el);
    el.seguridad = { nivel: 'rojo', motivos: ['Viento muy fuerte'] };
    const banner = el.querySelector('.pp-banner');
    expect(banner.style.display).toBe('block');
    expect(banner.textContent).toContain('Viento muy fuerte');
    el.seguridad = { nivel: 'ok', motivos: [] };
    expect(banner.style.display).toBe('none');
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
});
