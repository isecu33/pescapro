# Auditoría UX/UI — Marante (PescaPro), app `src/` (Vite)

Auditoría visual completa de las 9 secciones de la app moderna, con capturas
reales (Playwright, viewport móvil 393×852) y análisis con la skill
`perception-first-design:all` (modos analyze/solve/evaluate) por sección.
**No se ha tocado ningún archivo bajo `src/`** — esto es documentación de
planes de mejora para implementación progresiva futura.

## Metodología

- **Rama/commit auditado:** `feature/cuaderno-fotos-multiples`
  (`7ce04d8` en el momento de arrancar la auditoría).
- **Fecha:** 25 sep 2026.
- **Herramienta:** Playwright (instalado ad-hoc con `npm i -D playwright
  --no-save`, sin tocar `package.json`) contra `npm run dev` (Vite,
  `localhost:5174`). 9 agentes en paralelo (uno por sección), cada uno con su
  propia sesión de navegador contra el servidor compartido, geolocalización
  simulada en Zarautz, y bypass de login vía "Continuar sin cuenta" (no hace
  falta Firebase real).
- **129 capturas reales** en `screenshots/<sección>/`, cubriendo no solo el
  estado inicial sino modales abiertos, formularios, errores de validación,
  estados vacíos y flujos completos (crear/unirse a liga, subir fotos, editar
  perfil, etc.).
- Cada sección corrió `perception-first-design:all` sobre sus propias
  capturas para obtener un veredicto de diseño (score compuesto 0-100) además
  de la caza de bugs funcionales/visuales.
- Alcance: solo la app moderna `src/` (Vite). La legacy `www/` queda fuera
  (decisión tomada con el usuario al planificar).

## Índice de secciones

| # | Sección | Severidad máxima | Score PFD | Informe |
|---|---|---|---|---|
| 1 | Login / onboarding | 🔴 CRITICAL | 67/100 | [01-login.md](01-login.md) |
| 2 | Ahora (dashboard) | 🔴 CRITICAL | ~44/100* | [02-ahora.md](02-ahora.md) |
| 3 | Previsión | 🟡 MEDIUM | 63.6/100 | [03-prevision.md](03-prevision.md) |
| 4 | Mapa | 🟠 HIGH | — | [04-mapa.md](04-mapa.md) |
| 5 | Especies | 🔴 CRITICAL | — | [05-especies.md](05-especies.md) |
| 6 | Cuaderno | 🟡 MEDIUM | 65/100 | [06-cuaderno.md](06-cuaderno.md) |
| 7 | Trofeos | 🟡 MEDIUM | 66/100 | [07-trofeos.md](07-trofeos.md) |
| 8 | Perfil | 🟠 HIGH | 69/100 | [08-perfil.md](08-perfil.md) |
| 9 | Navegación global y modales | 🟠 HIGH | — | [09-navegacion-global.md](09-navegacion-global.md) |

\* El score de Ahora está penalizado mecánicamente por dos violaciones
CRITICAL en capas bajas (L1/L3) del framework PFD; la calidad de diseño
subyacente por capa es 62-70/100 — el contenido (desglose de factores,
solunar, mareas) es real y específico del dominio, no genérico.

## Hallazgos transversales (afectan a varias secciones)

Estos son los que más valor tienen para priorizar: cada uno aparece
corroborado de forma independiente por 2+ agentes que no se comunicaron entre
sí, lo cual es una señal fuerte de que es un problema sistémico, no un
detalle aislado de una pantalla.

### 1. 🔴 El tab-bar inferior se desincroniza del contenido real (cross-cutting)
Encontrado de forma independiente en **3 secciones**:
- **Ahora** (`src/ui/views/vista-ahora.js:646-650`): el enlace "Ver todas →"
  dispara `pp-cambiar-vista` directamente en vez de pasar por el setter
  oficial del shell — cambia el contenido a Especies pero deja "Ahora"
  resaltado en el tab-bar, y tocar "Ahora" después no hace nada (early-return
  porque `id === this._vistaActiva` según el estado interno del shell).
- **Perfil** (accesible solo desde el menú lateral, `src/ui/shell/app-shell.js:404-419`):
  el tab-bar resalta visualmente "Previsión" mientras el usuario está en
  Perfil, aunque el estado interno (`vistaActiva`, atributos `selected` de
  cada `ion-tab-button`) es correcto. Solo se autocorrige al tocar una
  pestaña real.
- **Navegación global**: confirma que el tab-bar **sí** funciona bien cuando
  se usa tal cual (los 6 taps directos a pestañas son consistentes) — el bug
  aparece específicamente en cualquier navegación que rodee el flujo oficial
  de clic-en-pestaña (enlaces internos, menú lateral).

**Causa raíz probable, un solo punto de arreglo:** unificar toda navegación
programática para que pase por el setter `vistaActiva` de
`src/ui/shell/app-shell.js` en vez de despachar `pp-cambiar-vista` o navegar
por fuera del shell.

### 2. 🔴 El campo "foto" de especie no es una foto real en casi ningún caso
Encontrado de forma independiente en **2 secciones**:
- **Especies**: 11 de 12 especies (todas excepto Sargo) tienen como `foto` el
  mismo asset de silueta que ya usan como `imagen` (SVG), exportado como PNG
  en escala de grises/negro — casi invisible contra el fondo oscuro del
  modal de ficha (`#121212`).
- **Ahora**: el detalle de Salmonete muestra el mismo patrón —
  `img/salmonete.png` es una silueta negra sólida, no una foto
  fotorrealista como documenta la convención de `CLAUDE.md` (`foto` = PNG
  fotorrealista, `imagen` = SVG silueta).

Esto contradice la decisión de producto documentada en `CLAUDE.md`
("Assets visuales de especies") y probablemente afecta a todo el catálogo de
`src/domain/especies.js`, no solo a las 2 especies vistas en captura —
conviene auditar el campo `foto` de las 12 especies antes de tocar código.

### 3. 🟠 Tres sistemas de iconos en paralelo (ninguno unificado)
- `src/domain/iconos.js` — el sistema "oficial" (nombres en español), usado
  por `app.js`, `app-shell.js`, `modal.js`, `vista-mapa.js`, `vista-ahora.js`.
- `src/ui/util/icons.js` — una segunda librería SVG redundante (nombres en
  inglés/mixtos), usada solo por `vista-login.js` y `vista-prevision.js`.
- `ion-icon` (Ionicons, dependencia real) — usado por `vista-cuaderno.js`,
  `pp-captura-card.js`, `modal.js`.
- Además, **Mapa** usa emoji en crudo (📍⭐⬆) para sus marcadores de Leaflet,
  un cuarto enfoque ad-hoc.

Consolidar en un único sistema (probablemente `domain/iconos.js`, el más
usado) es la mejora de mayor apalancamiento contra la sensación de "ai slop"
por inconsistencia visual.

### 4. 🟠 Dos sistemas de modal incompatibles, usados justo donde más se notan
`src/ui/util/modal.js` define `abrirModal()` (bottom-sheet `ion-modal` real,
con gesto de arrastre, usado en 9+ sitios de la app) y `abrirModalCentrado()`
(overlay a mano, sin gesto, sin animación). Los **2 botones más usados del
header** (cambiar spot, favorito — `app.js:235-426`) usan justo el patrón
pobre. Recomendación del propio análisis PFD: migrar esos 2 sitios a
`abrirModal()` y retirar `abrirModalCentrado()`.

### 5. 🔴 Pantalla en negro sin feedback en la carga inicial
`src/app.js:80-97` no llama a `renderVistaActiva()` hasta que los datos
resuelven, así que el spinner de `elCargando()` en `vista-ahora.js:44-47` es
código muerto en la práctica: la primera carga (o cualquier refetch tras
caché caducada) deja la pantalla completamente negra varios segundos sin
ningún indicador. **Este bug es real y se confirmó por accidente durante la
propia preparación de esta auditoría** (con una espera corta de 500ms la
captura salió en negro).

### Otros hallazgos puntuales de alto interés
- **Login**: la CSP (`index.html:18`, `script-src 'self'`) bloquea
  `apis.google.com/js/api.js` — el login con Google **nunca funcionará en
  web/PWA**, ni siquiera con Firebase bien configurado. Es una bomba de
  relojería: nadie lo notará hasta que se active Firebase de verdad.
- **Especies**: mojibake de codificación en `src/domain/especies.js`
  (`estÃ¡`, `CantÃ¡brico`) — visible en el aviso de veda del Pulpo. Arreglo
  trivial (re-guardar el archivo en UTF-8 correcto) pero visible y de
  contenido regulatorio.
- **Mapa**: clases CSS de marcadores custom (`.pp-pin`, `.pp-viento`, etc.,
  `pp-mapa.js:82-85`) no tienen ninguna regla CSS definida en ningún sitio —
  caen al estilo por defecto de Leaflet (caja blanca/gris), y el marcador de
  viento se pinta exactamente en las mismas coordenadas que el del spot.
- **Trofeos**: el modal de detalle de logro pinta el icono siempre a color
  completo, rompiendo la propia gramática visual de la grid (gris = bloqueado)
  a un toque de distancia.
- **Cuaderno**: editar la fecha de una captura fuera de la ventana de
  pronóstico cargada guarda en silencio un snapshot sin `faseMarea`, sin
  ningún aviso — pero "Tus patrones" sigue mostrando estadísticas con total
  normalidad.

## Orden recomendado de implementación progresiva

1. **Quick wins de máximo impacto** (poco código, arreglan hallazgos
   transversales): fix del loading state en `app.js`/`vista-ahora.js` (#5),
   fix de sincronización del tab-bar (#1), mojibake en `especies.js`.
2. **Contenido/assets**: auditar y corregir el campo `foto` de las 12
   especies (#2) — probablemente requiere regenerar assets, no solo código.
3. **Consolidación de sistemas**: unificar iconos (#3) y modales (#4) — cambios
   de mayor alcance pero que eliminan la mayor fuente de inconsistencia
   "ai slop" detectada.
4. **Seguridad/config**: revisar la CSP para permitir Google Sign-In antes de
   activar Firebase en producción.
5. **Pulido por sección**: el resto de hallazgos MEDIUM/LOW de cada informe
   individual (estado de logro en modal, i18n del "Cancel" en Cuaderno,
   validación de preview en Perfil, jerarquía tipográfica en Login, etc.).

## Verificación

- `git status` tras la auditoría: solo `docs/` como nuevo (sin cambios bajo
  `src/` ni `www/`) — confirmado.
- 9/9 informes de sección escritos, 129 capturas guardadas, 0 scripts
  temporales de auditoría dejados en el repo.
- Ningún commit realizado — pendiente de revisión y decisión del usuario
  sobre qué mejoras priorizar e implementar.
