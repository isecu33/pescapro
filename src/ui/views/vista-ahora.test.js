// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderAhora } from './vista-ahora.js';
import { preparar, indiceHora, horaMasCercana } from '../../domain/indice.js';
import { generarDatos } from '../../domain/__fixtures__.js';

/* Datos sinteticos a mano (via el generador de fixtures de dominio, no el
   test/fixtures.js de la version vanilla) para cada escenario de la vista.
   Reutiliza preparar()/generarDatos() de src/domain -- son codigo de
   dominio real, no "el fixture de test/" que el encargo pide evitar. */

function crearSt(overrides) {
  const datos = generarDatos(overrides && overrides.datos);
  const ctx = preparar(datos);
  return Object.assign({
    spot: { nombre: 'Zarautz', lat: datos.lat, lon: datos.lon },
    modo: 'spinning',
    datos,
    ctx,
    grid: null,
    vista: 'ahora',
    cargando: false,
    error: null
  }, overrides && overrides.st);
}

describe('renderAhora: reemplaza renderAhora()/selectorModo()/desgloseFactores()/condicionesActuales()/cardMarea()/cardSolLuna()/cardEspeciesAhora() de www/js/ui.js', () => {
  it('muestra "Cargando datos…" cuando st.ctx todavia no existe', () => {
    const cont = document.createElement('div');
    renderAhora(cont, { spot: null, modo: 'spinning', datos: null, ctx: null, grid: null, vista: 'ahora', cargando: true, error: null });
    expect(cont.textContent).toContain('Cargando datos…');
    expect(cont.querySelector('pp-gauge')).toBeNull();
    expect(cont.querySelector('ion-segment')).toBeNull();
  });

  it('el gauge recibe el valor exacto calculado por indiceHora()', () => {
    const st = crearSt({ datos: { viento: 10, ola: 0.5, sst: 16 } });
    const cont = document.createElement('div');
    renderAhora(cont, st);

    const h = horaMasCercana(st.datos.horas, new Date());
    const esperado = indiceHora(h, st.modo, st.ctx).valor;

    const gauge = cont.querySelector('pp-gauge');
    expect(gauge).not.toBeNull();
    expect(gauge.value).toBe(esperado);
  });

  it('el banner de seguridad esta oculto cuando el nivel es "ok"', () => {
    const st = crearSt({ datos: { viento: 10, ola: 0.5, sst: 16 } });
    const h = horaMasCercana(st.datos.horas, new Date());
    expect(indiceHora(h, st.modo, st.ctx).seguridad.nivel).toBe('ok');

    const cont = document.createElement('div');
    renderAhora(cont, st);
    const banner = cont.querySelector('ion-card.pp-banner');
    expect(banner).not.toBeNull();
    expect(banner.style.display).toBe('none');
  });

  it('el banner de seguridad se muestra en rojo cuando hay viento peligroso', () => {
    const st = crearSt({ datos: { viento: 55, ola: 1.0, sst: 16 } });
    const h = horaMasCercana(st.datos.horas, new Date());
    expect(indiceHora(h, st.modo, st.ctx).seguridad.nivel).toBe('rojo');

    const cont = document.createElement('div');
    renderAhora(cont, st);
    const banner = cont.querySelector('ion-card.pp-banner');
    expect(banner.style.display).toBe('block');
    expect(banner.getAttribute('color')).toBe('danger');
    expect(banner.textContent).toContain('⛔');
  });

  it('el segment tiene un boton por modalidad y marca la activa', () => {
    const st = crearSt({ st: { modo: 'eging' } });
    const cont = document.createElement('div');
    renderAhora(cont, st);

    const segment = cont.querySelector('ion-segment');
    expect(segment).not.toBeNull();
    expect(segment.value).toBe('eging');

    const botones = segment.querySelectorAll('ion-segment-button');
    expect(botones).toHaveLength(3);
    const valores = Array.from(botones).map(b => b.value);
    expect(valores).toEqual(['spinning', 'eging', 'surfcasting']);
  });

  it('cambiar el segment emite pp-cambiar-modo (bubbles) sin llamar a orquestacion', () => {
    const st = crearSt();
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    renderAhora(cont, st);

    const eventos = [];
    cont.addEventListener('pp-cambiar-modo', (ev) => eventos.push(ev.detail));

    const segment = cont.querySelector('ion-segment');
    segment.dispatchEvent(new CustomEvent('ionChange', {
      detail: { value: 'surfcasting' }, bubbles: true, composed: true
    }));

    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toEqual({ modo: 'surfcasting' });
    cont.remove();
  });

  it('renderiza tarjetas de marea, sol/luna y especies activas ahora', () => {
    const st = crearSt();
    const cont = document.createElement('div');
    renderAhora(cont, st);

    const titulos = Array.from(cont.querySelectorAll('ion-card-title')).map(t => t.textContent);
    expect(titulos).toContain('Marea');
    expect(titulos).toContain('Sol, luna y solunar');
    expect(titulos).toContain('Especies activas ahora');
    expect(titulos).toContain('Qué suma y qué resta');
    expect(titulos).toContain('Condiciones ahora');

    expect(cont.querySelector('pp-curva-marea')).not.toBeNull();
  });

  it('limpia el contenido anterior en cada render (no acumula tarjetas)', () => {
    const st = crearSt();
    const cont = document.createElement('div');
    renderAhora(cont, st);
    const totalTrasPrimerRender = cont.querySelectorAll('ion-card').length;
    renderAhora(cont, st);
    expect(cont.querySelectorAll('ion-card').length).toBe(totalTrasPrimerRender);
  });
});
