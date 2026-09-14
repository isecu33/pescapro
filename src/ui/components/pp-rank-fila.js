/* <pp-rank-fila> -- una fila del ranking de una liga (posicion/medalla,
   nombre, detalle de puntuacion). Reemplaza el bloque de
   www/js/trofeos.js:228-235 (modalLiga), que construia cada fila con
   `fila.innerHTML = '...' + esc(p.nombre) + ...'`. El nombre/detalle ya
   se escapaban correctamente con esc() en el original -- aqui deja de
   hacer falta porque se usa textContent, que escapa por construccion.

   Recibe una propiedad `entrada = {posicion, nombre, esYo, detalle}`. */
const MEDALLAS = ['🥇', '🥈', '🥉'];

export class PpRankFila extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: flex; align-items: center; gap: 8px; padding: 8px 6px;
        border-bottom: 1px solid var(--borde, #24374a); font-size: 14px; }
      :host(.yo) { background: rgba(255, 176, 32, .08); border-radius: 8px; }
      .pos { flex: 0 0 34px; font-size: 16px; }
      .nombre { flex: 1; font-weight: 650; }
      .detalle { color: var(--texto2, #9fb3c4); font-size: 12.5px; text-align: right; }
    `;
    shadow.appendChild(style);
    this._root = document.createElement('div');
    this._root.style.display = 'contents';
    shadow.appendChild(this._root);
    this._entrada = null;
  }

  set entrada(e) { this._entrada = e; this._render(); }
  get entrada() { return this._entrada; }

  _render() {
    this._root.textContent = '';
    const e = this._entrada;
    this.classList.toggle('yo', !!(e && e.esYo));
    if (!e) return;

    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = MEDALLAS[e.posicion - 1] || (e.posicion + 'º');

    const nombre = document.createElement('span');
    nombre.className = 'nombre';
    nombre.textContent = e.nombre + (e.esYo ? ' (tú)' : '');

    const detalle = document.createElement('span');
    detalle.className = 'detalle';
    detalle.textContent = e.detalle;

    this._root.append(pos, nombre, detalle);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-rank-fila')) {
  customElements.define('pp-rank-fila', PpRankFila);
}
