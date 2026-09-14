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
├── www/                    [src]  webDir de Capacitor — la app entera, sin src/ separado
│   ├── index.html           [src]  shell HTML + orden de carga de <script> (define el grafo de dependencias)
│   ├── css/app.css          [src]  único CSS, tema/colores en :root
│   ├── js/                  [src]  13 módulos planos, cada uno cuelga de window.PP (ver §4)
│   └── lib/                 [ext]  vendored a mano (no npm): leaflet/ (leaflet.js, leaflet.css, images/), suncalc.js
├── test/                   [src]  tests planos de Node, sin framework (ver §3)
├── node_modules/           [ext]  deps de @capacitor/cli y @capacitor/android — no editar
├── android/                [gen]  NO existe en este checkout; se genera con `npx cap add android`, gitignored
├── package.json            [cfg]  scripts npm + deps Capacitor
├── capacitor.config.json   [cfg]  appId, webDir=www, config Android
├── .gitignore              [cfg]  excluye node_modules/, android/, dist/, .gradle/, keystores
├── README.md                [doc]  detalle funcional completo (mareas, solunar, índice, especies, cuaderno, trofeos, publicación en Play)
└── CLAUDE.md                [doc]  guía de orientación específica del repo (arquitectura, gotchas, convenciones)
```

No hay `docs/`, `.env*`, `tsconfig.json`, `.eslintrc*`, `vite.config.*`, `webpack.config.*` ni `ionic.config.json` en la raíz.

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
| alta/edición de especies | `www/js/especies.js` |
| tema visual / colores | `www/css/app.css` (`:root`) |
| llamadas a Open-Meteo / caché | `www/js/api.js` |
| cálculo de mareas / solunar / índice | `www/js/mareas.js` · `www/js/solunar.js` · `www/js/indice.js` |
| cuaderno de capturas / fotos / récords / trofeos | `www/js/cuaderno.js` · `www/js/fotos.js` · `www/js/records.js` · `www/js/trofeos.js` |
| mapa (viento/corrientes/carta náutica) | `www/js/mapa.js` |
| render de vistas / UI | `www/js/ui.js` (módulo más grande del proyecto) |
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
