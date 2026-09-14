// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderEspecies } from './vista-especies.js';
import { preparar, especiesEn } from '../../domain/indice.js';
import { ESPECIES } from '../../domain/especies.js';
import { generarDatos } from '../../domain/__fixtures__.js';
import { cerrarModal } from '../util/modal.js';

// Porta renderEspecies()/modalEspecie() de www/js/ui.js:347-408 a un modulo
// con render manual (createElement/textContent) sobre <ion-card> + el
// helper compartido abrirModal()/cerrarModal().

function stConCtx(opts) {
  const datos = generarDatos(opts);
  return { spot: { nombre: 'Zarautz', lat: datos.lat, lon: datos.lon }, modo: 'spinning', datos, ctx: preparar(datos), vista: 'especies', cargando: false, error: null };
}

function stSinCtx() {
  return { spot: { nombre: 'Zarautz', lat: 43.29, lon: -2.17 }, modo: 'spinning', datos: null, ctx: null, vista: 'especies', cargando: true, error: null };
}

describe('renderEspecies: grid de tarjetas + modal de ficha por especie', () => {
  it('estado de carga: sin ctx muestra "Cargando..." y no renderiza tarjetas', () => {
    const cont = document.createElement('div');
    renderEspecies(cont, stSinCtx());
    expect(cont.querySelector('.pp-cargando')).toBeTruthy();
    expect(cont.querySelector('.pp-esp-card')).toBeNull();
  });

  it('renderiza una tarjeta por cada una de las 12 especies de ESPECIES', () => {
    const cont = document.createElement('div');
    const st = stConCtx({});
    renderEspecies(cont, st);
    expect(ESPECIES.length).toBe(12);
    expect(cont.querySelectorAll('.pp-esp-card').length).toBe(12);
  });

  it('el valor de actividad de cada tarjeta coincide con especiesEn(ahora, ctx)', () => {
    const cont = document.createElement('div');
    const st = stConCtx({ sst: 15, ola: 0.8 });
    renderEspecies(cont, st);
    const rank = especiesEn(new Date(), st.ctx);

    const tarjetas = cont.querySelectorAll('.pp-esp-card');
    expect(tarjetas.length).toBe(rank.length);
    tarjetas.forEach((card, i) => {
      const r = rank[i];
      expect(card.querySelector('.pp-esp-card-ico').textContent).toBe(r.especie.icono);
      expect(card.querySelector('.pp-esp-card-nombre').textContent).toBe(r.especie.nombre);
      expect(card.querySelector('.pp-esp-card-val').textContent).toBe(String(r.act.valor));
      expect(card.querySelector('.pp-esp-card-motivo').textContent).toBe(r.act.motivo);
    });
  });

  it('pulsar una tarjeta abre el modal (#pp-modal) con el nombre de esa especie dentro', () => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const st = stConCtx({});
    renderEspecies(cont, st);

    const rank = especiesEn(new Date(), st.ctx);
    const primeraTarjeta = cont.querySelector('.pp-esp-card');
    primeraTarjeta.dispatchEvent(new Event('click', { bubbles: true }));

    const modal = document.getElementById('pp-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain(rank[0].especie.nombre);
    expect(modal.textContent).toContain(rank[0].especie.cientifico);

    cerrarModal();
    cont.remove();
  });

  it('el modal incluye el heatmap de 12 meses y las mejores horas (si hay alguna >= 30)', () => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const st = stConCtx({ sst: 18, ola: 1.0, viento: 10 });
    renderEspecies(cont, st);

    cont.querySelector('.pp-esp-card').dispatchEvent(new Event('click', { bubbles: true }));
    const modal = document.getElementById('pp-modal');
    expect(modal.querySelectorAll('.pp-heat-celda').length).toBe(12);
    expect(modal.textContent).toContain('Mejores momentos');

    cerrarModal();
    cont.remove();
  });

  it('limpia el contenedor en cada render (no acumula tarjetas de renders previos)', () => {
    const cont = document.createElement('div');
    const st = stConCtx({});
    renderEspecies(cont, st);
    renderEspecies(cont, st);
    expect(cont.querySelectorAll('.pp-esp-card').length).toBe(ESPECIES.length);
  });
});
