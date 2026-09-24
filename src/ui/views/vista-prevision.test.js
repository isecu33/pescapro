// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { renderPrevision, motivoVentana } from './vista-prevision.js';
import { cerrarModal } from '../util/modal.js';
import { preparar, mejoresVentanas, serie } from '../../domain/indice.js';
import { generarDatos } from '../../domain/__fixtures__.js';

/* Puerto de www/js/ui.js:265-343 (renderPrevision/motivoVentana/
   graficoHoras/modalDetalleHora). Datos sinteticos con tormentaEn para
   tener contraste real: unas horas con indice alto (~75-94, "verde") y
   otras capadas a 15 por seguridad roja (tormenta), igual que pediria
   cualquier caso real de viento/oleaje peligroso. */
function stConCtx(opts) {
  const datos = generarDatos(Object.assign({ viento: 10, ola: 1.0, sst: 15, tormentaEn: 20 }, opts));
  const ctx = preparar(datos);
  return {
    spot: { nombre: 'Zarautz', lat: 43.29, lon: -2.17 },
    modo: 'spinning',
    datos, ctx,
    vista: 'prevision', cargando: false, error: null
  };
}

describe('renderPrevision', () => {
  afterEach(() => cerrarModal());

  it('muestra el estado de carga si no hay ctx', () => {
    const cont = document.createElement('div');
    renderPrevision(cont, { spot: null, modo: 'spinning', datos: null, ctx: null, vista: 'prevision', cargando: true, error: null });
    expect(cont.querySelector('.pp-cargando')).not.toBeNull();
    expect(cont.querySelector('ion-list')).toBeNull();
  });

  it('lista las mejores ventanas de pesca con indicador de indice y motivo', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const vents = mejoresVentanas(st.ctx, st.modo);
    expect(vents.length).toBeGreaterThan(0);

    const items = cont.querySelectorAll('.pp-vent-lista .pp-ventana');
    expect(items.length).toBe(vents.length);

    const primerIdx = items[0].querySelector('.pp-ventana-idx');
    expect(primerIdx.textContent).toBe(String(vents[0].max));
    expect(primerIdx.style.background).not.toBe('');

    const primerMotivo = items[0].querySelector('.pp-ventana-motivo');
    expect(primerMotivo.textContent).toBe(motivoVentana(vents[0]));
  });

  it('sin ventanas buenas muestra la nota en vez de una lista vacia', () => {
    // viento/ola siempre por debajo de lo optimo => indice bajo, sin
    // ventanas >= 55 en todas las modalidades.
    const st = stConCtx({ viento: 60, ola: 0.05, tormentaEn: null });
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const vents = mejoresVentanas(st.ctx, st.modo);
    expect(vents.length).toBe(0);
    expect(cont.querySelector('.pp-vent-lista')).toBeNull();
    expect(cont.querySelector('.pp-vent-vacio p').textContent).toMatch(/Sin ventanas buenas/);
  });

  it('el grafico tiene una barra por cada hora relevante de la serie, con contraste alto/bajo', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const s = serie(st.ctx, st.modo).slice(0, 96);
    const barras = cont.querySelectorAll('.pp-graf-barra');
    expect(barras.length).toBe(s.length);

    const alturas = Array.from(barras).map(b => parseFloat(b.style.height));
    expect(Math.max(...alturas)).toBeGreaterThan(70);
    expect(Math.min(...alturas)).toBeLessThan(20);
  });

  it('pulsar una barra abre el modal de detalle de esa hora', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    expect(document.getElementById('pp-modal')).toBeNull();
    cont.querySelector('.pp-graf-col').click();

    const modal = document.getElementById('pp-modal');
    expect(modal).not.toBeNull();
    expect(modal.querySelector('ion-content .pp-factores-wrap .pp-factor')).not.toBeNull();
  });

  it('el modal de detalle de hora muestra el banner de seguridad si la hora es roja', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    // la 8a columna del grafico cae dentro del rango de tormenta (indice
    // de serie 7-11 con seguridad rojo, ver __fixtures__.js/tormentaEn)
    const cols = cont.querySelectorAll('.pp-graf-col');
    cols[8].click();

    const modal = document.getElementById('pp-modal');
    const banner = modal.querySelector('.pp-banner-rojo');
    expect(banner).not.toBeNull();
    expect(banner.textContent.length).toBeGreaterThan(0);
  });

  it('reconstruye el contenedor en cada llamada (no acumula render anteriores)', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);
    renderPrevision(cont, st);
    expect(cont.querySelectorAll('.pp-card').length).toBe(2);
  });
});
