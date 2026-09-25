# Previsión

**Fecha:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples`
**Commit:** `7ce04d8` (feat(cuaderno): hasta 5 fotos por captura, spot/fecha editables y fix de scroll)
**Archivo auditado:** `src/ui/views/vista-prevision.js` (496 líneas), más sus dependencias directas (`src/ui/util/icons.js`, `src/domain/config.js`, `src/domain/indice.js`, `src/ui/util/modal.js`, `src/styles/theme.css`).
**Viewport:** 393×852 (móvil), Chromium vía Playwright, geolocalización fija en Zarautz.

> **Corrección al brief de partida.** El encargo asumía como "dato ya conocido" que esta vista usa emojis como iconografía. Tras leer el código y confirmar con capturas reales, **eso ya no es cierto**: el commit `92473d3` — *"fix(prevision): sustituye emojis por iconos SVG y mejora la legibilidad"* — migró toda la vista a un sistema de iconos SVG propio antes de esta sesión. No hay ni un solo emoji renderizado en `#vista` durante la previsión (verificado con regex Unicode sobre el DOM real, ver sección de bugs). El hallazgo real y más interesante — que sustituye al de los emojis — es que **existen tres sistemas de iconos distintos conviviendo en la app**, y esta vista usa el minoritario. Ver detalle abajo.

## Capturas

Todas en `docs/ux-audit/screenshots/prevision/`:

| Archivo | Contenido |
|---|---|
| `01-inicial.png` | Estado por defecto al entrar en la tab: Mejores ventanas, Próximos días, gráfico horario (Vie 25 → Sáb 26). |
| `02-dia-seleccionado.png` | Tras tocar el tile "SÁB 26": el tile queda marcado (`.activo`), el gráfico se filtra a esas 24h, aparece aviso "Mostrando sábado, 26 de septiembre" + botón "Ver próximos días". |
| `03-dia-deseleccionado.png` | Tras volver a tocar "SÁB 26": vuelve exactamente al estado de `01` (toggle simétrico, sin bugs). |
| `04-selector-calendario.png` | Modal `ion-datetime` abierto desde el tile "Ver todos". |
| `05-tras-cerrar-calendario.png` | Tras cerrar el modal con Escape: **bug de foco/scroll** — ver sección de bugs. |
| `06-modal-detalle-hora.png` | Modal de detalle al tocar una barra del gráfico: índice, factores ponderados, condiciones (chips), especies activas. |
| `07-modal-detalle-hora-scroll.png` | Mismo modal tras `scrollIntoView` (contenido no excede el viewport, no hay scroll real que mostrar). |
| `08-card-ventanas-zoom.png` | Zoom de la tarjeta "Mejores ventanas" — muestra el texto de motivo truncado. |
| `09-leyenda-zoom.png` | Zoom de la leyenda de colores del índice (Excelente/Bueno/Regular/Flojo/Malo + Aviso). |
| `10-grafico-scroll-final.png` | Gráfico scrolleado al final del rango de 96h (día Mar 29); muestra también el efecto colateral del bug de foco sobre la tira de días (falta el tile "HOY"). |

## Acciones probadas

| # | Acción | Resultado | Captura |
|---|---|---|---|
| 1 | Carga inicial de la tab Previsión | Renderiza 3 tarjetas sin errores de consola/página (`errores: []` en la ejecución Playwright) | 01 |
| 2 | Tocar un tile de día distinto de "Hoy" (SÁB 26) | Filtra el gráfico a esa jornada, marca el tile activo, añade aviso + botón "Ver próximos días" | 02 |
| 3 | Tocar el mismo tile otra vez (deseleccionar) | Vuelve al estado por defecto (96h, todos los días) — comportamiento simétrico correcto | 03 |
| 4 | Tocar tile "Ver todos" | Abre `ion-modal` con `ion-datetime` acotado al rango de días con datos reales (min/max) | 04 |
| 5 | Cerrar el selector con Escape | Cierra el modal correctamente, pero deja foco de teclado visible con outline por defecto del navegador sobre "Ver todos" y desplaza el scroll horizontal de la tira de días, ocultando "HOY" | 05 |
| 6 | Tocar una barra del gráfico horario (hora ~05:00 del rango visible) | Abre modal de detalle: índice, 9 factores en barras, 4 chips de condiciones meteo, hasta 3 especies activas | 06, 07 |
| 7 | Scroll horizontal del gráfico hasta el final (96h) | Llega hasta el último día (Mar 29) sin errores; scrollbar oculto (`scrollbar-width:none`) | 10 |
| 8 | Búsqueda de emoji renderizados en el DOM de `#vista` (regex Unicode) | 0 coincidencias | — |
| 9 | Verificación de `pageerror`/`console.error` durante toda la sesión | 0 errores | — |

## Bugs y fallas encontradas

| Severidad | Hallazgo | Archivo:línea |
|---|---|---|
| **HIGH** | **Tres sistemas de iconos conviviendo en la app**, y Previsión usa el minoritario. `src/domain/iconos.js` (nombres en español: `sol`, `solNube`, `ola`, `viento`, `flechaSube`…, función `svg(nombre)` sin parámetro de tamaño, usa `.innerHTML` con trazos hardcoded) es el sistema **establecido**: lo usan `app.js`, el shell (`app-shell.js`), los modales (`modal.js`), Mapa (`vista-mapa.js`) y la tab principal Ahora (`vista-ahora.js`). `src/ui/util/icons.js` (nombres en inglés/mixtos: `sol`, `nube-sol`, `diana`, `calendario`…, función `svg(nombre, size, color)` con `createElementNS` por `<path>`) es un **segundo sistema paralelo**, casi redundante en propósito, usado solo por `vista-login.js` y **`vista-prevision.js`**. Ambos módulos redefinen iconos equivalentes (p. ej. "sol") con trazos SVG distintos y APIs distintas. Añadiendo `ion-icon` (Ionicons real, ya dependencia del proyecto, usado en `vista-cuaderno.js`, `pp-captura-card.js`, `modal.js` para el botón de cerrar) son **tres** sistemas de iconografía activos a la vez. | `src/domain/iconos.js` (todo el archivo, 67 líneas) vs `src/ui/util/icons.js` (todo el archivo, 83 líneas); imports: `src/app.js:10`, `src/ui/shell/app-shell.js:27`, `src/ui/util/modal.js:12`, `src/ui/views/vista-mapa.js:36`, `src/ui/views/vista-ahora.js:23` (usan `domain/iconos.js`) vs `src/ui/views/vista-login.js:12`, `src/ui/views/vista-prevision.js:13` (usan `ui/util/icons.js`) |
| **MEDIUM** | La escala de color del índice (`colorIndice`) pierde poder discriminativo justo en el tramo alto (70-100), que es el caso común en una previsión buena: los 5 tonos son casi idénticos entre sí y, con los datos reales capturados (84-94), **todas** las barras/badges se ven del mismo naranja `#ff9500`. La codificación por color se vuelve invisible precisamente cuando más útil sería diferenciar "Bueno" de "Excelente". Además la leyenda (`09-leyenda-zoom.png`) codifica solo por color/hue, sin forma/patrón adicional — problema de accesibilidad para daltonismo (protanopia/deuteranopia confunden naranjas próximos). | `src/domain/config.js:126-132` (`colorIndice`); consumido en `src/ui/views/vista-prevision.js:93` (badge de día), `:160` (badge de ventana), `:343-344` (barra del gráfico), `:371` (badge del modal de detalle) |
| **MEDIUM** | El botón "Ver todos" (y el resto de tiles `.pp-dia-tile`) no tiene estilo `:focus-visible` propio. Al cerrarse el modal de calendario (Escape o tap en la X), el foco de teclado vuelve al botón que lo abrió y el navegador aplica su outline blanco por defecto, muy inconsistente con el tema oscuro/naranja de la app. Como efecto colateral, ese foco fuerza el scroll horizontal de la tira `.pp-semana-scroll` para hacer visible el elemento enfocado, **ocultando el tile "HOY"** — justo el punto de referencia temporal más importante de la tira. Confirmado visualmente en `05-tras-cerrar-calendario.png`. | `src/styles/theme.css:274-296` (reglas de `.pp-dia-tile`, sin `:focus-visible`); comparar con `src/styles/theme.css:148` donde sí existe `.pp-input:focus { outline: none; ... }` para otro componente — el patrón de foco no se aplicó de forma consistente |
| **MEDIUM** | El texto "motivo" de cada fila en "Mejores ventanas" se trunca con `white-space:nowrap` + `text-overflow:ellipsis` y la fila **no tiene ningún manejador de interacción** (`filaVentana` no añade `addEventListener`), a diferencia de las barras del gráfico horario que sí abren un modal de detalle al tocarlas. El usuario no tiene forma de leer el motivo completo ("Suma: cambio de luz + marea en mov…"). Confirmado en `08-card-ventanas-zoom.png`. | `src/ui/views/vista-prevision.js:154-186` (`filaVentana`, sin listener), `:173-176` (render del motivo), `:188-197` (`motivoVentana`, genera el texto completo que luego se trunca sin acceso); CSS: `src/styles/theme.css:259` (`.pp-ventana-motivo`) |
| **LOW** | Tamaños de icono inconsistentes dentro de la misma vista sin un sistema de tokens claro: 15px en títulos de tarjeta, 16px en chips de meteo del modal, 17px en el título del selector de calendario, 18px en los tiles de día. Cuatro tamaños arbitrarios donde bastarían 2 (cabecera / inline). | `src/ui/views/vista-prevision.js:35` (`tituloConIcono`, tamaño 15), `:88` (tile de día, 18), `:115` (tile "Ver todos", 18), `:247` (título selector calendario, 17), `:422` (chip meteo del modal, 16) |
| **INFO** | Corrección de premisa: no hay emojis en el código ni en el render de esta vista. El único emoji "vivo" en el árbol de dependencias de Previsión es un *fallback inalcanzable*: `espImgEl()` devuelve un `<span>` con `esp.icono` (emoji) solo si la especie no tiene campo `imagen`; hoy **las 12 especies definidas tienen `imagen`** (ruta SVG), así que esa rama nunca se ejecuta en la práctica. No es un bug visible, pero es código muerto que vale la pena anotar si se añaden especies nuevas sin SVG. | `src/domain/especies.js:292-304` (`espImgEl`), `:301` (`span.textContent = esp ? esp.icono : '🐟'`) — usado desde `src/ui/views/vista-prevision.js:444` en el modal de detalle de hora ("Especies activas") |

## Análisis PFD

*Ejecutado con `perception-first-design:all` (v0.7.0) sobre la pantalla descrita arriba, con las capturas reales como evidencia. Contrato de app utilitaria (no landing de conversión): L1/L3 se reinterpretan como "confianza en la lectura del dato" en vez de "persuasión de compra".*

### Analyze (descriptivo) — qué pasa realmente en esta pantalla

**Subtítulo:** 5 consecuencias en cascada, 2 compuestos integrativos.

**1. La carga extrínseca se dispara justo donde el usuario más necesita comparar [Cognitive Load]**
*96 barras + 6 tiles + 1 lista de ventanas compiten por los mismos 3-5 huecos de memoria de trabajo, y el color — el único código que debería reducir esa carga — no diferencia entre "bueno" y "excelente".*
El propósito declarado de la pantalla es decidir CUÁNDO salir a pescar comparando franjas. Eso es una tarea de comparación visual, que Gestalt resuelve bien si el canal de codificación (color) tiene suficiente contraste perceptual entre categorías. Con `colorIndice` casi plano en el rango 70-100 (hallazgo MEDIUM de arriba), el usuario tiene que releer cada número de badge en vez de escanear el color — la aportación de la codificación por color colapsa exactamente en el caso más frecuente (buena previsión). Para usuarios noveles esto es invisible (leen los números igual). Para usuarios de sesiones rápidas ("¿hoy o mañana?", uso real en la lancha o en la playa con poca luz/atención), es un coste real: tienen que leer 6-12 números en vez de escanear un gradiente. **Qué pasa:** en sesiones cortas (uso típico "antes de salir de casa", <30s), el usuario ignora el color y lee solo los números — el sistema de color se vuelve decoración, no información.
**Citations:** Cowan (2010) para el límite de 3-5 chunks en memoria de trabajo; Wertheimer (1923) para agrupación perceptual por similitud de color (aquí fallida por proximidad de tono).

**2. El primer vistazo confirma competencia técnica, no calidez [First-Impression Architecture]**
*El sistema visual (SVG monocromo naranja/gris sobre negro, trazos finos y consistentes) transmite "herramienta seria", no "app genérica de IA" — un punto a favor real.*
Dentro de los 50ms de juicio estético inicial (Lindgaard 2006), esta pantalla se beneficia de NO tener emojis (contradice la premisa inicial del encargo) y de un trazo SVG consistente con la marca (icono de la app también es un trazo naranja). El efecto halo (Kurosu & Kashimura 1995) juega a favor: la primera impresión es "app cuidada", lo cual predispone a confiar en los números que siguen. **Qué pasa:** el usuario nuevo no rebota por mala primera impresión visual; el riesgo de abandono en L1 es bajo. Este es el layer donde la pantalla mejor puntúa.
**Citations:** Lindgaard et al. (2006) para juicios de 50ms; Kurosu & Kashimura (1995) para el efecto halo estético-usabilidad.

**3. La fluidez de procesamiento se filtra por un canal de importación no auditado: qué icono viene de qué archivo [Processing Fluency]**
*El usuario nunca ve el código fuente, pero SÍ puede notar — aunque no lo verbalice — que el trazo de los iconos de Previsión "no es exactamente" el de Ahora o Cuaderno, porque literalmente provienen de dos librerías SVG distintas con distinto grosor de trazo (1.8 vs 1.7) y distinto radio de curva.*
La fluidez de procesamiento opera por debajo de la conciencia (Reber & Schwarz 1999) y es más fuerte cuando el usuario no sabe la fuente del efecto (Alter & Oppenheimer 2009) — aquí el usuario no sabe que hay dos archivos de iconos, solo *siente* una pequeña disonancia al cambiar de tab. Las desviaciones "near-miss" (un trazo de 1.7 vs 1.8, un radio de curva ligeramente distinto) cuestan perceptualmente más que una desviación grande y obvia (Bujack et al. 2022) — es más barato desde la percepción tener "todo emoji" consistente que "casi todo SVG pero con dos manos distintas". **Qué pasa:** a corto plazo (primeras sesiones) el usuario no detecta nada conscientemente; a medio plazo (uso recurrente, comparando tabs) puede acumular una sensación difusa de "esta app no es totalmente uniforme" sin saber señalar por qué — el coste es de confianza en el sistema, no de usabilidad puntual.
**Citations:** Reber & Schwarz (1999) para fluidez de procesamiento subconsciente; Alter & Oppenheimer (2009) para el efecto más fuerte cuando la fuente es desconocida; Bujack et al. (2022) para el coste no-lineal de desviaciones "near-miss".

**4. El sesgo de "dato exacto = dato fiable" se apoya en números sin rango de incertidumbre [Perception Bias]**
*Badges como "94" transmiten precisión absoluta (heurística de anclaje en el número exacto), cuando el índice es una estimación ponderada de un pronóstico meteorológico a 4 días — con incertidumbre creciente cuanto más lejos está el día.*
Los usuarios en autopilot (Kahneman 2011) anclan en el número mostrado sin cuestionar el margen de error del pronóstico subyacente (Open-Meteo a 96h). No hay ninguna señal visual (opacidad decreciente, icono de confianza) que distinga "hoy: dato casi observado" de "día 4: dato con más incertidumbre" — los tiles de "Próximos días" se ven todos con la misma seguridad visual. **Qué pasa:** el usuario puede planificar una salida el "Mar 29" con la misma confianza que para "Hoy", cuando el pronóstico meteorológico real tiene más error a 4 días vista — riesgo de decisión mal calibrada, no de UI per se, pero la UI no ayuda a calibrar.
**Citations:** Kahneman (2011) para heurísticas de sistema 1 y anclaje; Aplicado — sin cita directa del framework para incertidumbre meteorológica específica; cercano: Clark (2013) sobre procesamiento predictivo y error de predicción.

**5. La arquitectura de decisión funciona razonablemente bien para "cuándo", falla para "por qué" [Decision Architecture]**
*Tocar una barra lleva a información accionable (factores, condiciones, especies) — buen "information scent" ahí. Pero tocar una fila de "Mejores ventanas" no lleva a ningún sitio, rompiendo la expectativa que el resto de la pantalla acaba de instalar.*
El "information scent" (Pirolli & Card 1999) de las barras del gráfico predice correctamente su destino (tocar = detalle). Pero las filas de "Mejores ventanas" —visualmente muy similares a botones tocables, con el mismo lenguaje visual de badge+texto que otras filas interactivas de la app— no responden al toque (hallazgo MEDIUM arriba). Esto es una violación de convención: el usuario generaliza "las filas con badge coloreado son tocables" desde el propio gráfico de abajo, y esa expectativa se rompe arriba. **Qué pasa:** algunos usuarios probarán a tocar la fila de ventana (curiosos por el motivo truncado), no pasará nada, y no lo volverán a intentar — pérdida silenciosa de una vía de detalle que el usuario mismo buscó.
**Citations:** Pirolli & Card (1999) para information scent; Thaler & Sunstein (2008) para el principio de que la arquitectura debe hacer fácil la opción correcta — aquí la opción "ver más detalle" existe pero no donde el usuario la busca primero.

**A. El coste de las tres librerías de iconos compone con el tiempo de vida del proyecto [Cross-layer: Processing Fluency × Decision Architecture]**
*No es un bug de esta pantalla: es una deuda que crece cada vez que alguien añade un icono nuevo sin saber cuál de los tres sistemas usar.*
Cada nueva vista que se escriba tiene que "adivinar" cuál de los tres sistemas de iconos usar (`domain/iconos.js`, `ui/util/icons.js`, `ion-icon`), y las dos primeras ya han divergido en API (`svg(nombre)` vs `svg(nombre, size, color)`). Esto es un patrón de **lock-in asimétrico**: cuantas más vistas usen el sistema minoritario, más caro es consolidar, porque hay que auditar y portar trazos SVG uno a uno (no son intercambiables automáticamente, cada uno tiene su propio dibujo del mismo concepto). **Qué pasa:** a corto plazo (esta sesión) es un hallazgo de código, invisible para el usuario. A medio plazo (próximos 2-3 features) cada nueva pantalla tiene 33% de probabilidad de "elegir mal" y seguir divergiendo. A largo plazo, sin intervención, la unificación se vuelve más cara que reescribir.
**Citations:** Aplicado — patrón de deuda técnica y lock-in asimétrico; no hay cita directa del framework de percepción para deuda de código, es una extensión razonada del principio de coherencia de sistema visual (Reber & Schwarz 1999; Wertheimer 1923) hacia su causa raíz en el código.

**B. La ausencia de emoji es una señal positiva que el encargo no esperaba encontrar [Cross-layer: First Impression × Processing Fluency]**
*El framework predice que quitar emojis y unificar a SVG mejora la fluidez — y aquí ya se hizo (commit `92473d3`) antes de esta auditoría, así que el "quick win" esperado ya está cobrado; lo que queda por cobrar es la unificación de los DOS sistemas SVG restantes.*
**Qué pasa:** si se reporta "sustituir emojis por iconos" como acción pendiente sin verificar el estado real del código, se gastaría esfuerzo en un problema ya resuelto, mientras el problema real (dos SVG paralelos) sigue sin atenderse. Vale la pena que el plan de mejora refleje esto con precisión.
**Citations:** Aplicado; sin cita directa — es una observación de proceso de auditoría, no un hallazgo de percepción.

*Initial findings. Ralph Loop a consequence, cite further, switch to solve / evaluate, or ask any follow-up to dig deeper.*

### Solve (prescriptivo) — qué tendría que ser cierto para que esto funcione

**Problema:** el pescador necesita decidir, en menos de 30 segundos y a menudo con luz solar directa o de madrugada, cuál de los próximos 4-6 días (y qué franja horaria dentro de ellos) es mejor para salir — sin tener que leer 12+ números uno a uno, y sin dudas sobre si un dato interactúa o no.

1. **Foundation → R1: el canal de color debe ser suficiente por sí solo para ordenar los días/horas sin leer el número.** Violación actual: `colorIndice` colapsa visualmente en el rango 70-100 (el caso más común). **Citations:** Cowan (2010) para el coste de depender de lectura numérica en vez de codificación perceptual cuando la memoria de trabajo ya está cargada con 6+ ítems comparables.

2. **L1 → R2: el sistema de iconos debe ser uno solo y debe reforzar, no diluir, la primera impresión de "herramienta cuidada" que ya logra el trazo SVG actual.** Violación actual: tres sistemas de iconos (dos SVG propios + Ionicons) compiten sin resolución; Previsión usa el minoritario. **Citations:** Kurosu & Kashimura (1995) para el efecto halo estético — un sistema fragmentado diluye el halo positivo que el trazo SVG por sí solo ya genera.

3. **L2 → R3: todo elemento con la misma forma visual (badge + texto en fila) debe comportarse igual (tocable o no) en toda la pantalla.** Violación actual: las filas de "Mejores ventanas" imitan visualmente a las barras tocables del gráfico pero no responden al toque. **Citations:** Wertheimer (1923) para agrupación por similitud — la similitud visual genera expectativa de comportamiento similar; Reber & Schwarz (1999) para el coste de fluidez cuando la expectativa se rompe.

4. **L3 → R4: la confianza transmitida por un dato (precisión visual del número) debe ser proporcional a la confianza real del dato subyacente (proximidad temporal del pronóstico).** Violación actual: "Hoy" y "Mar 29" se muestran con el mismo peso visual pese a tener distinta incertidumbre meteorológica. **Citations:** Kahneman (2011) para el anclaje en el número mostrado sin ajuste por incertidumbre.

5. **L4 → R5: todo foco de teclado (modal → tile) debe ser visualmente coherente con el tema Y no debe desplazar el contexto que el usuario necesita (el tile "Hoy" como referencia).** Violación actual: outline por defecto del navegador + auto-scroll que oculta "HOY" tras cerrar el selector de calendario. **Citations:** Thaler & Sunstein (2008) para diseñar el entorno de forma que la opción/referencia correcta permanezca accesible por defecto.

**Solución que satisface R1-R5:**
- Ampliar la separación perceptual de `colorIndice` en el tramo 70-100 (p. ej. usar un degradado de 2 canales — hue + luminosidad/saturación — en vez de solo variaciones de hue naranja) → R1.
- Consolidar los iconos de Previsión sobre el sistema ya establecido (`domain/iconos.js`, usado por Ahora/Mapa/Shell/Modales) y retirar `ui/util/icons.js`, o al revés si `ui/util/icons.js` se considera la versión "buena" a portar hacia atrás — pero un único sistema, no dos → R2.
- Añadir `addEventListener('click', …)` a `filaVentana` que abra el mismo modal de detalle de hora que ya usan las barras del gráfico (reutilizar `modalDetalleHora`) → R3.
- Introducir una señal visual de confianza decreciente con la distancia temporal (opacidad, borde punteado, o una etiqueta pequeña "estimado") en los tiles de días 3+ → R4.
- Añadir `:focus-visible` con el color de acento del tema a `.pp-dia-tile` y anclar/city el `scroll-snap` o `scrollIntoView({ inline: 'nearest', block: 'nearest' })` explícito tras cerrar el modal, o forzar el foco de vuelta al `<body>`/contenedor en vez del tile individual → R5.

**Gap:** ninguna implementación existente (el estado actual del código) satisface R2, R3 ni R5. R1 y R4 tampoco están cubiertos hoy — son la brecha completa entre el estado actual y una pantalla "excelente" por el rubric PFD.

*Initial findings. Ralph Loop a requirement, cite further, switch to analyze / evaluate, or ask any follow-up to dig deeper.*

### Evaluate (puntuado) — contra el rubric de capas PFD

| Capa | Score | Justificación |
|---|---|---|
| **Foundation (Cognitive Load)** | 62/100 | Sin sobrecarga de elementos interactivos (96 barras son escaneables, no 96 decisiones — es una sola lectura visual tipo gráfico), tipografía consistente, responsive correcto (393px sin overflow horizontal de página). Pero pierde puntos por depender de lectura numérica en vez de color cuando el color falla (ver Analyze #1) y por el texto truncado sin vía de acceso (fila de ventanas). |
| **L1 (First Impression)** | 78/100 | Punto fuerte de la pantalla: trazo SVG consistente, sin emoji, paleta de marca coherente (naranja sobre negro), jerarquía clara de tarjetas. No llega a 80+ por los tamaños de icono ligeramente inconsistentes (15/16/17/18px) que un ojo entrenado empieza a notar en sesión larga. |
| **L2 (Processing Fluency)** | 58/100 | Dentro de la propia vista, el sistema es internamente consistente (una sola librería de iconos, un solo grosor de trazo). El score baja fuerte al considerar la app completa: dos sistemas SVG + Ionicons conviviendo es exactamente el tipo de "desviación near-miss" que el rubric penaliza más que una desviación grande y obvia (Bujack et al. 2022). Esta vista concreta no se nota "rota", pero es la comparación entre tabs la que expone la fractura. |
| **L3 (Perception Bias)** | 55/100 | No hay dark patterns ni urgencia falsa (la app no vende nada, lo cual es honesto y coherente con su propósito). Pero tampoco comunica incertidumbre del pronóstico — los números se presentan con precisión absoluta sin matiz temporal, lo que puede generar sobreconfianza en datos a 3-4 días vista. |
| **L4 (Decision Architecture)** | 65/100 | El flujo principal (elegir día → ver horas → tocar hora → ver detalle) tiene buen information scent y es predecible. Penaliza: la fila de "Mejores ventanas" rompe la convención de tocabilidad que el propio gráfico instala, y el bug de foco/scroll tras el selector de calendario introduce fricción justo al volver del flujo secundario. |

**Score compuesto (media simple):** 63.6/100 — "Mediocre, con violaciones Major puntuales, intención de capa parcialmente lograda" según el rubric. La pantalla no tiene violaciones Critical (no hay imágenes rotas, no hay ausencia de diseño responsive, no hay más de 3 familias tipográficas) pero acumula suficientes Major (color sin poder discriminativo en el caso común, doble sistema de iconos, interacción rota en ventanas, foco sin estilo) para no cruzar el umbral de "Bueno" (70+).

*Initial findings. Ralph Loop a layer score, cite further, switch to solve / analyze, or ask any follow-up to dig deeper.*

## Plan de mejora priorizado

> Plan, no implementación. Ningún archivo bajo `src/` fue tocado durante esta auditoría.

1. **[ALTA] Consolidar los sistemas de iconos SVG en uno solo.** Es el hallazgo de mayor impacto estructural (HIGH en la tabla de bugs) y la causa raíz real detrás de la sensación de inconsistencia que el encargo atribuía a los emojis.
   - Decidir cuál de los dos sistemas custom se conserva: `src/domain/iconos.js` (mayoritario: usado por `app.js`, `app-shell.js`, `modal.js`, `vista-mapa.js`, `vista-ahora.js`) parece el candidato natural por ser el más usado, pero `src/ui/util/icons.js` tiene mejor API (parámetro de tamaño/color) — evaluar si conviene portar esa API al módulo mayoritario en vez de simplemente descartarlo.
   - Migrar `src/ui/views/vista-prevision.js` (import en línea 13) y `src/ui/views/vista-login.js` (línea 12) al sistema elegido.
   - Auditar si conviene además migrar los usos de `ion-icon` (`src/ui/views/vista-cuaderno.js`, `src/ui/components/pp-captura-card.js`, `src/ui/util/modal.js:31-32`) al sistema custom, o al revés — es una decisión de arquitectura de icono único que excede el scope de esta auditoría puntual, pero debe registrarse como decisión pendiente.
   - **Nota sobre el encargo original:** la acción "sustituir emojis por iconos SVG/ionicons" tal como se pidió explícitamente **no tiene objetivos que tocar en `vista-prevision.js`** — ya se hizo en el commit `92473d3` antes de esta sesión. Si el equipo quiere ese ítem igualmente en el backlog, su alcance real hoy es la consolidación de sistemas de icono arriba descrita, no una sustitución de emoji inexistentes.

2. **[MEDIA] Ampliar la separación perceptual de `colorIndice` en el tramo 70-100.** Archivo: `src/domain/config.js:126-132`. Es la función central consumida en 4 puntos de `vista-prevision.js` (líneas 93, 160, 343-344, 371) — cambiar la función beneficia a toda la vista de una vez. Considerar un segundo canal (luminosidad/saturación) además del hue, o un indicador secundario no-color (icono de estrella/check) para el nivel "Excelente" específicamente.

3. **[MEDIA] Dar interacción a las filas de "Mejores ventanas".** Archivo: `src/ui/views/vista-prevision.js`, función `filaVentana` (líneas 154-186). Reutilizar `modalDetalleHora` (línea 361) pasando la hora `v.mejorHora` de la ventana, igual que ya hacen las barras del gráfico (línea 353). Resuelve tanto el texto truncado sin acceso como la ruptura de convención de tocabilidad.

4. **[MEDIA] Estilar `:focus-visible` en `.pp-dia-tile` y evitar que el retorno de foco tras cerrar el modal de calendario oculte el tile "HOY".** Archivo: `src/styles/theme.css:274-296` (añadir regla de foco con el color de acento, coherente con el patrón ya usado en `:148` para `.pp-input:focus`) + revisar en `src/ui/views/vista-prevision.js:239-284` (`abrirSelectorDia`) si conviene devolver el foco explícitamente a un contenedor neutro tras `cerrarModal()` en vez de dejar que el navegador lo devuelva al tile.

5. **[BAJA] Unificar tamaños de icono a un sistema de 2 tokens (cabecera / inline).** Archivo: `src/ui/views/vista-prevision.js`, líneas 35, 88, 115, 247, 422 — sustituir los literales 15/16/17/18 por dos constantes (p. ej. `ICONO_CABECERA = 16`, `ICONO_INLINE = 18`) definidas junto a `ESCALA_INDICE`/`NOMBRES_FACTOR` al principio del archivo.

6. **[BAJA / a validar con producto] Señalizar incertidumbre creciente en los tiles de días lejanos (3-4 días vista).** No es un bug de UI sino una brecha de comunicación de confianza del dato (hallazgo del PFD, Solve R4). Requiere decidir con producto si se quiere abrir esa conversación (p. ej. opacidad decreciente, o una nota "previsión, no confirmado" a partir del día 3) — se deja como ítem abierto, no como cambio de código concreto.

## Preguntas abiertas

- ¿Se quiere formalizar la decisión de qué sistema de iconos SVG es el "oficial" (`domain/iconos.js` vs `ui/util/icons.js`) antes de que se añada una tercera vista que elija por su cuenta? Esto afecta a más pantallas que Previsión y probablemente merece su propia tarea de arquitectura, no un fix puntual de esta vista.
- ¿La ausencia de interacción en las filas de "Mejores ventanas" fue una decisión consciente (quizá para no duplicar el modal de detalle de hora) o un descuido al portar la tarjeta? Si fue consciente, el texto no debería truncarse con ellipsis sin indicar visualmente que el resto es inaccesible.
- ¿Vale la pena comunicar incertidumbre/confianza decreciente por lejanía temporal del pronóstico (día 1 vs día 4), o se considera fuera de alcance para una app que ya declara "datos gratuitos de Open-Meteo" sin pretensión de precisión garantizada?
- El commit `92473d3` ya resolvió el problema de emojis en esta vista concreta — ¿conviene revisar si quedan emojis vivos en **otras** pantallas del árbol `src/` (se detectaron usos reales, no solo de fallback, en `vista-trofeos.js`, `vista-dev.js`, `pp-liga-item.js`, `pp-mapa.js`, `pp-rank-fila.js`, `vista-ahora.js` y `pp-curva-solunar.js` durante el grep de esta auditoría) para no repetir la misma corrección de premisa en la próxima auditoría de esas pantallas?
