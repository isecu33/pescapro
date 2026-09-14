/* <pp-curva-marea> -- curva SVG del nivel del mar (desde -6h hasta +30h),
   con marcadores de pleamar/bajamar y una linea vertical en "ahora".
   Reemplaza curvaMarea() de www/js/ui.js:183-210 (SVG reconstruido via
   innerHTML con coordenadas concatenadas en un string). Mismo patron que
   pp-gauge: Shadow DOM creado una vez, aqui usando SVG namespaced
   (createElementNS) en vez de innerHTML -- ademas de evitar el patron
   inseguro, permite reconstruir solo el contenido del <svg> al cambiar
   `data` sin recrear el elemento raiz.

   Recibe los datos como PROPIEDAD de objeto (nunca como string HTML):
   data = { puntos: [{t: epochMs, nivel: number}], extremos: [{tipo,
   t: epochMs, altura}], ahora: epochMs }. */
import { util } from '../../domain/config.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340, H = 90, PAD = 6;

export class PpCurvaMarea extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      svg { width: 100%; height: auto; display: block; }
      text { font-size: 9.5px; }
    `;
    shadow.appendChild(style);
    this._cont = document.createElement('div');
    shadow.appendChild(this._cont);
    this._data = null;
  }

  set data(d) { this._data = d; this._render(); }
  get data() { return this._data; }

  _render() {
    this._cont.textContent = '';
    const d = this._data;
    if (!d || !Array.isArray(d.puntos) || d.puntos.length < 4) return;

    const puntos = d.puntos;
    const extremos = Array.isArray(d.extremos) ? d.extremos : [];
    const ahora = d.ahora != null ? d.ahora : Date.now();
    const desde = puntos[0].t, hasta = puntos[puntos.length - 1].t;
    const niveles = puntos.map(p => p.nivel);
    const min = Math.min(...niveles), max = Math.max(...niveles);
    const x = (t) => PAD + (t - desde) / (hasta - desde) * (W - 2 * PAD);
    const y = (v) => H - PAD - (v - min) / (max - min || 1) * (H - 2 * PAD);

    let pathD = '';
    puntos.forEach((p, i) => { pathD += (i ? 'L' : 'M') + x(p.t).toFixed(1) + ',' + y(p.nivel).toFixed(1); });
    const areaD = pathD + ' L' + x(hasta).toFixed(1) + ',' + (H - 1) + ' L' + x(desde).toFixed(1) + ',' + (H - 1) + ' Z';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    const area = document.createElementNS(NS, 'path');
    area.setAttribute('d', areaD);
    area.setAttribute('fill', 'rgba(77,171,247,.15)');
    area.setAttribute('stroke', 'none');
    svg.appendChild(area);

    const linea = document.createElementNS(NS, 'path');
    linea.setAttribute('d', pathD);
    linea.setAttribute('fill', 'none');
    linea.setAttribute('stroke', 'var(--azul)');
    linea.setAttribute('stroke-width', '2');
    svg.appendChild(linea);

    const xNow = x(ahora);
    const lineaAhora = document.createElementNS(NS, 'line');
    lineaAhora.setAttribute('x1', xNow); lineaAhora.setAttribute('y1', '2');
    lineaAhora.setAttribute('x2', xNow); lineaAhora.setAttribute('y2', String(H - 2));
    lineaAhora.setAttribute('stroke', 'var(--acento)');
    lineaAhora.setAttribute('stroke-width', '1.5');
    lineaAhora.setAttribute('stroke-dasharray', '4 3');
    svg.appendChild(lineaAhora);

    const txtAhora = document.createElementNS(NS, 'text');
    txtAhora.setAttribute('x', xNow); txtAhora.setAttribute('y', '12');
    txtAhora.setAttribute('text-anchor', 'middle');
    txtAhora.setAttribute('fill', 'var(--acento)');
    txtAhora.textContent = 'ahora';
    svg.appendChild(txtAhora);

    extremos.filter(e => e.t >= desde && e.t <= hasta).forEach(e => {
      const ex = x(e.t), ey = y(e.altura);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', ex); c.setAttribute('cy', ey); c.setAttribute('r', '3');
      c.setAttribute('fill', 'var(--acento)');
      svg.appendChild(c);

      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', ex); t.setAttribute('y', String(e.tipo === 'pleamar' ? ey - 6 : ey + 12));
      t.setAttribute('text-anchor', 'middle');
      t.textContent = util.fmtHora(new Date(e.t));
      svg.appendChild(t);
    });

    this._cont.appendChild(svg);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-curva-marea')) {
  customElements.define('pp-curva-marea', PpCurvaMarea);
}
