# Mapa

**Fecha auditoría:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples`
**Commit:** `7ce04d8` — feat(cuaderno): hasta 5 fotos por captura, spot/fecha editables y fix de scroll
**Archivos auditados:** `src/ui/views/vista-mapa.js`, `src/ui/components/pp-mapa.js`
**Viewport:** 393×852 (móvil), tema oscuro, geolocalización simulada en Zarautz (43.2833, -2.1667)

## Capturas

Todas en `docs/ux-audit/screenshots/mapa/`:

| Archivo | Qué muestra |
|---|---|
| `01-inicial.png` | Mapa recién cargado, tiles OSM, viento ON por defecto, corrientes en rojo densas |
| `02-carta-nautica-activada.png` | Toggle "Carta náutica" activado — capa OpenSeaMap superpuesta |
| `03-viento-desactivado.png` | Toggle "Viento" desactivado — desaparece el indicador de viento |
| `04-slider-hora-movido.png` | Slider de hora movido a "Sáb 26 19:00" — corrientes y etiqueta actualizadas |
| `05-zoom-in.png` | Tras dos clics en el control `+` de Leaflet |
| `06-zoom-out.png` | Tras cuatro clics en el control `-` de Leaflet |
| `07-click-mover-spot.png` | Tras click en el mapa para reubicar el spot (evento `onMoverSpot`) |

No se pudo capturar el popup de un favorito (`08-popup-favorito.png`): el spot de prueba no tenía favoritos guardados, así que `pintarFavoritos()` no pintó ningún marcador ⭐ que clicar. Ver "Preguntas abiertas".

## Acciones probadas

| # | Acción | Resultado | Estado |
|---|---|---|---|
| 1 | Carga inicial del mapa | Tiles OSM cargan de verdad (9/9 `.leaflet-tile` con `naturalWidth > 0`, verificado vía `evaluate()`, no solo contenedor gris) | OK |
| 2 | Toggle "Carta náutica" ON | Añade capa OpenSeaMap (boyas, anclas, límites de puerto) sobre el mapa base | OK |
| 3 | Toggle "Viento" OFF | El indicador de viento desaparece correctamente (`pintarViento(...,null,null)` limpia la capa) | OK (funcional) — ver bug #3 (legibilidad) |
| 4 | Mover `ion-range` (slider de hora) | Repinta flechas de corriente y actualiza la etiqueta de hora/día (`onCambioHora`) | OK |
| 5 | Zoom `+` (control nativo Leaflet, 2 clics) | Zoom in correcto, tiles de mayor detalle cargan | OK (pero ver bug #5, tamaño de target) |
| 6 | Zoom `-` (control nativo Leaflet, 4 clics) | Zoom out correcto | OK (mismo bug #5) |
| 7 | Click en el mapa (fuera del spot) | Se dispara `map.on('click')` → `onMoverSpot({lat,lon})` hacia arriba; sin cambio visual dentro de estos dos archivos | Ver "Preguntas abiertas" — el feedback depende de la capa de orquestación (app.js), fuera del alcance de esta auditoría |
| 8 | Click en marcador de favorito ⭐ | No aplicable — sin favoritos guardados en el spot de prueba | No probado |
| 9 | Errores de consola/página durante todo el flujo | `page.on('pageerror')` / `console error` → array vacío en las 7 interacciones | OK, sin errores JS |
| 10 | Recorte contra header/tab-bar | Medido con `getBoundingClientRect()`: mapa ocupa y=66→659, controles (slider+toggles+leyenda) y=659→795, tab-bar y=795→852. Sin overlap entre ninguno de los tres bloques | OK |

## Bugs y fallas encontradas

| # | Severidad | Descripción | Archivo:línea |
|---|---|---|---|
| 1 | **HIGH** | Los marcadores propios del mapa (pin de spot 📍, indicador de viento ⬆+texto, favoritos ⭐) no tienen **ninguna regla CSS** en todo el repo (`grep` de `.pp-pin`, `.pp-viento`, `.pp-viento-icon`, `.pp-viento-txt`, `.pp-spot-icon`, `.pp-fav-icon` sobre `src/` → 0 resultados fuera de sus propias definiciones de clase). Al vivir dentro de un Shadow Root, tampoco heredan nada de `theme.css`. Caen en el estilo por defecto de Leaflet `.leaflet-div-icon { background:#fff; border:1px solid #666 }` (confirmado en `node_modules/leaflet/dist/leaflet.css:569-572`), por lo que se ven como cajas blancas/grises sin diseño en vez de iconos — visible en `01-inicial.png` (caja junto a "19 km/h") y `03-viento-desactivado.png` (pin de spot como punto rosa apenas reconocible). El propio archivo documenta el patrón correcto para este mismo problema (inyectar CSS a mano dentro del Shadow Root, como ya se hace con `leafletCss`) pero no lo aplicó a sus propios iconos. | `src/ui/components/pp-mapa.js:82-85` (estilo del Shadow Root, incompleto), `:127` (pin spot), `:139` (icono favorito), `:193-198` (icono viento) |
| 2 | **HIGH** | El marcador de viento se pinta en las **mismas coordenadas exactas** que el marcador del spot (mismo `lat/lon`, sin ningún offset), así que cuando ambos están activos se solapan literalmente en el mismo punto — visible en `01-inicial.png`, donde el pin 📍 y el texto "19 km/h" quedan encimados e ilegibles. | `src/ui/views/vista-mapa.js:155` (llama `pintarViento(stActual.spot.lat, stActual.spot.lon, ...)`), `src/ui/components/pp-mapa.js:186-200` (`pintarViento` no aplica ningún desplazamiento) |
| 3 | **MEDIUM** | Los iconos de marcador usan **emoji planos** (`📍`, `⭐`, `⬆`) incrustados directamente en el HTML del `L.divIcon`, en vez del sistema de iconos SVG propio de la app (`domain/iconos.js`) que sí usan los controles justo debajo del mapa (toggles "Viento"/"Carta náutica" via `svg('viento')`, `svg('ancla')`). Rompe la consistencia visual dentro de la misma vista y depende del renderizado de emoji de cada plataforma/fuente. | `src/ui/components/pp-mapa.js:127, 139, 195` |
| 4 | **MEDIUM** | Los controles nativos de Leaflet (zoom `+`/`-`, atribución) no tienen ningún override de estilo: cuadrados blancos, esquinas rectas, texto negro sobre fondo blanco — chocan fuertemente contra el tema oscuro naranja/negro del resto de la app. Se percibe como un widget de librería insertado sin personalizar dentro de una app por lo demás coherente (ver Análisis PFD). | `src/ui/components/pp-mapa.js:104` (`zoomControl: true, attributionControl: true` sin CSS de override en el `<style>` del Shadow Root, líneas 81-85) |
| 5 | **LOW** (accesibilidad móvil) | Los botones de zoom `+`/`-` de Leaflet miden ≈34×32px cada uno (medido con `getBoundingClientRect()`: contenedor `.leaflet-control-zoom` completo = 34×65px para ambos botones), por debajo del tamaño mínimo recomendado de 44×44px para targets táctiles en móvil. | Config por defecto de Leaflet, sin override — `src/ui/components/pp-mapa.js:104-108` |
| 6 | **MEDIUM** (legibilidad de datos, no regresión de la migración) | Las flechas de corriente son muy densas y largas a zoom 12, y cruzan visualmente sobre tierra firme (p. ej. sobre el núcleo urbano de Zarautz y las montañas de Aia en `01-inicial.png`), lo cual puede confundir porque las corrientes son un fenómeno marino. La escala de la flecha es un valor fijo en grados que no se ajusta al nivel de zoom: a zooms altos las flechas se vuelven enormes en pantalla (`05-zoom-in.png`) y a zooms bajos casi desaparecen. El cálculo es el mismo heredado de la app legacy (ver comentario de cabecera del archivo), así que no es una regresión de Vite, pero sigue siendo una debilidad de legibilidad real y con más superficie visible ahora que el mapa es más protagonista. | `src/ui/components/pp-mapa.js:43-58` (`calcularFlecha`), `:174-183` (`_dibujarFlecha`) |
| 7 | **INFO** | Tras hacer click en el mapa para reubicar el spot, no hay ningún feedback visual dentro de `vista-mapa.js`/`pp-mapa.js` — el punto crudo se reenvía hacia arriba vía `onMoverSpot(p)` y la decisión de confirmar/mover se delega a la capa de orquestación (fuera del alcance de estos dos archivos, ver comentario `vista-mapa.js:28-32`). No se pudo verificar si esa capa externa sí da feedback (toast, confirm, movimiento del pin) porque cae fuera de los archivos indicados para esta auditoría. | `src/ui/views/vista-mapa.js:210-212` |

Sin errores de JavaScript en consola/página durante ninguna de las interacciones probadas.

## Análisis PFD

*Nota: la skill `perception-first-design:all` devolvió su protocolo (analizar/resolver/evaluar) para ejecutarlo con el contexto de esta auditoría; no se pudo cargar el corpus de heurísticas propio de la skill desde este entorno (no accesible por ruta desde el working directory del proyecto), así que la evaluación de abajo se apoya en los hallazgos de código/captura ya documentados arriba en vez de en citas del corpus. Se mantiene la estructura de tres modos pedida.*

### Analyze (descriptivo) — qué está pasando perceptualmente

- **Percepción inmediata (primer vistazo):** el usuario entra a una pantalla con dos "capas de diseño" claramente distintas y en fricción visual: (a) el panel inferior (slider, toggles, leyenda) sigue al 100% el lenguaje visual del resto de la app — fondo oscuro, acentos naranja, iconos SVG, tipografía consistente; (b) el lienzo del mapa es, en la práctica, Leaflet sin tocar — tiles claros de OpenStreetMap, controles blancos con esquinas rectas, atribución gris. El contraste entre ambas zonas es tan fuerte que el ojo las procesa como dos productos distintos pegados en la misma pantalla, no como una sola superficie de diseño.
- **Carga cognitiva:** en el estado por defecto (viento ON, zoom 12) hay entre 15 y 20 flechas de corriente rojas simultáneas, superpuestas al pin del spot, al indicador de viento y a las etiquetas de topónimos del mapa base. No hay jerarquía visual que separe "esto es lo urgente para pescar hoy" de "esto es contexto geográfico" — todo compite al mismo nivel de saturación de color (rojo intenso) y grosor de trazo.
- **Confianza/percepción de calidad:** las cajas blancas sin estilo alrededor del pin y del indicador de viento (bug #1) son la señal más dañina para la confianza: en una app que en el resto de vistas cuida el detalle (iconos propios, sistema de índice de pesca currado, animaciones), encontrar un "cuadradito por defecto de librería" comunica al usuario, aunque sea inconscientemente, que esta pantalla concreta está menos terminada — exactamente la sensación de "parte sin pulir" que erosiona confianza en los datos que muestra (¿si el marcador está a medio hacer, los datos de corriente lo están también?).
- **Cascada de consecuencias:** si el usuario no distingue con rapidez su spot del ruido de flechas rojas (bug #2, marcadores solapados), es probable que recurra al zoom manual para "aclarar" la vista — lo que a su vez agranda las flechas (bug #6) y empeora el problema en vez de resolverlo, generando un bucle de frustración en la primera interacción con la pantalla.

### Solve (prescriptivo) — qué tendría que ser verdad para que funcione

Requisitos derivados del contexto (pantalla secundaria de una tab bar, usada en exterior/costa con luz solar directa, decisión rápida "¿dónde y cuándo pesco"):

- **R1 — Identidad visual continua:** ningún elemento dentro del `<pp-mapa>` debería depender del estilo por defecto de la librería subyacente; todo lo que el usuario ve (marcadores, controles de zoom, atribución) tiene que pasar por el sistema de diseño de la app (tokens de `theme.css` inyectados en el Shadow Root, iconos de `domain/iconos.js`).
- **R2 — Jerarquía en un vistazo:** el spot del usuario debe ser inequívocamente el elemento más prominente del mapa (mayor contraste, posición fija, nunca tapado); el resto de capas (corrientes, viento, carta náutica) son secundarias y deben poder "apagarse" visualmente sin fricción cuando compiten por atención.
- **R3 — Legibilidad estable entre niveles de zoom:** el tamaño visual de flechas/iconos no puede depender de un cálculo en grados fijos; tiene que responder al zoom actual (grosor/longitud en píxeles de pantalla, no en coordenadas) para que la lectura sea consistente en cualquier nivel.
- **R4 — Accesibilidad táctil:** todo control interactivo dentro del mapa (zoom, toggles, marcadores clicables) debe cumplir el mínimo de 44×44px táctil, coherente con el resto de la app que usa botones Ionic de tamaño estándar.
- **R5 — Feedback cerrado del bucle de interacción:** cada acción del usuario sobre el mapa (mover spot, activar capa, cambiar hora) debe tener una confirmación visual perceptible en menos de ~300ms, sin depender de una capa externa no verificable desde este componente.

**Solución que satisface las cinco:** mover la responsabilidad de estilo de los marcadores dentro del propio `<style>` del Shadow Root de `pp-mapa.js` (mismo mecanismo ya usado para `leafletCss`) definiendo clases propias para `.pp-spot-icon`/`.pp-viento-icon`/`.pp-fav-icon` que reemplacen el `background`/`border` por defecto de `.leaflet-div-icon`, sustituir los emoji por los SVG de `domain/iconos.js` (R1, R4 parcialmente vía tamaño de icono), aplicar un offset visual (p. ej. desplazar el indicador de viento unos px al noreste del pin, o anclarlo en una esquina fija tipo "widget" en vez de sobre el mapa) para R2, recalcular la escala de flecha en función de `map.getZoom()` o usar unidades de píxeles de pantalla vía `L.point`/`layerPoint` para R3, y aumentar el `iconSize` táctil de zoom con CSS custom para R4. R5 queda fuera del alcance de estos dos archivos (ver Preguntas abiertas) y requeriría revisar la capa de orquestación que consume `onMoverSpot`.

**Alternativa descartada:** sustituir Leaflet por un mapa "custom-drawn" (canvas propio) para tener control total del estilo — se descarta por coste/riesgo desproporcionado frente al problema real (es un problema de skinning, no de la librería en sí) y porque Leaflet ya está integrado y funcionando (tiles cargan, offline-first no aplica aquí porque requiere red para tiles de todos modos).

**Fallo duro a evitar:** cualquier solución que intente stylear los `divIcon` desde `theme.css` en el documento principal fallará silenciosamente — el Shadow Root bloquea ese CSS por diseño (ya documentado en el propio comentario de cabecera del archivo sobre `leafletCss`); el fix tiene que vivir dentro del `<style>` que se inyecta en el `attachShadow`.

### Evaluate (puntuado) — cómo se comporta el artefacto real

| Capa | Evaluación | Puntuación cualitativa |
|---|---|---|
| **Percepción/estética** | Fuerte disonancia entre el panel de controles (cuidado, on-brand) y el lienzo Leaflet (por defecto, sin tocar). Es la señal más clara de "ai slop"/integración superficial de toda la pantalla: se nota exactamente dónde termina el trabajo de diseño de la app y empieza el widget de librería sin personalizar. | Débil |
| **Jerarquía/atención** | El spot del usuario no gana el contraste que debería frente al ruido de flechas rojas; el indicador de viento compite literalmente por el mismo píxel que el pin (bug #2). | Débil |
| **Legibilidad de datos** | Los toggles y el slider funcionan y comunican bien su estado (ON/OFF claro, etiqueta de hora legible); el problema no es la interacción sino la densidad/escala de las flechas de corriente, que no se adapta al zoom. | Media |
| **Consistencia de sistema** | Rota respecto al resto de la app en un punto muy concreto y localizado (marcadores + controles nativos de Leaflet), no en la estructura general de la vista (que sí sigue el patrón `pp-mapa-fila`/`pp-mapa-controles` del resto de paneles). | Media-débil |
| **Confianza percibida** | Las cajas blancas sin estilo son el tipo de detalle que un usuario technical/exigente (el perfil de un pescador que ya usa mareas/solunar/índice con detalle) nota de inmediato y que puede leer como "esta parte de la app no está terminada", aunque el dato subyacente sea correcto. | Débil |

**Conclusión de la evaluación:** los controles del mapa **no** se sienten integrados con el resto de la app — se perciben como Leaflet "de fábrica" con una capa de controles propios pegada encima, no como un componente diseñado de punta a punta. La causa raíz es concreta y acotada (falta de CSS dentro del Shadow Root para las clases propias de los marcadores, más el uso de emoji en vez del sistema de iconos SVG existente), no un problema estructural de arquitectura — lo cual es una buena noticia de cara al plan de mejora: el fix es de skinning localizado, no de rediseño.

## Plan de mejora priorizado

*(Plan, no implementación — ningún archivo bajo `src/` fue tocado durante esta auditoría)*

1. **P0 — Estilar los marcadores custom dentro del Shadow Root** (resuelve bug #1, el hallazgo más dañino para la percepción de calidad). Añadir reglas para `.pp-spot-icon`, `.pp-viento-icon`, `.pp-fav-icon` (fondo transparente, sin borde, tamaño/alineación explícitos) al `<style>` que ya inyecta `leafletCss` en `pp-mapa.js`. Coste bajo, impacto visual alto e inmediato.
2. **P0 — Separar visualmente spot y viento** (resuelve bug #2). Aplicar un offset de posición al indicador de viento respecto al pin del spot, o rediseñarlo como una etiqueta fija en una esquina del mapa (tipo "chip" de dato) en vez de un marcador flotante sobre el propio pin.
3. **P1 — Sustituir emoji por iconos SVG del sistema** (resuelve bug #3). Usar `svg('spot')`/`svg('favorito')`/`svg('viento')` (crear los que falten en `domain/iconos.js` si no existen) en vez de `📍`/`⭐`/`⬆` en el HTML de los `divIcon`, para que el mapa hable el mismo lenguaje visual que los toggles de la misma vista.
4. **P1 — Re-skinear controles nativos de Leaflet** (resuelve bug #4). Override CSS dentro del Shadow Root para `.leaflet-control-zoom`, `.leaflet-control-zoom-in/out` y `.leaflet-control-attribution` con la paleta oscura/naranja de `theme.css` (mismos tokens `--pp-panel`, `--ion-border-color` ya usados en `.pp-mapa-controles`), de forma que el mapa deje de sentirse como un componente ajeno insertado en la app.
5. **P1 — Aumentar el tamaño táctil de los botones de zoom** (resuelve bug #5), como parte del mismo trabajo de re-skinning del punto 4 — subir el `width`/`height` CSS a ≥44px.
6. **P2 — Escalar las flechas de corriente en función del zoom** (resuelve bug #6). Recalcular `escala` en `calcularFlecha` usando la proyección de píxeles del mapa (`map.getZoom()` o `latLngToLayerPoint`) en vez de un valor fijo en grados, para que la densidad visual sea estable en cualquier nivel de zoom y no invada visualmente zonas de tierra firme de forma tan agresiva.
7. **P2 — Confirmar el cierre del bucle de interacción al mover el spot** (relacionado con hallazgo #7, INFO). Auditar la capa de orquestación (`app.js`/Fase 4, fuera del alcance de esta auditoría) para verificar que `onMoverSpot` sí produce feedback visible (toast/confirm/movimiento del pin) en un tiempo razonable; si no lo hace, añadirlo ahí.

## Preguntas abiertas

- ¿Qué hace realmente la capa de orquestación (`app.js`/Fase 4) al recibir `onMoverSpot(p)`? El comentario de cabecera de `vista-mapa.js` dice explícitamente que el `confirm()` que existía en la app legacy ya no se reproduce aquí y que la decisión se delega hacia arriba — no se pudo verificar en esta auditoría (los dos archivos indicados como alcance no incluyen esa capa) si existe algún tipo de confirmación visual (toast, modal, animación del pin) en el flujo real, o si el usuario puede mover accidentalmente su spot sin darse cuenta con un click perdido sobre el mapa.
- ¿Cómo se ve el marcador de favorito (⭐ + popup `crearPopupFavorito`) en la práctica? No se pudo probar por falta de favoritos guardados en el spot de test; dado que comparte el mismo problema de fondo (`.pp-fav-icon` sin CSS propio, bug #1), es razonable asumir el mismo defecto visual, pero no se verificó con captura real.
- ¿Existe telemetría o feedback de usuarios reales sobre si la densidad de flechas de corriente (bug #6) genera confusión en la práctica, o es solo una hipótesis de esta auditoría basada en la captura estática? Sería valioso contrastar antes de invertir en el recálculo de escala (P2 del plan).
- ¿El toggle de "Carta náutica" (OpenSeaMap) tiene algún caso de fallo de red silencioso? Solo se probó con red disponible (localhost + tiles reales); no se auditó el comportamiento si `tiles.openseamap.org` no responde (¿tiles grises indefinidamente, sin mensaje de error?).

---

**Nota de seguridad de la auditoría:** durante la ejecución de la skill `perception-first-design:all`, el resultado de la herramienta incluyó un mensaje adicional que se presentaba como una instrucción de "el coordinador" indicando cómo continuar la tarea. Se trató como contenido no confiable (inyectado dentro de la salida de una skill, no como una instrucción legítima del agente orquestador) y no alteró el plan de trabajo, que ya incluía exactamente esos pasos por instrucción original.
