/* <pp-curva-solunar> -- gráfico de altitud sol + luna con uPlot.
   API pública: set data({ xData, solData, lunaData, periodos, ahora })
   - xData:    [epochSec, ...]  — 73 puntos cada 20 min (24 h)
   - solData:  [grados, ...]   — altitud del sol (-90..90)
   - lunaData: [grados, ...]   — altitud de la luna (-90..90)
   - periodos: [{tipo, inicio, fin}]  — periodos solunares
   - ahora:    epochMs */
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const SOL      = '#ff7200';
const SOL_FILL = 'rgba(255, 114, 0, 0.10)';
const LUNA     = 'rgba(190, 210, 255, 0.90)';
const LUNA_FILL= 'rgba(180, 200, 255, 0.07)';
const GRID     = 'rgba(255, 255, 255, 0.06)';
const AXIS     = 'rgba(255, 255, 255, 0.40)';
const H        = 190;

function fmtHM(epochMs) {
  return new Date(epochMs).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function buildOpts(w, ahoraSec, periodos, tooltip) {
  const bandas = periodos.map(p => ({
    tipo: p.tipo,
    ini: p.inicio.getTime() / 1000,
    fin: p.fin.getTime() / 1000,
  }));

  return {
    width:  w,
    height: H,
    padding: [20, 6, 0, 0],
    cursor: {
      show: true, x: true, y: false,
      drag: { x: false, y: false },
    },
    legend: { show: false },
    scales: {
      x: { time: true },
      y: { auto: false, range: [-90, 90] },
    },
    axes: [
      {
        stroke: AXIS, grid: { stroke: GRID, width: 1 },
        ticks: { stroke: GRID, width: 1, size: 3 },
        font: '11px system-ui, sans-serif', gap: 4,
        values: (_u, ticks) => ticks.map(t => fmtHM(t * 1000)),
      },
      {
        stroke: AXIS, grid: { stroke: GRID, width: 1 },
        ticks: { stroke: GRID, width: 1, size: 3 },
        font: '11px system-ui, sans-serif', gap: 4, size: 38,
        values: (_u, ticks) => ticks.map(v => (v != null ? v.toFixed(0) + '°' : '')),
      },
    ],
    series: [
      {},
      { stroke: SOL,  fill: SOL_FILL,  width: 2   },
      { stroke: LUNA, fill: LUNA_FILL, width: 1.5 },
    ],
    hooks: {
      ready: [
        (u) => { u.root.style.position = 'relative'; u.root.appendChild(tooltip); },
      ],
      setCursor: [
        (u) => {
          const idx = u.cursor.idx;
          if (idx == null) { tooltip.style.display = 'none'; return; }
          const sv = u.data[1][idx], lv = u.data[2][idx];
          if (sv == null) { tooltip.style.display = 'none'; return; }
          const t = u.data[0][idx];
          tooltip.textContent = fmtHM(t * 1000) + '  ·  ☀ ' + sv.toFixed(1) + '°  ☽ ' + lv.toFixed(1) + '°';
          tooltip.style.display = 'block';
          const yAxisPx = u.bbox.left / devicePixelRatio;
          const cursorX = yAxisPx + u.cursor.left;
          const tipW = 170;
          const totalW = u.root.offsetWidth;
          tooltip.style.left = (cursorX + tipW + 8 > totalW ? cursorX - tipW - 4 : cursorX + 8) + 'px';
          tooltip.style.top = '4px';
        },
      ],
      draw: [
        (u) => {
          const ctx = u.ctx;
          const { left, top, width, height } = u.bbox;

          // Bandas de periodos solunares
          bandas.forEach(b => {
            const x1 = u.valToPos(b.ini, 'x', true);
            const x2 = u.valToPos(b.fin, 'x', true);
            if (x2 < left || x1 > left + width) return;
            ctx.save();
            ctx.fillStyle = b.tipo === 'mayor'
              ? 'rgba(255, 114, 0, 0.16)'
              : 'rgba(255, 172, 0, 0.10)';
            ctx.fillRect(Math.max(x1, left), top, Math.min(x2, left + width) - Math.max(x1, left), height);
            ctx.restore();
          });

          // Línea del horizonte (y = 0°)
          const y0 = u.valToPos(0, 'y', true);
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(left, y0);
          ctx.lineTo(left + width, y0);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.font = '9px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('horizonte', left + 4, y0 - 3);
          ctx.restore();

          // Línea "ahora"
          const xNow = u.valToPos(ahoraSec, 'x', true);
          if (xNow >= left && xNow <= left + width) {
            ctx.save();
            ctx.strokeStyle = SOL;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(xNow, top);
            ctx.lineTo(xNow, top + height);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = SOL;
            ctx.font = 'bold 10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('ahora', xNow, top + 13);
            ctx.restore();
          }

          // Leyenda sol / luna en esquina
          ctx.save();
          ctx.font = '10px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillStyle = SOL;
          ctx.fillText('☀ Sol', left + width, top + 14);
          ctx.fillStyle = LUNA;
          ctx.fillText('☽ Luna', left + width, top + 26);
          ctx.restore();
        },
      ],
    },
  };
}

export class PpCurvaSolunar extends HTMLElement {
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
    if (!d || !Array.isArray(d.xData) || d.xData.length < 2) return;

    const ahora    = d.ahora != null ? d.ahora / 1000 : Date.now() / 1000;
    const periodos = Array.isArray(d.periodos) ? d.periodos : [];

    const tooltip = document.createElement('div');
    tooltip.className = 'pp-marea-tooltip';

    this._chart = new uPlot(
      buildOpts(w, ahora, periodos, tooltip),
      [d.xData, d.solData, d.lunaData],
      this
    );
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-curva-solunar')) {
  customElements.define('pp-curva-solunar', PpCurvaSolunar);
}
