/* <pp-curva-marea> -- gráfico de nivel del mar con uPlot.
   API pública: set data({ puntos, extremos, ahora })
   - puntos:  [{t: epochMs, nivel: number}]
   - extremos: [{tipo: 'pleamar'|'bajamar', t: epochMs, altura: number}]
   - ahora:   epochMs */
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const ACENTO = '#ff7200';
const FILL   = 'rgba(255, 114, 0, 0.10)';
const GRID   = 'rgba(255, 255, 255, 0.06)';
const AXIS   = 'rgba(255, 255, 255, 0.40)';
const H      = 200;

function fmtHM(epochMs) {
  return new Date(epochMs).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function buildOpts(w, ahoraSec, extremos, tooltip) {
  return {
    width:  w,
    height: H,
    padding: [20, 6, 0, 0],
    cursor: {
      show: true,
      x: true,
      y: false,
      drag: { x: false, y: false },
    },
    legend: { show: false },
    scales: {
      x: { time: true },
      y: { auto: true },
    },
    axes: [
      {
        stroke: AXIS,
        grid:   { stroke: GRID, width: 1 },
        ticks:  { stroke: GRID, width: 1, size: 3 },
        font:   '11px system-ui, sans-serif',
        gap:    4,
        values: (_u, ticks) => ticks.map(t => fmtHM(t * 1000)),
      },
      {
        stroke: AXIS,
        grid:   { stroke: GRID, width: 1 },
        ticks:  { stroke: GRID, width: 1, size: 3 },
        font:   '11px system-ui, sans-serif',
        gap:    4,
        size:   46,
        values: (_u, ticks) => ticks.map(v => (v != null ? v.toFixed(1) + ' m' : '')),
      },
    ],
    series: [
      {},
      {
        stroke: ACENTO,
        fill:   FILL,
        width:  2,
      },
    ],
    hooks: {
      ready: [
        (u) => {
          u.root.style.position = 'relative';
          u.root.appendChild(tooltip);
        },
      ],
      setCursor: [
        (u) => {
          const idx = u.cursor.idx;
          if (idx == null) { tooltip.style.display = 'none'; return; }
          const v = u.data[1][idx];
          if (v == null) { tooltip.style.display = 'none'; return; }

          const t = u.data[0][idx];
          tooltip.textContent = fmtHM(t * 1000) + '  ·  ' + v.toFixed(2) + ' m';
          tooltip.style.display = 'block';

          // Posición dentro de u.root (u-wrap)
          const yAxisPx = u.bbox.left / devicePixelRatio;
          const cursorX = yAxisPx + u.cursor.left;
          const totalW  = u.root.offsetWidth;
          const tipW    = 110;
          tooltip.style.left = (cursorX + tipW + 8 > totalW ? cursorX - tipW - 4 : cursorX + 8) + 'px';
          tooltip.style.top  = '4px';
        },
      ],
      draw: [
        (u) => {
          const ctx = u.ctx;
          const { left, top, width, height } = u.bbox;

          // Línea vertical "ahora"
          const xNow = u.valToPos(ahoraSec, 'x', true);
          if (xNow >= left && xNow <= left + width) {
            ctx.save();
            ctx.strokeStyle = ACENTO;
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(xNow, top);
            ctx.lineTo(xNow, top + height);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = ACENTO;
            ctx.font      = 'bold 10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('ahora', xNow, top + 13);
            ctx.restore();
          }

          // Marcadores de pleamar/bajamar
          extremos.forEach(e => {
            const ex = u.valToPos(e.t / 1000, 'x', true);
            const ey = u.valToPos(e.altura,    'y', true);
            if (ex < left || ex > left + width) return;

            ctx.save();
            ctx.fillStyle = ACENTO;
            ctx.beginPath();
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.font      = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            if (e.tipo === 'pleamar') {
              ctx.fillText(e.altura.toFixed(1) + ' m', ex, ey - 18);
              ctx.fillText(fmtHM(e.t),                 ex, ey -  7);
            } else {
              ctx.fillText(fmtHM(e.t),                 ex, ey + 14);
              ctx.fillText(e.altura.toFixed(1) + ' m', ex, ey + 25);
            }
            ctx.restore();
          });
        },
      ],
    },
  };
}

export class PpCurvaMarea extends HTMLElement {
  constructor() {
    super();
    this._data  = null;
    this._chart = null;
    this._ro    = null;
  }

  connectedCallback() {
    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(this);
  }

  disconnectedCallback() {
    if (this._ro)    { this._ro.disconnect(); this._ro = null; }
    if (this._chart) { this._chart.destroy(); this._chart = null; }
  }

  set data(d) {
    this._data = d;
    if (this.isConnected) this._maybeRender();
  }

  get data() { return this._data; }

  _onResize() {
    const w = this.offsetWidth;
    if (w === 0 || !this._data) return;
    if (this._chart) {
      this._chart.setSize({ width: w, height: H });
    } else {
      this._maybeRender();
    }
  }

  _maybeRender() {
    const w = this.offsetWidth || 340;
    if (!this._data) return;
    this._doRender(w);
  }

  _doRender(w) {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
    this.textContent = '';

    const d = this._data;
    if (!d || !Array.isArray(d.puntos) || d.puntos.length < 4) return;

    const ahora    = d.ahora != null ? d.ahora : Date.now();
    const extremos = Array.isArray(d.extremos) ? d.extremos : [];

    const xData = d.puntos.map(p => p.t / 1000);
    const yData = d.puntos.map(p => p.nivel);

    const tooltip = document.createElement('div');
    tooltip.className = 'pp-marea-tooltip';

    this._chart = new uPlot(buildOpts(w, ahora / 1000, extremos, tooltip), [xData, yData], this);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-curva-marea')) {
  customElements.define('pp-curva-marea', PpCurvaMarea);
}
