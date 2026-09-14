# CLAUDE.md

Guía de orientación rápida para trabajar en este repo. Las convenciones
genéricas de estilo, tests, commits y seguridad ya están cubiertas por la
config global del equipo (`~/.claude/CLAUDE.md` + `team-claude/rules`); aquí
solo van hechos específicos de PescaPro.

Mapa estructural: ver AGENTS.md

## Qué es

App Android (Capacitor) de condiciones de pesca para costa: marea, viento,
oleaje, clima, temperatura del agua y corrientes, con un índice de pesca
(0-100) por modalidad (spinning/eging/surfcasting) y predicción de actividad
por especie. Todo con reglas transparentes (sin IA) y datos gratuitos de
Open-Meteo (forecast + marine + geocoding APIs), sin API key. Ver README.md
para el detalle funcional completo (mareas, solunar, índice, especies,
cuaderno, trofeos, competiciones sin servidor).

## Stack

JavaScript vanilla, sin build step, sin bundler, sin TypeScript, sin
framework de UI. Cada módulo se cuelga de `window.PP` (`PP.api`, `PP.mareas`,
`PP.indice`, `PP.ui`, `PP.app`...) y se carga vía `<script>` planos en
`www/index.html`, en orden de dependencia. Empaquetado a Android con
Capacitor 7. Mapa con Leaflet (vendored en `www/lib/leaflet/`). Astronomía
con SunCalc (vendored en `www/lib/suncalc.js`, funciona sin red).

## Comandos reales

```bash
npm install                      # deps de Capacitor (no hay deps de runtime)
npx cap add android               # una vez: crea android/ (gitignored, generado)
npx cap sync android              # copia www/ al proyecto nativo — repetir tras CUALQUIER cambio en www/
npx cap open android              # abre Android Studio para compilar/firmar

npm test                          # tests de lógica (mareas, índice, especies, records) — sin red
node test/test_api_live.js        # integración con el API real de Open-Meteo — requiere internet
npm i jsdom --no-save && node test/test_ui_smoke.js   # smoke test de render (jsdom no es dependencia fija)
```

Probar en navegador sin compilar nada: abrir `www/index.html` directamente
(doble clic). Es el mismo código que corre en el móvil.

No hay script `dev`/`start`; no hay linter ni formatter configurados en
`package.json`.

## Arquitectura

```
www/                 webDir de Capacitor — es la app entera, sin src/ separado
├── index.html        shell + orden de carga de <script> (importa!)
├── css/app.css        tema/colores en :root
├── js/
│   ├── config.js       config central: endpoints Open-Meteo, PP.MODOS (pesos
│   │                   por modalidad), PP.SEGURIDAD (umbrales), PP.MAREA_CLASES,
│   │                   tabla WMO, utilidades (PP.util.trap = scoring trapezoidal)
│   ├── api.js           fetch a Open-Meteo (clima/marino/geo) + caché en localStorage
│   │                   (arranque offline-first desde caché, refresco en paralelo)
│   ├── mareas.js        extrae pleamares/bajamares de la serie de nivel del mar
│   │                   (interpolación parabólica), clasifica amplitud, calcula flujo
│   ├── solunar.js       sol/luna via SunCalc, 100% local sin red
│   ├── indice.js        índice de pesca: pondera factores 0..1 (PP.util.trap) según
│   │                   pesos de PP.MODOS
│   ├── especies.js      definición de especies (temporada/agua/mar/marea/luz/luna) y
│   │                   cálculo de actividad (media geométrica ponderada)
│   ├── fotos.js         fotos del cuaderno: comprimidas, guardadas en IndexedDB
│   │                   (NO localStorage, NO servidor)
│   ├── cuaderno.js       registro de capturas (snapshot de condiciones + foto opcional)
│   ├── records.js       récords personales derivados del cuaderno
│   ├── trofeos.js       logros desbloqueables
│   ├── mapa.js           mapa Leaflet: viento, corrientes, carta náutica
│   ├── ui.js             capa de render de todas las vistas (668 líneas, el módulo más grande)
│   └── app.js            orquestación: estado global (st), arranque, navegación entre
│                        vistas, refresco periódico (PP.CONFIG.REFRESH_MS) y en
│                        visibilitychange, GPS, prefs en localStorage (clave pp_prefs)
└── lib/               vendored: leaflet, suncalc.js

test/                 tests planos con Node, sin framework de test
├── harness.js          shim: global.window = global + require() de www/js/*.js para
│                      poder testear módulos de navegador en Node sin bundler; check()/
│                      resumen() propios (resumen() hace process.exit(1) si falla algo)
├── fixtures.js         generación de datos de prueba
├── test_mareas.js, test_indice.js, test_especies.js, test_records.js   → cubiertos por `npm test`
├── test_api_live.js    NO cubierto por npm test (pide red real)
└── test_ui_smoke.js    NO cubierto por npm test (pide jsdom, instalar con --no-save)
```

**Flujo de datos**: `api.js` pide a Open-Meteo y cachea en `localStorage` →
`mareas.js`/`solunar.js`/`indice.js` procesan esos datos crudos → `ui.js`
renderiza. Las fotos del cuaderno van aparte, a IndexedDB.

## Convenciones y gotchas específicos de este repo

- **Namespace único `window.PP`**: todo módulo nuevo debe seguir el patrón
  `PP.nombre = (function () { ... return {...}; })();` y añadirse a
  `www/index.html` en la posición correcta según sus dependencias (antes de
  quien lo usa, después de lo que él usa).
- **El orden de `<script>` en `index.html` importa** — no hay resolución de
  módulos; un módulo que llegue tarde rompe en runtime, no en build (no hay
  build).
- **`npx cap sync android` es obligatorio tras tocar `www/`** — Android
  Studio compila la copia sincronizada, no `www/` en vivo.
- **`android/` no existe hasta `npx cap add android`** y está en
  `.gitignore` — no se versiona el proyecto nativo generado.
- **Permiso de ubicación no es automático**: hay que añadirlo a mano en
  `android/app/src/main/AndroidManifest.xml` después de `cap add android`
  (ver README).
- **Ajustes de dominio centralizados**, no dispersos: pesos del índice de
  pesca y umbrales de seguridad → `www/js/config.js`; alta/edición de
  especies → `www/js/especies.js`; tema visual → `:root` en
  `www/css/app.css`.
- **`test/harness.js` inyecta `global.window = global`** para poder
  `require()` código de navegador en Node — cualquier módulo nuevo en
  `www/js/` que quiera tests debe evitar APIs de navegador no cubiertas por
  ese shim (o gestionarlas condicionalmente, como ya hace `api.js` con
  `fetch`).
- **`npm test` no es la suite completa**: solo corre 4 de los 6 archivos de
  `test/`. Los otros dos (`test_api_live.js`, `test_ui_smoke.js`) se
  ejecutan a mano porque requieren red real o una dependencia (`jsdom`) no
  instalada por defecto.
- **Todo el dominio está nombrado en español** (`mareas`, `indice`,
  `especies`, `analizar`, `preparar`, `refrescar`...) — seguir esa
  convención al añadir código nuevo, no mezclar con nombres en inglés.
- **Sin backend propio**: las competiciones/ligas se resuelven con códigos
  compartidos manualmente entre usuarios (sin servidor ni verificación) — es
  una decisión de producto deliberada, no un hueco por completar.
- **Open-Meteo sin API key** pero con límites de uso no comercial — no
  añadir autenticación ni asumir que existe una clave en algún `.env`.
