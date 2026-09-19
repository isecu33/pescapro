# AGENTS.md — pescapro

> **Mapa estructural para agentes.** Regenerable con `/project-map`.
> Comportamiento y reglas → `CLAUDE.md` · Humanos/onboarding → `README.md`
> · Diseño y decisiones → — (no hay doc de arquitectura separado; ver `CLAUDE.md`)

- **Tipo:** app Android (Capacitor) — web vanilla sin framework, sin build step
- **Stack:** JavaScript vanilla (namespace `window.PP`) · Capacitor 7 (Android) · Leaflet y SunCalc vendored
- **Estado:** MVP funcional (sin `android/` generado en este checkout — se crea con `npx cap add android`)

---

## 1. Mapa de directorios

```
pescapro/
├── www/                    [src]  webDir de Capacitor — la app entera; se abre directamente en el navegador
│   ├── index.html           [src]  shell HTML + orden de carga de <script> (define el grafo de dependencias)
│   ├── css/app.css          [src]  único CSS legacy, tema/colores en :root
│   ├── js/                  [src]  módulos planos window.PP (ver §4) + nuevos: api_meteogalicia.js
│   ├── img/                 [src]  assets visuales de especies desplegados:
│   │   ├── svg/             [src]  siluetas SVG de especie (iconos en tarjetas/cabecera)
│   │   └── *.png            [src]  fotos PNG naturales (imagen principal del modal de ficha)
│   └── lib/                 [ext]  vendored a mano: leaflet/, suncalc.js
├── src/                    [src]  componentes y dominio en migración — coexisten con www/js/
│   ├── domain/              [src]  config.js, especies.js (espImgEl aquí), solunar.js, indice.js
│   └── ui/
│       ├── components/      [src]  Custom Elements: pp-curva-marea, pp-curva-solunar, pp-gauge, pp-captura-card...
│       └── views/           [src]  renderizadores de vista: vista-ahora, vista-especies, vista-mapa
├── img/                    [src]  fuentes originales de los assets de especie (SVGs + PNGs)
│   └── svg/                 [src]  fuentes SVG (se despliegan a www/img/svg/ con cap sync)
├── src/styles/theme.css    [src]  CSS para los componentes de src/ (complementa www/css/app.css)
├── test/                   [src]  tests planos de Node, sin framework (ver §3)
├── node_modules/           [ext]  deps Capacitor + uPlot — no editar
├── android/                [gen]  NO existe hasta `npx cap add android`, gitignored
├── package.json            [cfg]  scripts npm + deps (Capacitor, uPlot)
├── capacitor.config.json   [cfg]  appId, webDir=www, config Android
├── README.md                [doc]  detalle funcional completo
└── CLAUDE.md                [doc]  convenciones y gotchas específicos del repo
```

No hay `tsconfig.json`, `.eslintrc*`, `webpack.config.*` ni `ionic.config.json` en la raíz.

## 2. Arranque y comandos

- **Entrada / `main`:** `www/index.html` (abrir directamente en el navegador para probar, sin compilar nada)
- **Instalar:** `npm install`
- **Arrancar (dev):** no hay script `dev`/`start` — abrir `www/index.html` a doble clic
- **Build:** no hay build step (JS vanilla sin bundler). Para Android: `npx cap add android` (una vez) → `npx cap sync android` (tras CUALQUIER cambio en `www/`) → `npx cap open android`
- **Tests:** `npm test` (corre `test_mareas.js`, `test_indice.js`, `test_especies.js`, `test_records.js` — sin red). Además: `node test/test_api_live.js` (requiere red real) y `npm i jsdom --no-save && node test/test_ui_smoke.js` (requiere jsdom, no instalado por defecto)
- **Config / secretos:** no hay `.env`; `www/js/config.js` centraliza endpoints Open-Meteo (sin API key) y parámetros de dominio

## 3. Dónde va qué (tarea → ubicación)

| Para… | Toca… |
|---|---|
| pantalla/lógica web nueva | `www/js/` (nuevo módulo `PP.nombre = (function(){...})();`) + registrar `<script>` en `www/index.html` en la posición correcta según dependencias |
| ajustar pesos del índice de pesca / umbrales de seguridad | `www/js/config.js` (`PP.MODOS`, `PP.SEGURIDAD`) |
| alta/edición de especies — datos de dominio | `src/domain/especies.js` (fuente de verdad: campos `imagen`, `foto`, parámetros de actividad) |
| iconos de especie en componentes nuevos | `espImgEl(esp, clase)` de `src/domain/especies.js` — único punto de renderizado |
| iconos de especie en código legacy (www/js/ui.js) | `FOTOS_ESPECIE` (→ SVG) para tarjetas; `FOTOS_NATURAL` (→ PNG) para modal de ficha |
| añadir foto natural de una especie | Campo `foto` en `src/domain/especies.js` + copiar el PNG a `img/` y a `www/img/` + añadir entrada en `FOTOS_NATURAL` de `www/js/ui.js` |
| añadir silueta SVG de una especie | Campo `imagen` en `src/domain/especies.js` + copiar el SVG a `img/svg/` y a `www/img/svg/` + actualizar `FOTOS_ESPECIE` en `www/js/ui.js` |
| tema visual / colores (legacy) | `www/css/app.css` (`:root`) |
| tema visual / colores (componentes src/) | `src/styles/theme.css` |
| llamadas a Open-Meteo / caché | `www/js/api.js` |
| cálculo de mareas / solunar / índice | `www/js/mareas.js` · `www/js/solunar.js` · `www/js/indice.js` |
| cuaderno de capturas / fotos / récords / trofeos | `www/js/cuaderno.js` · `www/js/fotos.js` · `www/js/records.js` · `www/js/trofeos.js` |
| mapa (viento/corrientes/carta náutica) | `www/js/mapa.js` |
| render de vistas / UI (legacy) | `www/js/ui.js` |
| componentes web reutilizables | `src/ui/components/` (Custom Elements: pp-curva-marea, pp-curva-solunar, pp-gauge, …) |
| orquestación / arranque / navegación entre vistas | `www/js/app.js` (se carga último) |
| config nativa Android | `capacitor.config.json` (+ `android/app/src/main/AndroidManifest.xml` tras `cap add android`, p.ej. permiso de ubicación) |
| test de un módulo | `test/test_<módulo>.js` (convención `test_<módulo>.js`, no `*.test.js`/`*.spec.js`) + añadir al script `test` de `package.json` si debe correr en CI |

## 4. Capas y reglas de import

- No hay módulos ES/CommonJS ni bundler: la única forma de "importar" es el orden de `<script>` en `www/index.html`. Un módulo debe declararse **después** de los módulos de los que depende y **antes** de los que lo usan.
- Orden real actual (grafo de dependencias): `lib/leaflet/leaflet.js` → `lib/suncalc.js` → `config.js` → `especies.js` → `api.js` → `mareas.js` → `solunar.js` → `indice.js` → `fotos.js` → `cuaderno.js` → `records.js` → `trofeos.js` → `mapa.js` → `ui.js` → `app.js`.
- Todo módulo se cuelga del namespace único `window.PP` (`PP.api`, `PP.mareas`, `PP.ui`, ...) — nunca declarar globals sueltos.
- `test/harness.js` simula `window` (`global.window = global`) para poder `require()` los módulos de `www/js/` en Node; un módulo nuevo que use APIs de navegador no cubiertas por ese shim debe gestionarlas condicionalmente (como hace `api.js` con `fetch`) para seguir siendo testeable.

## 5. Convenciones locales de estructura

- **Naming:** dominio nombrado en español (`mareas`, `indice`, `especies`, `analizar`, `preparar`, `refrescar`...) — no mezclar con inglés.
- **Tests:** `test/test_<módulo>.js`, mapeando 1:1 con el módulo de `www/js/` que testean. `npm test` solo cubre 4 de los 8 archivos de `test/`; `test_api_live.js` y `test_ui_smoke.js` se ejecutan a mano.
- **Contenido data-driven:** especies y sus parámetros en `www/js/especies.js`; pesos/umbrales en `www/js/config.js`.
- **NO tocar:** `android/` (generado por Capacitor, gitignored, se regenera con `npx cap sync android`); `node_modules/`; `www/lib/` (vendored a mano, no gestionado por npm).

## 6. Mapas anidados

Ninguno (proyecto de un solo nivel — `www/js/` es una carpeta plana sin subcarpetas por capa).

## 7. Mantenimiento

Regenerable con `/project-map`. **No** metas aquí comportamiento (→ `CLAUDE.md`),
onboarding (→ `README.md`) ni rationale de diseño.
Si una ruta de este mapa deja de existir, el mapa está desactualizado: re-ejecuta `/project-map`.
