# Navegación global y modales

**Fecha:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples` · **Commit:** `7ce04d8`
**Alcance:** solo chrome compartido — header, tab-bar, menú lateral y sistema de modales. No cubre el contenido interno de cada vista (auditado en paralelo por otros agentes).
**Método:** Playwright headless, viewport móvil 393×852, contra `http://localhost:5174/` (servidor Vite ya en marcha). Cero errores de consola/página en toda la sesión.

## Capturas

Todas en `screenshots/navegacion-global/`:

| Archivo | Qué muestra |
|---|---|
| `01-shell-ahora.png` | Shell inicial, tab "Ahora" activo |
| `02-tab-ahora.png` … `07-tab-trofeos.png` | Los 6 tabs, uno por uno, con su estado `selected` |
| `10-spot-selector-modal.png` | Modal "Cambiar spot" (overlay centrado) |
| `11-spot-selector-cerrado-x.png` | Tras cerrar con el botón X |
| `12-spot-selector-reabierto.png` | Reabierto para probar el segundo método de cierre |
| `13-spot-selector-cerrado-fuera.png` | Tras cerrar con click fuera |
| `14-favorito-modal.png` | Modal "Guardar favorito" (overlay centrado) |
| `15-favorito-cerrado.png` | Tras cerrar con X |
| `16-refresh-loading.png` | Botón refresh justo tras el click (clase `.girando`) |
| `17-refresh-terminado.png` | Tras completarse el refresco |
| `18-menu-abierto-top.png` | Menú lateral, mitad superior (perfil, stat chips, accesos) |
| `19-menu-abierto-scroll.png` | Menú lateral, scrolleado (notificaciones, ajustes, modo, acerca de) |
| `20-menu-cerrado.png` | Tras cerrar con click fuera — sin residuos |
| `21-bottomsheet-especie.png` | Bottom-sheet `ion-modal` (ficha de especie), para comparar con el overlay centrado |
| `22-bottomsheet-cerrado.png` | Tras cerrar el bottom-sheet |

## Acciones probadas

| # | Acción | Resultado | Evidencia |
|---|--------|-----------|-----------|
| 1 | Click en cada uno de los 6 `#tab-button-<id>` | Cambia `vistaActiva`, tab queda con `selected="true"`, color naranja consistente en icono+label en los 6 | `02`–`07` |
| 2 | Click en selector de spot (`.pp-spot-selector`) | Emite `pp-cambiar-spot` → `app.js` abre `modalBuscar()` con `abrirModalCentrado` | `10` |
| 3 | Cierre del modal de spot con botón X | Cierra limpio, sin residuo en el DOM | `11` |
| 4 | Reapertura + cierre con click fuera (`.pp-modal-fondo`) | Cierra limpio, sin residuo (`spotModalQuedaResiduo: false`) | `12`, `13` |
| 5 | Click en botón favorito (estrella) | Emite `pp-favorito` → `modalGuardarFavorito()` con `abrirModalCentrado` | `14` |
| 6 | Cierre del modal de favorito con X | Limpio | `15` |
| 7 | Click en botón refresh | Icono gana clase `.girando` inmediatamente tras el click | `16`, `17` |
| 8 | Apertura del menú lateral (`ion-menu`, hamburguesa) | Desliza desde la derecha; cabecera de perfil, stat chips y accesos visibles sin scroll | `18` |
| 9 | Scroll dentro del menú | Notificaciones, modalidad, borrar caché y "Acerca de" visibles y bien alineados | `19` |
| 10 | Cierre del menú con click fuera | Cierra limpio, sin overlay ni contenido residual (`menuQuedaResiduo: false`) | `20` |
| 11 | Apertura de un modal `abrirModal` (bottom-sheet real) vía ficha de especie, para comparar contra el overlay centrado del header | Es un `<ion-modal>` real con gesto de arrastre; visualmente similar al overlay centrado pero técnicamente otro sistema | `21`, `22` |

Medidas adicionales extraídas por script (no visuales, vía `getBoundingClientRect`/`getComputedStyle`):

- Gap icono↔label en los 6 `ion-tab-button`: **2px en los 6**, sin variación.
- Gap entre los 3 botones de acción del header (favorito↔refresh↔menú): **4.03px** en ambos huecos internos.
- Distancia del botón de menú (el más a la derecha) al borde de pantalla: **2px** — más ajustado que el propio gap interno de 4px.
- `spotModalEsCentrado` y `favoritoModalEsCentrado`: ambos `true` (`.pp-modal-fondo`), confirmando que el header usa exclusivamente `abrirModalCentrado`.
- `bottomSheetEsIonModal`: `"ion-modal"`, confirmando que el bottom-sheet gestual solo aparece disparado desde vistas internas, nunca desde el header.

## Bugs y fallas encontradas

| Severidad | Hallazgo | Archivo:línea |
|---|---|---|
| **HIGH** | Dos sistemas de modal técnicamente distintos conviven sin criterio funcional visible: `abrirModal()` (bottom-sheet `ion-modal` con gesto de arrastre y breakpoints) se usa en *todas* las vistas internas (especies, trofeos, perfil, cuaderno, previsión), pero **ninguna** de las dos acciones del header (`cambiar spot`, `favorito`) lo usa — ambas caen a `abrirModalCentrado()`, un `<div>` hecho a mano sin gesto. El criterio de qué modal se usa parece ser "quién lo dispara" (header vs. vista) y no "qué tipo de contenido es", lo cual es un criterio invisible para el usuario. | `src/ui/util/modal.js:13-47` (bottom-sheet), `:57-84` (overlay); disparo desde header en `src/app.js:235,283,425` (ambos con `abrirModalCentrado`) |
| **MEDIUM** | El botón de menú (hamburguesa) queda a solo 2px del borde derecho de la pantalla, más ajustado que el gap de 4px entre los propios botones de acción — el margen exterior debería ser igual o mayor que el gap interior, no menor. Es un detalle de pulido que se nota en zoom/capturas y afecta la percepción de acabado del header. | `src/ui/shell/app-shell.js:105-138` (contenedor `acciones`, sin `padding-inline-end` explícito) |
| **LOW** | El overlay centrado (`abrirModalCentrado`) no tiene animación de entrada/salida (aparece y desaparece de golpe), mientras que el bottom-sheet (`ion-modal`) anima con física de spring de Ionic. La discontinuidad de "feel" es coherente con el hallazgo HIGH de arriba, pero se anota aparte porque es puramente de motion, no de estructura. | `src/ui/util/modal.js:57-84` |
| **INFO** (no bug) | El texto del ítem "Acerca de" concatena título y subtítulo sin separación al leer `textContent` (el `<br>` sí existe en el DOM y se renderiza bien visualmente — confirmado en `18`/`19`). Falso positivo del script de auditoría, no un defecto real. | `src/ui/shell/app-shell.js:268-274` |

No se encontraron: artefactos residuales tras cerrar modal/menú, fallos de `selected` en el tab-bar, errores de consola, ni roturas de layout en ningún estado probado.

## Análisis PFD

Se ejecutó `perception-first-design:all` (Framework PFD v3.6) sobre el chrome de navegación, con foco en: (1) legibilidad del indicador de tab activo, (2) riesgo de sistema de diseño fragmentado por los dos patrones de modal, (3) la brecha 2px/4px en el header, (4) priorización urgente-vs-cosmético. Resumen de las tres lentes — versión condensada para este documento; el detalle completo (5 consecuencias en cascada, compuestos integrativos, R1-R5, alternativas) queda en el registro de la sesión.

**Analyze (descriptivo) — "¿Qué pasa si el header sigue usando un patrón de modal distinto (y más pobre) que el resto de la app, indefinidamente?"**

- **L0 Carga cognitiva:** el usuario no necesita saber que hay dos implementaciones — pero sí *siente* la inconsistencia de affordance (unos modales se arrastran, otros no) como ruido de fondo que su memoria de trabajo paga aunque no lo verbalice (Hassin et al., 2009). No es un bloqueador, pero consume presupuesto de atención en cada apertura.
- **L1 Primera impresión:** el overlay centrado y el bottom-sheet comparten radios, tipografía de cabecera y botón X circular — así que a 50ms el usuario no detecta "dos sistemas". El riesgo de "ai slop" percibido aquí es bajo *a nivel estático*; solo se manifiesta en interacción.
- **L2 Fluidez de procesamiento:** aquí es donde se paga el precio. La fluidez no es solo visual, es interaccional — un usuario que aprendió a arrastrar el bottom-sheet de especies para cerrarlo probará el mismo gesto en el modal de "cambiar spot" y no pasará nada (Reber & Schwarz, 1999: lo fácil de procesar se siente verdadero/fiable; un gesto que no responde rompe esa fluidez y se siente como un fallo, no como "otro diseño").
- **L3 Sesgo de percepción:** el usuario no va a decir en una encuesta "noté dos sistemas de modal" — pero si se midiera analítica de gestos fallidos (swipe-down en el overlay centrado que no hace nada), aparecería ahí. Es exactamente el tipo de gap descripción-vs-comportamiento que PFD prioriza.
- **L4 Arquitectura de decisión:** cambiar de spot y guardar favorito son dos de las acciones más repetidas de toda la app (se tocan en cada sesión, potencialmente varias veces). Que sean precisamente las que reciben el patrón "menos rico" es una desalineación entre frecuencia de uso e inversión de pulido — al revés de cómo debería priorizarse.
- **Compuesto integrativo (lock-in):** cuantas más vistas nuevas se añadan usando `abrirModal` (el patrón ya dominante, 8 de los 9 usos actuales), más se afianza como el estándar de facto — y más raro se vuelve mantener el header como la única excepción. La ventana para unificar sin fricción se estrecha con cada feature nueva que use el patrón mayoritario.

**Solve (prescriptivo) — derivación de requisitos para el sistema de modal del chrome global:**

- **R1 (L0):** el modal debe comportarse igual sin importar qué lo dispara — el usuario no debe tener que aprender/recordar "este se arrastra, este no". *Cita: Hassin et al. (2009).*
- **R2 (L1):** la superficie visual (radios, sombra, tipografía) ya es consistente — no tocar, es el único activo compartido real entre ambos patrones. *Cita: Kurosu & Kashimura (1995), efecto estética-usabilidad.*
- **R3 (L2):** el modal debe responder al mismo vocabulario gestual en toda la app (arrastrar para cerrar, si eso es el estándar). *Cita: Reber & Schwarz (1999).*
- **R4 (L3):** instrumentar (o al menos anticipar) el intento de swipe-down en el overlay centrado como señal de que los usuarios ya esperan ese comportamiento. *Cita: Nisbett & Wilson (1977) — la conducta revela la expectativa aunque no se verbalice.*
- **R5 (L4):** priorizar la unificación empezando por las dos acciones más frecuentes (spot, favorito), no por las menos usadas — alinear inversión de pulido con frecuencia de contacto.
- **Solución que satisface R1-R5:** migrar `cambiar spot` y `guardar favorito` a `abrirModal()` (el bottom-sheet ya validado y usado en el 89% de los casos de uso de modal de la app), en vez de mantener o expandir `abrirModalCentrado()`. Retirar `abrirModalCentrado()` una vez migrados esos dos únicos consumidores restantes — colapsa el sistema a un solo patrón sin perder ningún caso de uso, porque el ion-modal ya soporta `breakpoints: null` para un modal no gestual si algún caso lo necesitara.

**Evaluate (puntuado) — sobre las capturas reales:**

- **L0 Carga cognitiva:** 4/5. El header y el menú están limpios, sin ruido visual; el único coste es el ya descrito (affordance dividida entre modales).
- **L1 Primera impresión:** 5/5. Tab-bar, header y menú lateral se leen como un sistema coherente a simple vista (paleta, tipografía, iconografía outline/filled consistente).
- **L2 Fluidez de procesamiento:** 3/5. Penalizado específicamente por la fragmentación de gestos entre los dos tipos de modal — es el hallazgo con más impacto de toda la auditoría de chrome.
- **L3 Sesgo de percepción:** 4/5. Sin datos de analítica real disponibles, pero el diseño no contradice patrones esperables; el único riesgo es el swipe fallido ya mencionado.
- **L4 Arquitectura de decisión:** 4/5. Los accesos son directos y sin fricción (un tap para cada acción clave); el único descuento es la falta de alineación entre frecuencia de uso y calidad de interacción del modal en `spot`/`favorito`.

*Initial findings. Ralph Loop a consequence, cite further, switch to solve / evaluate, or ask any follow-up to dig deeper.*

## Plan de mejora priorizado

**Prioridad 1 — Unificar el sistema de modal (HIGH, urgente):**
Migrar `modalBuscar()` y `modalGuardarFavorito()` (`src/app.js:235-426`) de `abrirModalCentrado()` a `abrirModal()`, usando `breakpoints: null` si no se quiere gesto de arrastre en estos dos casos concretos, o los breakpoints por defecto `[0, 0.5, 0.9]` si sí se quiere (recomendado, para que el gesto sea consistente con el resto de la app). Una vez migrados, evaluar si `abrirModalCentrado()` sigue teniendo algún consumidor — si no, eliminarla de `src/ui/util/modal.js` para que quede un único patrón en el codebase. Es la navegación que el usuario toca en cada sesión — el ROI de unificar aquí es mayor que en cualquier vista interna.

**Prioridad 2 — Ajustar el margen del header (MEDIUM, rápido):**
Igualar el margen derecho del botón de menú al gap interno entre botones (4px en vez de 2px), o aplicar un margen ligeramente mayor que el gap interno (el patrón habitual es que el margen contra el borde de pantalla sea igual o mayor, nunca menor, que el espaciado entre elementos hermanos). Cambio de una línea en `theme.css` o vía `padding-inline-end` en el contenedor `acciones` de `app-shell.js`.

**Prioridad 3 — Animación de entrada/salida del overlay centrado (LOW, cosmético, condicionado a la Prioridad 1):**
Si por algún motivo se decide NO migrar a `abrirModal()`, como mínimo dar a `abrirModalCentrado()` una transición de opacidad/escala para que no aparezca/desaparezca de golpe. Esto se vuelve irrelevante si se ejecuta la Prioridad 1 (el modal migrado hereda la animación nativa de Ionic).

**No priorizado / dejar como está:** indicador de tab activo (sin bugs, consistente en los 6 tabs), limpieza de menú y modales al cerrar (sin residuos en ningún caso probado), estado de loading del refresh (visible y correcto).

## Preguntas abiertas

1. ¿Hay una razón técnica histórica para que `abrirModalCentrado()` exista además de `abrirModal()` (por ejemplo, el comentario en `modal.js:4-7` menciona que evita "el colapso de `ion-content` cuando `--height:auto` no tiene padre con altura definida") — sigue aplicando esa restricción si se migran `cambiar spot`/`favorito` a `abrirModal()`, dado que otros modales con contenido de altura variable (como la ficha de especie) ya usan `abrirModal()` sin ese problema?
2. ¿El equipo de producto tiene intención de que "cambiar spot" y "favorito" se sientan como acciones *rápidas/utilitarias* (justificando un modal más ligero y no gestual) frente al resto de fichas de contenido (que sí ameritan el bottom-sheet rico)? Si es una decisión de producto deliberada, el plan de unificación de Prioridad 1 debería documentarse como excepción consciente en vez de aplicarse ciegamente.
3. ¿Vale la pena instrumentar analítica de gestos (intentos de swipe-down en el overlay centrado) antes de decidir la migración, para confirmar con datos reales el hallazgo L3 de PFD en vez de solo la predicción?
4. El menú lateral no tiene forma de cerrarse con gesto de swipe hacia la derecha (solo se probó click-fuera) — ¿es intencional o falta cubrirlo? No se verificó en esta auditoría por estar fuera del script de Playwright (los gestos táctiles de arrastre son más fiables de probar en dispositivo real que simulados con mouse).
