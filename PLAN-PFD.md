# Plan: PFD UX Corrections
**Branch target:** `grind/vite-ionic-migration` exclusively  
**Source analysis:** Perception-First Design composite run (analyze + solve + evaluate), 2026-09-14  
**Composite score before:** 63/100 — L3 Perception Bias (54) and L4 Decision Architecture (58) are the weak layers  

---

## What this fixes

| Finding | Layer | Impact |
|---|---|---|
| Mode selection gates the index — technique choice before conditions answer | L4 | High |
| No temporal reference on index — 72/100 has no behavioral signal | L3 | High |
| Factor breakdown: 7-9 rows × 3 signals exceed WM budget | L0 | Medium |
| Factor bars: color-only status, no co-present label | L2 | Medium |
| Near-miss amber tokens: `--ambar` and `--acento` converge at 11-13px | L2 | Low-Medium |

---

## Phase 1 — CSS token fix (15 min)

**File:** `src/styles/theme.css` *(migration branch uses this, not `www/css/app.css`)*

Shift `--ambar` away from `--acento` so they are perceptually distinct at 11-13px:

```css
/* Line ~16, in :root */
--ambar: #ffe047;   /* was: #ffd60a — more yellow, clearly distinct from --acento #ffaf2e */
```

Verify no visual regression on: `.pp-tag-mayor` border, `.pp-banner-amarillo` bg/border, `.pp-update.viejo` color, marea amplitude dot, `.pp-liga-próxima` color.

**Test:** `npm test` must still pass. Visual spot-check at `localhost:5173`.

---

## Phase 2 — Factor breakdown UX (45 min)

**File:** `src/ui/views/vista-ahora.js`, function `desgloseFactores` (line ~164)

### 2a — Status label on bars

After `rel.style.background = ...`, add a status text node co-present with the color:

```js
// after the barra block, before appending peso
const estado = document.createElement('span');
estado.className = 'pp-factor-estado';
const etiqueta = v >= 0.7 ? 'bien' : v >= 0.45 ? 'ok' : 'bajo';
estado.textContent = etiqueta;
estado.style.color = rel.style.background;  // inherits the semantic color
fila.appendChild(barra);
fila.appendChild(estado);
fila.appendChild(peso);
```

Add to `www/css/app.css`:
```css
.pp-factor-estado { flex: 0 0 28px; text-align: right; font-size: 10.5px; }
```

### 2b — Progressive disclosure: top 3 + expand

Replace the `Object.keys(pesos).sort(...).forEach(...)` loop:

```js
const sorted = Object.keys(pesos).sort((a, b) => pesos[b] - pesos[a]);
const visibles = sorted.slice(0, 3);
const ocultos = sorted.slice(3);

visibles.forEach(k => content.appendChild(filaFactor(f, pesos, k)));

if (ocultos.length) {
  const btn = document.createElement('button');
  btn.className = 'pp-chip';
  btn.style.marginTop = '6px';
  btn.textContent = `Ver todos (${sorted.length})`;
  btn.addEventListener('click', () => {
    ocultos.forEach(k => content.insertBefore(filaFactor(f, pesos, k), btn));
    btn.remove();
  });
  content.appendChild(btn);
}
```

Extract existing row construction into `filaFactor(f, pesos, k)` — same logic, returns a `div.pp-factor`.

**Test:** Verify top 3 render on load; click expands remaining rows; `npm test` passes.

---

## Phase 3 — Yesterday's delta (1h)

**File:** `src/app.js`

### 3a — Store daily peak

After `st.ctx = preparar(datos)` in `refrescar()` (around line 96), call:

```js
_guardarPicoDia(st.modo);
```

New private function (add before the `return` statement):

```js
const PICO_KEY = 'pp_pico';

function _guardarPicoDia(modo) {
  if (!st.datos || !st.ctx) return;
  const hoyStr = new Date().toISOString().slice(0, 10);
  try {
    const r = JSON.parse(localStorage.getItem(PICO_KEY) || '{}');
    const valorHoy = Math.max(...st.datos.horas.map(h => indiceHora(h, modo, st.ctx).valor));
    if (r.fecha !== hoyStr) {
      r.ayer = r.hoy ?? null;
      r.hoy = valorHoy;
      r.fecha = hoyStr;
    } else {
      r.hoy = Math.max(r.hoy ?? 0, valorHoy);
    }
    localStorage.setItem(PICO_KEY, JSON.stringify(r));
  } catch (_) { /* noop */ }
}
```

Export the delta for views:

```js
// In the returned public API object:
function picoDelta() {
  try {
    const r = JSON.parse(localStorage.getItem(PICO_KEY) || '{}');
    if (r.hoy == null || r.ayer == null) return null;
    return { hoy: r.hoy, ayer: r.ayer, delta: r.hoy - r.ayer };
  } catch (_) { return null; }
}
// add picoDelta to return { ..., picoDelta }
```

Add `import { indiceHora } from './domain/indice.js'` if not already imported. Check existing imports in `src/app.js` first.

**Test:** Add unit test in `src/app.test.js` for the localStorage rotation logic. `npm test` passes.

---

## Phase 4 — "Resumen del día" summary card (1.5h)

**File:** `src/ui/views/vista-ahora.js`

### 4a — New `resumenDia(st, picoDelta)` function

Add after the existing `selectorModo` function. Uses `mejoresVentanas` from `src/domain/indice.js` (already exported — no new domain code needed):

```js
import { indiceHora, horaMasCercana, mejoresVentanas, especiesEn } from '../../domain/indice.js';
// add mejoresVentanas to existing import line
```

```js
function resumenDia(st, delta) {
  const { card, content } = crearCard(null); // no title — the verdict IS the card
  card.className += ' pp-resumen-dia';

  if (!st.ctx) {
    const sp = document.createElement('ion-spinner');
    content.appendChild(sp);
    return card;
  }

  const h = horaMasCercana(st.datos.horas, new Date());
  const idx = indiceHora(h, st.modo, st.ctx);
  const v = idx.valor;
  const colorVar = v >= 65 ? 'var(--verde)' : v >= 40 ? 'var(--ambar)' : 'var(--rojo)';
  const label = v >= 65 ? 'BUENAS' : v >= 40 ? 'REGULARES' : 'MALAS';

  // Verdict row — the headline
  const cabeza = document.createElement('div');
  cabeza.className = 'pp-resumen-cabeza';
  const punto = document.createElement('span');
  punto.className = 'pp-resumen-punto';
  punto.style.color = colorVar;
  punto.textContent = '●';
  const veredicto = document.createElement('span');
  veredicto.className = 'pp-resumen-veredicto';
  veredicto.style.color = colorVar;
  veredicto.textContent = label + ' CONDICIONES';
  cabeza.appendChild(punto);
  cabeza.appendChild(veredicto);
  content.appendChild(cabeza);

  // Mode + score + delta sub-row
  const sub = document.createElement('div');
  sub.className = 'pp-resumen-sub';
  const modoNombre = MODOS[st.modo]?.nombre ?? st.modo;
  sub.textContent = `${modoNombre} · ${v}/100`;
  if (delta?.delta != null) {
    const d = document.createElement('span');
    d.className = 'pp-delta ' + (delta.delta >= 0 ? 'pp-delta-sube' : 'pp-delta-baja');
    d.textContent = ` ${delta.delta >= 0 ? '▲' : '▼'}${Math.abs(delta.delta)} vs ayer`;
    sub.appendChild(d);
  }
  content.appendChild(sub);

  // Best window — uses existing mejoresVentanas()
  const ventanas = mejoresVentanas(st.ctx, st.modo, { umbral: 50, maxVentanas: 1, horas: 18 });
  if (ventanas.length) {
    const v0 = ventanas[0];
    const vent = document.createElement('div');
    vent.className = 'pp-resumen-ventana';
    vent.textContent = `Mejor momento: ${formatHora(v0.inicio)}–${formatHora(v0.fin)}`;
    content.appendChild(vent);
  }

  // Tide state
  const marea = st.ctx.mareas?.ahora;
  if (marea) {
    const tm = document.createElement('div');
    tm.className = 'pp-resumen-marea';
    tm.textContent = (marea.subiendo ? '↗ Marea subiendo' : '↘ Bajando');
    content.appendChild(tm);
  }

  return card;
}

function formatHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
```

### 4b — Wire into `renderAhora`

Import the public API to get the delta. But `vista-ahora.js` is a pure view — it must NOT import `app.js` (circular dep risk). Pass `delta` as a parameter instead:

```js
// Signature change:
export function renderAhora(contenedor, st, delta = null) {
  contenedor.replaceChildren();
  if (!st.ctx) { contenedor.appendChild(elCargando()); return; }
  // ...
  contenedor.appendChild(resumenDia(st, delta));   // ← before selectorModo
  contenedor.appendChild(selectorModo(st));
  // rest unchanged
}
```

In `src/app.js`, wherever `renderAhora` is called, pass the delta:

```js
// Find the call site that passes the contenedor and st
renderAhora(contenedor, st, picoDelta());
```

### 4c — CSS for summary card

Add to `www/css/app.css`:

```css
.pp-resumen-dia { margin-bottom: 10px; }
.pp-resumen-cabeza { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.pp-resumen-punto { font-size: 14px; }
.pp-resumen-veredicto { font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
.pp-resumen-sub { font-size: 13px; color: var(--texto2); margin-bottom: 5px; }
.pp-resumen-ventana, .pp-resumen-marea { font-size: 13px; color: var(--texto2); margin-top: 2px; }
.pp-resumen-ventana b { color: var(--texto); }
.pp-delta { font-size: 11.5px; font-weight: 700; }
.pp-delta-sube { color: var(--verde); }
.pp-delta-baja { color: var(--rojo); }
```

**Test:** 
- Renders on load without interaction
- Mode chips below the summary still change the displayed mode
- `mejoresVentanas` returns empty → ventana row hidden (no crash)
- `picoDelta()` returns null (first day) → no delta shown (no crash)
- `npm test` passes

---

## Dependency order

```
Phase 1  → no deps, do first (CSS only, safe)
Phase 2  → no deps, do in parallel with Phase 1
Phase 3  → no deps on 1/2; must complete before Phase 4
Phase 4  → requires Phase 3 (picoDelta) + mejoresVentanas already exported
```

## Files touched

| File | Phase | Change type |
|---|---|---|
| `src/styles/theme.css` | 1 | token value (migration CSS, not `www/css/app.css`) |
| `www/css/app.css` | 2a, 4c | additive only (shared with master) |
| `src/ui/views/vista-ahora.js` | 2a, 2b, 4a, 4b | modify + 1 new function |
| `src/app.js` | 3a | 1 private fn + 1 export + pass delta to view |

`src/domain/indice.js` — **no changes needed.** `mejoresVentanas` is already exported.

---

## Conflicts with the migration plan

> **MUST READ before implementing.**

1. **Branch**: All changes target `grind/vite-ionic-migration` exclusively. Do NOT apply to `master` — applying to master and then merging will create conflicts in `www/js/ui.js`, `www/js/app.js`, `www/js/indice.js` which the migration has fully restructured.

2. **`mejorVentana` is already done**: The original PFD plan included adding `mejorVentana()` to `www/js/indice.js`. The migration branch already has `mejoresVentanas()` exported from `src/domain/indice.js` (line 127). No domain changes needed — just use the existing export.

3. **Ionic Custom Elements**: The migration uses `ion-card`, `ion-spinner`. The `crearCard()` helper in `vista-ahora.js` already wraps `ion-card-header + ion-card-content`. `resumenDia()` must use `crearCard()` (or the same Ionic pattern) — not raw `div.pp-card`.

4. **`renderAhora` signature change**: Adding `delta` as a third parameter is a breaking change for any test that calls `renderAhora(el, st)`. Update `src/ui/views/vista-ahora.test.js` call sites — use `renderAhora(el, st, null)` or default the parameter (already shown as `delta = null` above, so existing calls are safe).

5. **CSS file shared between branches**: `www/css/app.css` exists on both `master` and the migration branch. The Phase 1 token fix (`--ambar`) can be applied to master as a low-risk standalone commit if the migration merge is still distant — it will not conflict because it's a single `:root` token value change.
