/* <pp-captura-card> -- fila de una captura del cuaderno (cabecera, fecha/
   spot/senuelo, condiciones, notas, foto opcional).

   ESTE ES EL COMPONENTE QUE RESUELVE EL CRITICAL PRINCIPAL DE LA
   AUDITORIA: www/js/ui.js:470-477 (renderCuaderno) y :513-527 (modalFoto)
   insertaban c.notas / c.spot.nombre / c.senuelo directamente en
   `cuerpo.innerHTML = '...' + c.notas + '...'`, sin escapar -- un valor
   como "<img src=x onerror=...>" pegado desde un JSON de cuaderno
   importado (PP.cuaderno.importar(), que acepta cualquier texto libre)
   se ejecutaba como HTML activo.

   Aqui la captura se recibe como PROPIEDAD DE OBJETO (`card.captura = c`),
   nunca como string HTML, y cada campo de texto se asigna con
   `textContent` (nunca `innerHTML`) -- textContent siempre trata el
   valor como texto plano, sin importar que caracteres contenga. Es la
   resolucion ESTRUCTURAL del hallazgo: no depende de acordarse de
   escapar en cada sitio, es la unica forma de construir este componente.

   No decide que hacer al borrar/abrir la foto -- emite eventos
   (pp-borrar, pp-abrir-foto) para que la vista (Fase 3) los conecte con
   confirm()/cuaderno.borrar()/el visor de foto, manteniendo el
   componente desacoplado de la orquestacion de la app. */
import { especiePorId, espImgEl } from '../../domain/especies.js';
import { obtener as obtenerFoto } from '../../domain/fotos.js';

export class PpCapturaCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; border-bottom: 1px solid var(--borde, #242424); padding: 9px 0; }
      .flex { display: flex; gap: 10px; align-items: flex-start; }
      .thumb { flex: 0 0 56px; width: 56px; height: 56px; border-radius: 10px; overflow: hidden;
        background: var(--panel2, #1a1a1a); cursor: pointer; }
      .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cuerpo { flex: 1; min-width: 0; }
      .cab { display: flex; align-items: center; gap: 6px; }
      .sub, .cond { font-size: 12px; color: var(--texto2, #888888); margin-top: 2px; }
      .notas { font-size: 12.5px; margin-top: 3px; font-style: italic; }
      .borrar { margin-left: auto; background: none; border: none; color: var(--texto2, #888888);
        cursor: pointer; font-size: 13px; }
    `;
    shadow.appendChild(style);
    this._root = document.createElement('div');
    shadow.appendChild(this._root);
    this._captura = null;
  }

  set captura(c) { this._captura = c; this._render(); }
  get captura() { return this._captura; }

  _render() {
    this._root.textContent = '';
    const c = this._captura;
    if (!c) return;

    const flex = document.createElement('div');
    flex.className = 'flex';

    if (c.fotoId) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const img = document.createElement('img');
      img.alt = '';
      obtenerFoto(c.fotoId).then(d => { if (d) img.src = d; });
      thumb.appendChild(img);
      thumb.addEventListener('click', () => this._emit('pp-abrir-foto'));
      flex.appendChild(thumb);
    }

    const cuerpo = document.createElement('div');
    cuerpo.className = 'cuerpo';

    const especie = especiePorId(c.especie);
    const cab = document.createElement('div');
    cab.className = 'cab';
    const b = document.createElement('b');
    if (especie) b.appendChild(espImgEl(especie, 'pp-esp-cab-ico'));
    b.append(' ' + (especie ? especie.nombre : c.especie));
    cab.appendChild(b);
    if (c.talla) cab.appendChild(document.createTextNode(' · ' + c.talla + ' cm'));
    if (c.peso) cab.appendChild(document.createTextNode(' · ' + c.peso + ' kg'));
    const borrar = document.createElement('button');
    borrar.className = 'borrar';
    borrar.title = 'Borrar';
    borrar.textContent = '✕';
    borrar.addEventListener('click', (ev) => { ev.stopPropagation(); this._emit('pp-borrar'); });
    cab.appendChild(borrar);
    cuerpo.appendChild(cab);

    const sub = document.createElement('div');
    sub.className = 'sub';
    let subTexto = new Date(c.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (c.spot && c.spot.nombre) subTexto += ' · ' + c.spot.nombre;
    if (c.senuelo) subTexto += ' · ' + c.senuelo;
    sub.textContent = subTexto; // fix CRITICAL: textContent, nunca innerHTML
    cuerpo.appendChild(sub);

    const cond = c.condiciones || {};
    if (cond.faseMarea) {
      const condDiv = document.createElement('div');
      condDiv.className = 'cond';
      let t = '🌊 ' + cond.faseMarea;
      if (cond.luna) t += ' · ' + cond.luna;
      if (cond.viento != null) t += ' · 💨 ' + Math.round(cond.viento) + ' km/h';
      if (cond.indice != null) t += ' · índice ' + cond.indice;
      condDiv.textContent = t;
      cuerpo.appendChild(condDiv);
    }

    if (c.notas) {
      const notas = document.createElement('div');
      notas.className = 'notas';
      notas.textContent = c.notas; // fix CRITICAL: textContent, nunca innerHTML
      cuerpo.appendChild(notas);
    }

    flex.appendChild(cuerpo);
    this._root.appendChild(flex);
  }

  _emit(nombre) {
    this.dispatchEvent(new CustomEvent(nombre, { detail: { captura: this._captura }, bubbles: true, composed: true }));
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-captura-card')) {
  customElements.define('pp-captura-card', PpCapturaCard);
}
