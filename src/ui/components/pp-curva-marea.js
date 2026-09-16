/* <pp-curva-marea> -- gráfico de nivel del mar con canvas (port del legacy).
   API pública: set data({ puntos, extremos, ahora })
   - puntos:  [{t: epochMs, nivel: number}]
   - extremos: [{tipo: 'pleamar'|'bajamar', t: epochMs, altura: number}]
   - ahora:   epochMs */

function fmtHM(epochMs) {
  return new Date(epochMs).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export class PpCurvaMarea extends HTMLElement {
  constructor() {
    super();
    this._data  = null;
    this._ro    = null;
    this._canvas = null;
    this._hud    = null;
    this._wrap   = null;
  }

  connectedCallback() {
    if (!this._wrap) this._initDOM();
    this._ro = new ResizeObserver(() => this._dibujar());
    this._ro.observe(this);
  }

  disconnectedCallback() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  set data(d) {
    this._data = d;
    if (this.isConnected && this._wrap) this._dibujar();
  }

  get data() { return this._data; }

  _initDOM() {
    this._wrap = document.createElement('div');
    this._wrap.className = 'pp-marea-chart-wrap';

    this._canvas = document.createElement('canvas');
    this._canvas.className = 'pp-marea-canvas';
    this._canvas.style.height = '120px';

    this._hud = document.createElement('div');
    this._hud.className = 'pp-marea-hud';

    this._wrap.append(this._canvas, this._hud);
    this.appendChild(this._wrap);

    this._canvas.addEventListener('mousemove',  e => this._mostrarHUD(e.clientX));
    this._canvas.addEventListener('touchmove',  e => { e.preventDefault(); this._mostrarHUD(e.touches[0].clientX); }, { passive: false });
    this._canvas.addEventListener('mouseleave', () => { this._hud.style.display = 'none'; this._dibujar(); });
    this._canvas.addEventListener('touchend',   () => { this._hud.style.display = 'none'; this._dibujar(); });
  }

  _getPts() {
    if (!this._data?.puntos?.length) return [];
    return this._data.puntos;
  }

  _dibujar(cursorT) {
    const pts = this._getPts();
    if (pts.length < 4) return;

    const d       = this._data;
    const ahora   = d.ahora ?? Date.now();
    const desde   = ahora - 6  * 3600e3;
    const hasta   = ahora + 30 * 3600e3;
    const extremos = d.extremos ?? [];

    const canvas = this._canvas;
    const W = canvas.offsetWidth || 340;
    const H = canvas.offsetHeight || 120;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const PAD_X = 8, PAD_Y = 20;
    const vals = pts.map(p => p.nivel);
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    const rng  = maxV - minV || 1;
    const tx = t => PAD_X + (t - desde) / (hasta - desde) * (W - 2 * PAD_X);
    const ty = v => H - PAD_Y - (v - minV) / rng * (H - 2 * PAD_Y);

    const splinePath = () => {
      ctx.moveTo(tx(pts[0].t), ty(pts[0].nivel));
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const [x0, y0] = [tx(p0.t), ty(p0.nivel)];
        const [x1, y1] = [tx(p1.t), ty(p1.nivel)];
        const [x2, y2] = [tx(p2.t), ty(p2.nivel)];
        const [x3, y3] = [tx(p3.t), ty(p3.nivel)];
        ctx.bezierCurveTo(
          x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6,
          x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6,
          x2, y2
        );
      }
    };

    // Gradiente relleno
    const grad = ctx.createLinearGradient(0, PAD_Y, 0, H);
    grad.addColorStop(0, 'rgba(255,114,0,.40)');
    grad.addColorStop(1, 'rgba(255,114,0,.02)');
    ctx.beginPath(); splinePath();
    ctx.lineTo(tx(pts[pts.length - 1].t), H);
    ctx.lineTo(tx(pts[0].t), H);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Línea naranja
    ctx.beginPath(); splinePath();
    ctx.strokeStyle = '#ff7200'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();

    // Etiquetas horas X
    ctx.fillStyle = 'rgba(200,200,200,.35)';
    ctx.font = '8px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (let t = desde; t <= hasta; t += 6 * 3600e3) {
      const lx = tx(t);
      if (lx < PAD_X + 10 || lx > W - PAD_X - 10) continue;
      ctx.fillText(String(new Date(t).getHours()).padStart(2, '0') + 'h', lx, H - 1);
    }

    // Marcadores de pleamar/bajamar
    extremos.forEach(e => {
      const ex = tx(e.t), ey = ty(e.altura);
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffab00'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,60,.9)';
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(fmtHM(e.t), ex, e.tipo === 'pleamar' ? ey - 12 : ey + 12);
    });

    // Línea "ahora"
    const xNow = tx(ahora);
    ctx.save(); ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xNow, 3); ctx.lineTo(xNow, H - PAD_Y); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('ahora', xNow, 3);

    // Cursor interactivo
    if (cursorT != null) {
      const xC = tx(cursorT);
      ctx.save(); ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xC, 0); ctx.lineTo(xC, H); ctx.stroke();
      ctx.restore();
    }
  }

  _mostrarHUD(clientX) {
    const pts = this._getPts();
    if (!pts.length) return;

    const d     = this._data;
    const ahora = d.ahora ?? Date.now();
    const desde = ahora - 6  * 3600e3;
    const hasta = ahora + 30 * 3600e3;

    const rect  = this._canvas.getBoundingClientRect();
    const xRel  = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const t     = desde + xRel / rect.width * (hasta - desde);

    let nearest = pts[0];
    pts.forEach(p => {
      if (Math.abs(p.t - t) < Math.abs(nearest.t - t)) nearest = p;
    });
    const ni  = pts.indexOf(nearest);
    const dir = ni > 0 && nearest.nivel > pts[ni - 1].nivel ? '↑' : '↓';

    this._dibujar(nearest.t);

    const horaSpan = document.createElement('span');
    horaSpan.className = 'pp-marea-hud-hora';
    horaSpan.textContent = fmtHM(nearest.t);

    const valSpan = document.createElement('span');
    valSpan.className = 'pp-marea-hud-val';
    valSpan.textContent = nearest.nivel.toFixed(2) + ' m ' + dir;

    this._hud.replaceChildren(horaSpan, valSpan);
    this._hud.style.display = 'flex';

    const W   = this._canvas.offsetWidth;
    const PAD_X = 8;
    const xH  = PAD_X + (nearest.t - desde) / (hasta - desde) * (W - 2 * PAD_X);
    this._hud.style.left = Math.max(60, Math.min(W - 60, xH)) + 'px';
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-curva-marea')) {
  customElements.define('pp-curva-marea', PpCurvaMarea);
}
