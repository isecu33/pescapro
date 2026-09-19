/* <pp-liga-item> -- tarjeta resumen de una competicion (nombre, estado,
   fechas, lider) en la lista de la vista Trofeos.

   Resuelve el CRITICAL/MEDIUM de auditoria en www/js/trofeos.js:
   - fmtDia() (lineas 76-79) devolvia el string CRUDO sin escapar cuando
     la fecha no era valida (`isNaN(d) ? iso : ...`), y ese valor se
     interpolaba en `item.innerHTML = '...'` (linea 133-138) sin pasar
     por esc(). Con la validacion anadida en records/liga.js (Fase1C) un
     codigo de invitacion con fechas invalidas ya se rechaza ANTES de
     persistir, pero aqui se aplica tambien la defensa en profundidad
     que pedia el plan: fmtDia() nunca devuelve el input crudo (usa un
     placeholder fijo si la fecha no es valida) y todo el render usa
     textContent, nunca innerHTML.
   - liga.nombre y el nombre/detalle del lider YA se escapaban
     correctamente con esc() en el original (trofeos.js:14-17,134,138)
     -- aqui ese escapado deja de hacer falta porque textContent lo hace
     por construccion. */
import { estado as estadoLiga, ranking as rankingLiga, MODOS_LIGA } from '../../domain/records/liga.js';

function fmtDia(iso) {
  const d = new Date(iso + 'T12:00');
  // Fix: nunca devolver el string crudo si la fecha no es valida.
  return isNaN(d) ? null : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export class PpLigaItem extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; border: 1px solid var(--borde, #242424); border-radius: 12px;
        padding: 10px; margin-top: 8px; cursor: pointer; background: var(--panel2, #1a1a1a); }
      .cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .tag { border: 1px solid var(--borde, #242424); border-radius: 8px; padding: 3px 8px; font-size: 12px; }
      .tag-activa { color: var(--acento, #ff7200); border-color: var(--acento, #ff7200); }
      .tag-finalizada { color: var(--texto2, #888888); }
      .sub, .cond { font-size: 12px; color: var(--texto2, #888888); margin-top: 2px; }
    `;
    shadow.appendChild(style);
    this._root = document.createElement('div');
    shadow.appendChild(this._root);
    this._liga = null;
    this.addEventListener('click', () => {
      if (this._liga) this.dispatchEvent(new CustomEvent('pp-abrir-liga', { detail: { id: this._liga.id }, bubbles: true, composed: true }));
    });
  }

  set liga(l) { this._liga = l; this._render(); }
  get liga() { return this._liga; }

  _render() {
    this._root.textContent = '';
    const liga = this._liga;
    if (!liga) return;

    const cab = document.createElement('div');
    cab.className = 'cab';
    const b = document.createElement('b');
    b.textContent = liga.nombre;
    cab.appendChild(b);
    const est = estadoLiga(liga);
    const tag = document.createElement('span');
    tag.className = 'tag tag-' + est;
    tag.textContent = est;
    cab.appendChild(tag);
    this._root.appendChild(cab);

    const sub = document.createElement('div');
    sub.className = 'sub';
    const modoNombre = MODOS_LIGA[liga.modo] ? MODOS_LIGA[liga.modo].nombre : liga.modo;
    const n = liga.participantes.length;
    sub.textContent = (fmtDia(liga.desde) || '—') + ' → ' + (fmtDia(liga.hasta) || '—') + ' · ' +
      modoNombre + ' · ' + n + ' participante' + (n !== 1 ? 's' : '');
    this._root.appendChild(sub);

    const rank = rankingLiga(liga);
    const lider = rank[0];
    if (lider && lider.metrica > 0) {
      const cond = document.createElement('div');
      cond.className = 'cond';
      cond.textContent = '🥇 ' + lider.nombre + (lider.esYo ? ' (tú)' : '') + ' — ' + lider.detalle;
      this._root.appendChild(cond);
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-liga-item')) {
  customElements.define('pp-liga-item', PpLigaItem);
}
