/* <pp-gauge value="72"> -- anillo de progreso del indice de pesca.
   Reemplaza gauge() de www/js/ui.js:71-84 (SVG reconstruido entero via
   innerHTML en cada refresco). Aqui el SVG se crea UNA vez en el
   constructor y solo se actualiza la propiedad `value`, animando la
   transicion con la Web Animations API (stroke-dashoffset) en vez de
   reemplazar el marcado. Fija el patron de Custom Element que reutilizan
   pp-curva-marea, pp-captura-card, pp-liga-item y pp-mapa. */
import { util } from '../../domain/config.js';

const R = 54;
const C = 2 * Math.PI * R;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
  <style>
    :host { display: inline-block; width: 128px; }
    svg { width: 100%; height: auto; display: block; filter: drop-shadow(0 0 10px rgba(0,0,0,.6)); }
    .fondo { stroke: var(--borde, #1e3347); }
    .fondo2 { stroke: rgba(255,255,255,.04); }
    .num { font-size: 36px; font-weight: 800; letter-spacing: -.03em; font-family: 'SF Mono', 'Roboto Mono', monospace; }
    .lbl { font-size: 10px; fill: var(--texto2, #7a96aa); font-family: system-ui, sans-serif; }
  </style>
  <svg viewBox="0 0 140 140">
    <circle class="fondo" cx="70" cy="70" r="${R}" fill="none" stroke-width="13"/>
    <circle class="fondo2" cx="70" cy="70" r="${R}" fill="none" stroke-width="1"/>
    <circle class="progreso" cx="70" cy="70" r="${R}" fill="none" stroke-width="13"
            stroke-linecap="round" transform="rotate(-90 70 70)"
            stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
    <text class="num" x="70" y="68" text-anchor="middle"></text>
    <text class="lbl" x="70" y="88" text-anchor="middle">/ 100</text>
  </svg>
`;

export class PpGauge extends HTMLElement {
  static get observedAttributes() { return ['value']; }

  constructor() {
    super();
    this._value = 0;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this._progreso = shadow.querySelector('.progreso');
    this._num = shadow.querySelector('.num');
    this._num.textContent = '0';
  }

  connectedCallback() {
    if (this.hasAttribute('value')) this._aplicar(Number(this.getAttribute('value')));
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'value') this._aplicar(Number(newVal));
  }

  get value() { return this._value; }
  set value(v) {
    this.setAttribute('value', v);
    this._aplicar(Number(v));
  }

  _aplicar(valorBruto) {
    const valor = Math.max(0, Math.min(100, Number(valorBruto) || 0));
    const anterior = this._value;
    this._value = valor;

    const color = util.colorIndice(valor);
    const origen = C * (1 - anterior / 100);
    const destino = C * (1 - valor / 100);

    this._num.textContent = String(Math.round(valor));
    this._num.setAttribute('fill', color);
    this._progreso.setAttribute('stroke', color);

    if (typeof this._progreso.animate === 'function') {
      this._progreso.animate(
        [{ strokeDashoffset: origen }, { strokeDashoffset: destino }],
        { duration: 400, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'forwards' }
      );
    } else {
      this._progreso.setAttribute('stroke-dashoffset', String(destino));
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-gauge')) {
  customElements.define('pp-gauge', PpGauge);
}
