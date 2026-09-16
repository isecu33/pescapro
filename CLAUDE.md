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

## Stack — App moderna (Vite) vs. legacy

**App a editar en tareas: `/src/` (Vite, moderna)**
- JavaScript con módulos ES (`import`/`export`)
- Bundleada con Vite
- Estructura: `src/domain/`, `src/ui/`, `src/styles/`
- Sirve con `npm run dev` (Vite dev server)

**App legacy (referencia): `/www/` (Capacitor, vanilla)**
- JavaScript vanilla, sin build step, sin bundler, sin TypeScript
- Cada módulo se cuelga de `window.PP` (`PP.api`, `PP.mareas`, etc.)
- Se carga vía `<script>` planos en `www/index.html`, en orden de dependencia
- Empaquetado a Android con Capacitor 7 (sincronización con `npx cap sync android`)
- Mapa con Leaflet (vendored en `www/lib/leaflet/`)
- Astronomía con SunCalc (vendored en `www/lib/suncalc.js`, funciona sin red)

## Comandos reales

**App moderna (Vite):**
```bash
npm install                      # instala deps (Vite, testing, etc.)
npm run dev                       # dev server Vite en http://localhost:5173
npm run build                     # build para dist/
npm run preview                   # preview del build en http://localhost:4173
npm test                          # tests de src/ (si están configurados)
```

**App legacy (Capacitor):**
```bash
npx cap add android               # una vez: crea android/ (gitignored, generado)
npx cap sync android              # copia www/ al proyecto nativo — repetir tras CUALQUIER cambio en www/
npx cap open android              # abre Android Studio para compilar/firmar

node scripts/serve.js             # dev server local para www/ en http://localhost:8090
node test/test_api_live.js        # integración con el API real de Open-Meteo — requiere internet
npm i jsdom --no-save && node test/test_ui_smoke.js   # smoke test de render (jsdom no es dependencia fija)
```

Probar app legacy en navegador sin compilar: abrir `www/index.html` directamente
(doble clic). Es el mismo código que corre en el móvil.

No hay linter ni formatter configurados en `package.json`.

## Arquitectura

### App moderna (Vite) — LA PRINCIPAL

```
src/                 código fuente moderno con ES modules
├── main.js           entry point de Vite
├── app.js            componente raíz / orquestación
├── domain/           lógica de dominio
│   ├── api.js         fetch a Open-Meteo + caché en localStorage
│   ├── mareas.js      cálculo de pleamares/bajamares
│   ├── solunar.js     sol/luna via SunCalc
│   ├── indice.js      índice de pesca (ponderación de factores)
│   ├── especies.js    definición de especies + actividad
│   ├── cuaderno.js    registro de capturas
│   ├── records.js     récords personales
│   ├── trofeos.js     logros desbloqueables
│   └── ...otros
├── ui/               componentes de interfaz (vistas, Cards, etc.)
│   ├── Vista.js       vistas principales
│   ├── Card*.js       componentes de tarjeta
│   └── ...
└── styles/           CSS global y variables de tema

dist/                 salida de build (generada por `npm run build`)

index.html           shell HTML + CSP headers
vite.config.mjs      configuración de bundler
```

### App legacy (Capacitor) — REFERENCIA

```
www/                 webDir de Capacitor — código vanilla para Android
├── index.html        shell + orden de carga de <script> (importa!)
├── css/app.css        tema/colores en :root
├── js/               módulos vanilla en window.PP
│   ├── config.js, api.js, mareas.js, solunar.js, indice.js, 
│   ├── especies.js, fotos.js, cuaderno.js, records.js, trofeos.js, 
│   ├── mapa.js, ui.js, app.js
│   └── ...
└── lib/              vendored: leaflet, suncalc.js

test/                tests planos con Node
├── harness.js        shim para poder require() código de navegador en Node
├── fixtures.js, test_mareas.js, test_indice.js, test_especies.js, test_records.js
├── test_api_live.js, test_ui_smoke.js
└── ...
```

**Flujo de datos**: `api.js` pide a Open-Meteo y cachea en `localStorage` →
`mareas.js`/`solunar.js`/`indice.js` procesan esos datos crudos → UI los renderiza.

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

## Assets visuales de especies (decisión sep-16)

El sistema de imágenes usa **dos assets separados por propósito**:

| Campo | Tipo | Ruta | Uso |
|-------|------|------|-----|
| `imagen` | SVG silueta | `./img/svg/<id>.svg` | Iconos en tarjetas, cabeceras, capturas |
| `foto` | PNG fotorrealista | `./img/<id>.png` | Imagen principal del modal de ficha |

- `foto` es **opcional** (`null` si la especie no tiene foto — actualmente sargo).
- `imagen` lo tienen todas las especies excepto las futuras hasta que se añada su SVG.
- Fuentes en `img/svg/` e `img/` (raíz del repo); desplegadas en `www/img/svg/` y `www/img/`.

**En los componentes nuevos** (`src/`): usa `espImgEl(esp, clase)` de
`src/domain/especies.js` — es el único punto de renderizado de iconos. Devuelve
un `<img>` con el SVG o un `<span>` con el emoji de fallback.

**En el código legacy** (`www/js/ui.js`) hay dos mappings diferenciados:
- `FOTOS_ESPECIE` → rutas SVG, para iconos en tarjetas y capturas.
- `FOTOS_NATURAL` → rutas PNG, para la foto grande en el modal de ficha.
- **No mezclarlos**: el bug de sep-16 fue exactamente usar `FOTOS_ESPECIE`
  donde debía ir `FOTOS_NATURAL`, haciendo que el modal mostrase la silueta
  en lugar de la foto real.

## Flujo de git (decisión sep-16)

- **Un commit por tarea** antes de pasar a la siguiente.
- **Rama `develop`** para el trabajo en curso; **PR a `master`** al cerrar
  un conjunto de tareas coherente.
- Tests (`npm test`) siempre deben pasar antes de commitear.
