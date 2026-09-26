// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { renderPrevision, motivoVentana } from './vista-prevision.js';
import { cerrarModal } from '../util/modal.js';
import { preparar, mejoresVentanas, diasDisponibles, serie } from '../../domain/indice.js';
import { util } from '../../domain/config.js';
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

  it('pulsar una fila de "mejores ventanas" abre el modal de detalle de su mejor hora', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const vents = mejoresVentanas(st.ctx, st.modo);
    expect(document.getElementById('pp-modal')).toBeNull();
    cont.querySelector('.pp-vent-lista .pp-ventana').click();

    const modal = document.getElementById('pp-modal');
    expect(modal).not.toBeNull();
    expect(modal.querySelector('ion-content .pp-factores-wrap .pp-factor')).not.toBeNull();
    expect(modal.querySelector('.pp-modal-idx').textContent).toBe(String(vents[0].mejorHora.valor));
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
    expect(cont.querySelectorAll('.pp-card').length).toBe(3);
  });

  it('la tira de dias muestra un dia por cada entrada de resumenDias(), mas la ficha de calendario', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const dias = diasDisponibles(st.ctx, st.modo);
    const tiles = cont.querySelectorAll('.pp-semana .pp-dia-tile');
    expect(tiles.length).toBe(dias.length + 1); // + ficha "Ver todos"
    expect(tiles[0].querySelector('.pp-dia-tile-nombre').textContent).toBe('Hoy');
    expect(tiles[tiles.length - 1].classList.contains('pp-dia-tile-calendario')).toBe(true);
  });

  it('tocar un dia de la tira filtra el grafico a esas 24h, y volver a tocarlo quita el filtro', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const dias = diasDisponibles(st.ctx, st.modo);
    const objetivo = dias[1];
    const tileObjetivo = cont.querySelectorAll('.pp-semana .pp-dia-tile')[1];
    tileObjetivo.click();

    expect(st.diaPrevisionSel.getTime()).toBe(objetivo.getTime());
    const horasEsperadas = serie(st.ctx, st.modo).filter(x => util.esMismoDia(x.hora.fecha, objetivo)).length;
    expect(cont.querySelectorAll('.pp-graf-barra').length).toBe(horasEsperadas);
    expect(cont.querySelectorAll('.pp-semana .pp-dia-tile.activo').length).toBe(1);

    // tocar el mismo dia otra vez quita el filtro
    cont.querySelectorAll('.pp-semana .pp-dia-tile')[1].click();
    expect(st.diaPrevisionSel).toBeNull();
    expect(cont.querySelectorAll('.pp-graf-barra').length).toBe(serie(st.ctx, st.modo).slice(0, 96).length);
  });

  it('la ficha de calendario abre el selector con ion-datetime acotado a los dias con datos', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    cont.querySelector('.pp-dia-tile-calendario').click();

    const dt = document.querySelector('#pp-modal ion-datetime');
    expect(dt).not.toBeNull();
    const dias = diasDisponibles(st.ctx, st.modo);
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    expect(dt.getAttribute('min')).toBe(iso(dias[0]));
    expect(dt.getAttribute('max')).toBe(iso(dias[dias.length - 1]));
  });

  it('elegir un dia en el selector de calendario filtra el grafico a esas 24h y lo indica en la tarjeta', () => {
    const st = stConCtx();
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    const dias = diasDisponibles(st.ctx, st.modo);
    const objetivo = dias[1];
    const iso = objetivo.getFullYear() + '-' + String(objetivo.getMonth() + 1).padStart(2, '0') + '-' + String(objetivo.getDate()).padStart(2, '0');

    cont.querySelector('.pp-dia-tile-calendario').click();
    const dt = document.querySelector('#pp-modal ion-datetime');
    dt.dispatchEvent(new CustomEvent('ionChange', { detail: { value: iso } }));

    // el modal se cierra y la vista se re-renderiza filtrada a ese dia
    expect(document.getElementById('pp-modal')).toBeNull();
    expect(st.diaPrevisionSel.getFullYear()).toBe(objetivo.getFullYear());
    expect(st.diaPrevisionSel.getMonth()).toBe(objetivo.getMonth());
    expect(st.diaPrevisionSel.getDate()).toBe(objetivo.getDate());

    const barras = cont.querySelectorAll('.pp-graf-barra');
    const horasEsperadas = serie(st.ctx, st.modo).filter(x => util.esMismoDia(x.hora.fecha, objetivo)).length;
    expect(barras.length).toBe(horasEsperadas);
    expect(barras.length).toBeLessThanOrEqual(24);
    expect(cont.querySelector('.pp-graf-dia-aviso')).not.toBeNull();
  });

  it('"Ver proximos dias" limpia el filtro de dia y vuelve a la vista de 96h', () => {
    const st = stConCtx();
    st.diaPrevisionSel = diasDisponibles(st.ctx, st.modo)[1];
    const cont = document.createElement('div');
    renderPrevision(cont, st);

    cont.querySelector('.pp-graf-dia-volver').click();

    expect(st.diaPrevisionSel).toBeNull();
    const s = serie(st.ctx, st.modo).slice(0, 96);
    expect(cont.querySelectorAll('.pp-graf-barra').length).toBe(s.length);
  });
});
