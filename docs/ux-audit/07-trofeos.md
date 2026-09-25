# Trofeos

**Fecha auditoría:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples` · commit `7ce04d8`
**Pantalla:** Logros/achievements + competiciones ("ligas") con amigos vía código compartido
**Archivos fuente:** `src/ui/views/vista-trofeos.js` (577 líneas), `src/ui/components/pp-liga-item.js` (90 líneas), `src/ui/components/pp-rank-fila.js` (58 líneas)
**Entorno:** Vite dev server (localhost:5174), Playwright headless Chromium, viewport móvil 393×852, tema oscuro (único tema observado). 0 errores de consola/página durante toda la sesión.

## Capturas

Todas en `docs/ux-audit/screenshots/trofeos/`:

| Archivo | Contenido |
|---|---|
| `01-inicial.png` | Vista completa al entrar en Trofeos — records + grid de logros + ligas, con el toast de celebración de un logro recién desbloqueado superpuesto (ver nota abajo) |
| `02-grid-logros.png` | Recorte de la tarjeta "Logros (1/21)" — grid completo de 21 hexágonos, también con el toast superpuesto |
| `03-modal-logro-bloqueado.png` | Modal de detalle de "Cogiendo el ritmo" (bloqueado, progreso 1/5) |
| `04-modal-logro-desbloqueado.png` | Modal de detalle de "Primera captura" (conseguido) |
| `05-ligas-vacio.png` | Sección "Competiciones con amigos", estado vacío |
| `06-modal-nombre-pescador.png` | Modal "Tu nombre de pescador" (paso previo a Crear/Unirse) |
| `07-modal-nombre-pescador-relleno.png` | Mismo modal con el campo relleno |
| `08-modal-crear-liga.png` | Formulario "Nueva competición" (nombre, fechas, modo de puntuación) |
| `09-modal-crear-liga-relleno.png` | Mismo formulario con nombre de liga relleno |
| `09b-tras-crear-share-fallback.png` | Modal "Compartir" (fallback de `navigator.share()`) tras crear la liga, con el código de invitación íntegro |
| `10-ligas-con-item.png` | Vista completa con la liga ya creada — tarjeta `<pp-liga-item>` con tag "activa" |
| `11-modal-detalle-liga-ranking.png` | Modal de detalle de liga — ranking con `<pp-rank-fila>` y las 4 acciones |
| `12-modal-importar-codigo.png` | Modal "Pegar código", vacío |
| `13-modal-importar-codigo-error.png` | Mismo modal tras enviar un código inválido, con el error visible |

**Nota metodológica:** para poder capturar el contraste real bloqueado/desbloqueado (un perfil nuevo tiene 0/21 logros, todo gris), se sembró `localStorage['pp_cuaderno']` con una captura antes de cargar la app. Esto disparó automáticamente el toast de celebración de "Primera captura" al entrar en Trofeos por primera vez — comportamiento real de la app, no un artefacto del script — por lo que `01` y `02` quedaron con el toast en primer plano. Se documenta como hallazgo en vez de descartarse (ver Análisis PFD, consecuencia L1).

## Acciones probadas

| # | Acción | Resultado |
|---|---|---|
| 1 | Entrar en Trofeos con un logro recién desbloqueado y no visto | Toast de celebración a pantalla completa se dispara solo, se autocierra a los 4s o con "¡GENIAL!" |
| 2 | Click en logro bloqueado del grid | Abre modal con icono a color (96px), nombre, descripción, "Progreso: 1 de 5" |
| 3 | Click en logro desbloqueado del grid | Abre el mismo modal con "✓ Conseguido" — icono visualmente idéntico al del punto 2, sin distinción de bloqueo |
| 4 | Click "Crear" en Competiciones (perfil sin nombre) | Pide nombre de pescador antes de continuar (`conNombre()`) |
| 5 | Guardar nombre → continúa a "Nueva competición" | Formulario con nombre, fechas desde/hasta (por defecto hoy → +14 días), selector de modo ("Puntos por talla") |
| 6 | Crear liga | Cierra el formulario, intenta `navigator.share()` (no disponible en Chromium headless), cae al modal "Compartir" con el código `PESCAPRO1:...` en textarea de solo lectura |
| 7 | Volver a Trofeos tras crear | La liga aparece como `<pp-liga-item>` con tag "activa" |
| 8 | Click en la tarjeta de liga | Abre modal de detalle: ranking con `<pp-rank-fila>` (medalla 🥇, "(tú)", "42 pts · 1 capturas"), nota "de momento estás solo", 4 botones de acción |
| 9 | Click "Unirse / añadir código" | Modal "Pegar código" con textarea y placeholder `PESCAPRO1:…` |
| 10 | Pegar código inválido (`CODIGO-INVALIDO-XYZ-123`) y pulsar "Importar" | Error visible en el propio modal: "⚠️ Código no válido (falta el prefijo PESCAPRO1)" — no bloquea, no usa `alert()` |

## Bugs y fallas encontradas

| # | Severidad | Descripción | Archivo:línea |
|---|---|---|---|
| 1 | **MEDIUM** | El modal de detalle de un logro (`modalLogro()`) muestra el icono siempre a todo color y opacidad completa, tanto para logros bloqueados como desbloqueados. El grid sí aplica una regla visual clara (`opacity:.32` + `filter:grayscale(1)` vía `.pp-logro:not(.conseguido)`), pero esa regla no se propaga a `.pp-modal-logro-img`/`.pp-modal-logro-ico`, que no tienen ninguna clase condicional ni filtro definido. Resultado: tocar un logro bloqueado revela su arte final completo, contradiciendo la lógica de misterio que el propio grid establece un segundo antes. | `src/ui/views/vista-trofeos.js:213-236` (función `modalLogro`, sin clase condicional en el `<img>`/`<span>` de icono); CSS ausente en `src/styles/theme.css:1250-1262` (`.pp-modal-logro-img`, `.pp-modal-logro-ico`) |
| 2 | **LOW** | El grid de 21 logros se renderiza como una lista plana sin agrupar, aunque la taxonomía por categorías (CAPTURAS, COLECCIONISTA, EGGING, etc.) ya existe en el propio código fuente como comentarios de sección en la lista de logros. La UI no expone esa estructura — el usuario debe escanear 21 hexágonos iguales para inferir la agrupación por su cuenta. | `src/domain/records/logros.js` (comentarios `// === CAPTURAS ===`, `// === COLECCIONISTA ===`, etc. en `LISTA`, no reflejados en el render); `src/ui/views/vista-trofeos.js:179-211` (`seccionLogros`) |
| 3 | **LOW** | En el modal de detalle de una liga, las 4 acciones ("Compartir invitación", "Enviar mi resultado", "Añadir resultado de un amigo", "Borrar competición") se renderizan con el mismo `fill:'outline'` y el mismo tamaño — sin una acción primaria visualmente diferenciada según el contexto (p. ej. "Compartir invitación" debería destacar justo tras crear una liga con 1 solo participante, que es exactamente el estado capturado en `11-modal-detalle-liga-ranking.png`). Solo "Borrar competición" se distingue, y por color de peligro, no por jerarquía de acción principal. | `src/ui/views/vista-trofeos.js:484-511` (bloque `acciones` dentro de `modalLiga`) |
| 4 | **LOW** (posible, no confirmable en este entorno) | El flujo "compartir" depende de `navigator.share()`; en el entorno de prueba (Chromium headless) no está disponible y cae al fallback de copiar al portapapeles — que en esta ejecución tampoco pudo escribir en el portapapeles (mensaje "No se pudo copiar automáticamente. Copia el texto de arriba a mano."). El propio código ya contempla y maneja este doble fallo con un mensaje claro, así que **no es un bug de la app** — se documenta como limitación del entorno de auditoría, no como hallazgo real, pero conviene verificar en un dispositivo Android real que el camino feliz (`navigator.share()` nativo) funciona, ya que es el único camino probado exhaustivamente en producción. | `src/ui/views/vista-trofeos.js:551-576` (`compartir`, `mostrarCodigoParaCopiar`) — comportamiento correcto, solo limitación de entorno |
| 5 | **INFO** | El texto explicativo de confianza de las ligas ("aquí no hay árbitro, hay cuadrilla 😄") es una decisión de producto deliberada y bien comunicada, no un hueco por completar — se documenta aquí solo porque el Análisis PFD lo referencia como hallazgo de percepción (falta de refuerzo visual del "rastro de evidencia" detrás de una puntuación), no como fallo funcional. | `src/ui/views/vista-trofeos.js:513-515` |

No se encontraron errores de consola/página (`pageerror`/`console.error`) en ninguno de los 13 pasos del flujo.

## Análisis PFD

*Perception-First Design — pregunta de entrada: ¿qué efectos perceptivos y de comportamiento produce el diseño actual de la pantalla Trofeos (grid de logros con grafía de bloqueo inconsistente entre grid y modal, toast de celebración, y flujo de ligas por código compartido) sobre la motivación de uso continuado y la percepción de calidad "premium" de la app?*

### Analyze (descriptive)

**5 layer-cascade consequences, 2 integrative compounds.**

#### 1. El grid concentra 21 ítems en un solo nivel de escaneo pese a tener una taxonomía ya definida [Foundation]
*El usuario debe descubrir por sí mismo qué logros pertenecen a qué categoría; la app ya sabe la respuesta pero no la muestra.*

La memoria de trabajo sostiene 3-5 unidades simultáneas (Cowan, 2010), y ese coste se paga incluso cuando el ruido visual no se procesa conscientemente (Hassin et al., 2009). El grid de logros renderiza sus 21 hexágonos como una lista plana homogénea, aunque `logros.js` ya organiza `LISTA` en bloques comentados (capturas, coleccionista, eging, condiciones especiales...). Para usuarios nuevos que escanean en frío, el coste de parsing es máximo justo en el momento en que más importa enganchar. Para usuarios que vuelven, la memoria espacial (dónde estaba cada logro) reduce ese coste con la repetición — es un coste que se amortiza, no uno que persiste igual siempre.
**Qué pasa:** los primeros escaneos del grid son más lentos y es probable que la lógica de categorías (captura vs eging vs "día perfecto") pase desapercibida por completo, precisamente en el momento de mayor riesgo de abandono; usuarios recurrentes compensan con memoria espacial en 2-3 semanas.
**Citations:** Cowan (2010) para el límite de 3-5 chunks; Hassin et al. (2009) para el coste inconsciente del ruido visual no agrupado.

#### 2. El único momento de acabado "premium" es una excepción rara, no el estado que se ve la mayoría de las veces [L1]
*El toast de celebración brilla; el grid y la lista de records de cada día se ven planos — y el toast solo aparece cuando desbloqueas algo nuevo.*

Los juicios de atractivo visual se forman en 50ms (Lindgaard et al., 2006) y ese "halo" estético colorea toda la evaluación posterior (Kurosu & Kashimura, 1995) — pero ese juicio se repite en cada visita, no solo en la primera. En esta pantalla hay dos tratamientos visuales muy distintos conviviendo: la tarjeta de celebración (borde naranja con glow animado, rebote de entrada, jerarquía tipográfica cuidada) frente al grid/lista en reposo (bordes finos de 1px, fondo plano, sin textura). El toast solo se dispara al desbloquear un logro no visto — un evento finito y decreciente con el tiempo (la mayoría de logros se agotan en las primeras semanas de uso intensivo). El estado que un usuario ve el 95% de las veces que abre Trofeos es el plano.
**Qué pasa:** la percepción de calidad de esta pantalla es alta las primeras semanas (desbloqueos frecuentes + celebración) y se aplana justo cuando más se necesita sostener motivación — en el tramo final, cuando solo quedan los logros "platino" más difíciles y ya no hay celebraciones nuevas que compensen la fachada plana del resto del tiempo.
**Citations:** Kurosu & Kashimura (1995) para el halo estética-usabilidad; Lindgaard et al. (2006) para el filtro de 50ms aplicándose en cada visita, no solo en la primera.

#### 3. El grid enseña una regla visual que el modal rompe en el segundo toque [L2]
*Gris = bloqueado, en el grid. A todo color, en el modal — para el mismo logro, un toque después.*

La consistencia opera como señal de confianza subconsciente (Reber & Schwarz, 1999; efecto generalizado en Alter & Oppenheimer, 2009); el procesamiento predictivo penaliza cualquier violación de un patrón que el cerebro ya dio por establecido (Clark, 2013). El grid establece una gramática binaria inequívoca: opacidad .32 + escala de grises = bloqueado; color pleno + halo naranja = conseguido. El modal de detalle (`modalLogro()`) ignora esa gramática por completo — el mismo icono, tocado un segundo después, aparece a todo color sin importar el estado. Es una violación de predicción que ocurre dentro de la misma interacción de dos toques, no a lo largo de sesiones.
**Trade-off:** mostrar el arte completo de un logro bloqueado sí aporta algo — comunica con total claridad qué se va a conseguir, lo cual puede motivar por vía de objetivo concreto (más motivador que uno abstracto). El coste no es "no hay misterio", es que hay dos sistemas contradictorios conviviendo: el grid promete mystery-box, el modal la revienta. Eso es peor que cualquiera de las dos opciones puras.
**Qué pasa:** los usuarios más orientados a completismo — exactamente el perfil que esta mecánica busca enganchar — son los que más tocan logros bloqueados para planificar su progreso, así que son los que con más frecuencia se topan con la inconsistencia; la sensación inmediata es de "esto parece sin terminar", un prior que puede filtrarse a la confianza general en el resto de la app.
**Citations:** Clark (2013) para el coste del error de predicción; Reber & Schwarz (1999) para consistencia como señal de verdad/confianza.

#### 4. El sistema de ligas es honesto sobre no tener árbitro, pero no da ningún rastro visual de evidencia [L3]
*"Aquí no hay árbitro, hay cuadrilla 😄" es sincero — pero nada en el diseño refuerza por qué confiar en el número que ves.*

La confianza es un resultado perceptivo derivado de la coherencia visual, no solo de argumentos textuales (Seckler et al., 2015); el sistema 1 evalúa en autopiloto y racionaliza después (Nisbett & Wilson, 1977). La app declara explícitamente su modelo de confianza en una nota de texto, lo cual es una decisión honesta (no hay autoridad falsa, no hay verificación fingida). Pero el único rastro de evidencia visible tras un resultado (`· 1 capturas` en `pp-rank-fila`) se renderiza al mismo peso tipográfico apagado que cualquier metadato decorativo — no hay refuerzo visual de que ese número es *comprobable*, solo la promesa textual de que "el sistema calcula solo".
**Qué pasa:** para el grupo objetivo real (cuadrillas de pesca con confianza social previa) el modelo funciona bien tal cual — es el mismo patrón que usan apps de quinielas entre amigos, que funcionan por el vínculo social preexistente, no por el diseño de verificación. Pero un grupo más suelto, o la primera disputa dentro de un grupo cerrado ("¿de verdad midió 42cm?"), no tiene ningún mecanismo de la interfaz al que recurrir — ni foto asociada al resultado, ni rastro auditable — y eso no se comunica antes de que alguien lo necesite.
**Citations:** Seckler et al. (2015) para confianza como salida perceptiva, no solo argumental; Nisbett & Wilson (1977) para la brecha entre lo que se dice y lo que realmente se evalúa.

#### 5. Cuatro botones de acción con el mismo peso visual no comunican cuál es la acción "de hoy" [L4]
*Compartir invitación, enviar resultado, añadir resultado de un amigo, borrar — los cuatro se ven igual de importantes, siempre.*

La detectabilidad de una señal frente al ruido de fondo depende de que exista contraste real entre ellas (teoría de detección de señales, Green & Swets, 1966); estructurar el entorno para que la opción correcta sea la más fácil es el núcleo de una arquitectura de decisión ética (Thaler & Sunstein, 2008). El modal de detalle de liga presenta sus 4 acciones con `fill:'outline'` idéntico — solo "Borrar" se diferencia, y por color de peligro, no por relevancia. La acción de mayor valor cambia según el momento: para quien acaba de crear la liga (como en `11-modal-detalle-liga-ranking.png`, con 1 solo participante) lo prioritario es "Compartir invitación"; para quien vuelve a media competición, "Enviar mi resultado". Ningún estado recibe tratamiento visual diferenciado.
**Qué pasa:** cada visita al modal de liga impone un coste de decisión pequeño pero real (¿cuál de los cuatro pulso?), y la acción de mayor apalancamiento para el crecimiento del propio mecanismo social — invitar a más gente, sin lo cual "competición con amigos" es una competición de una persona — no recibe ninguna prioridad visual sobre acciones de menor urgencia como borrar la competición.
**Citations:** Green & Swets (1966) para discriminabilidad de señal (d-prime); Thaler & Sunstein (2008) para estructurar la opción fácil = la opción deseada.

### Integrative compounds

#### A. El momento de mayor activación emocional de toda la pantalla no tiene ninguna acción de compartir enganchada [Cross-layer L1 × L4, Social Aggregation]
*El toast "¡LOGRO CONSEGUIDO!" es el pico de emoción de la pantalla — y es el único sitio de toda la vista donde no existe un botón para compartirlo.*

`compartir()` ya existe, ya está probado, y ya maneja el doble fallback (`navigator.share()` → portapapeles → modal de copia manual) para invitaciones y resultados de liga. El toast de celebración (`mostrarCelebracionEnCola`) no lo reutiliza: su único botón es "¡Genial!" (cerrar). Es precisamente el instante de mayor arousal pre-verbal de la sesión — glow, rebote, tipografía en mayúsculas — el que se queda sin ninguna vía de salida hacia fuera de la app. Precedente: Duolingo, Strava y la mayoría de apps de hábito tratan el momento de celebración como su superficie de crecimiento orgánico principal, cableando el share button directamente ahí, no en un flujo secundario.
**Qué pasa:** se deja sobre la mesa una oportunidad de distribución gratuita exactamente en el momento en que el usuario está más dispuesto a hacer de embajador de la app; el único mecanismo de compartir de toda la pantalla queda reservado a invitaciones de liga (transaccional), no a logros (emocional).
**Citations:** Aplicación práctica del principio de aesthetic-usability halo (Kurosu & Kashimura, 1995) al diseño de loops de crecimiento; sin cita directa específica de growth-loop en el corpus del framework — adyacente más cercano: Lindgaard et al. (2006) sobre el peso del juicio inmediato como el "material" que vale la pena capturar y compartir.

#### B. Todo el progreso vive solo en el dispositivo, lo que ata al usuario por aversión a la pérdida más que por recompensa sostenida [Cross-layer Foundation × L2, Lock-in asymmetry]
*Cuanto más juegas, más tienes que perder si desinstalas — pero la app no hace nada activo por traerte de vuelta si ya te fuiste.*

Sin backend ni cuentas (decisión de producto deliberada), todo el historial — logros, récords, ligas — vive en `localStorage`. Con el tiempo el usuario acumula algo con lo que hay apego identitario (una insignia "Leyenda del espigón" de 50 capturas no se reemplaza fácilmente), justo cuando el estado visual en reposo de la pantalla (consecuencia L1) se vuelve menos estimulante. La retención queda sostenida por miedo a perder el progreso, no por recompensa perceptiva activa — un mecanismo de retención frágil: retiene a los ambivalentes, pero no puede reactivar a quien ya dejó de abrir la app, porque no existe ningún canal (push, email) para intentarlo sin backend.
**Qué pasa:** la curva de retención probablemente se sostiene razonablemente bien mientras el usuario sigue abriendo la app por otros motivos (marea, previsión), arrastrando a Trofeos de rebote; pero no hay ninguna vía de reenganche activo una vez que el usuario deja de abrir la app por completo — el diseño no tiene ningún as bajo la manga para ese escenario.
**Citations:** Aplicación práctica de la asimetría de anclaje/aversión a la pérdida (marco general de Kahneman & Tversky, 1979) a la arquitectura de retención sin backend; sin cita directa de lock-in de datos local-first en el corpus del framework.

*Initial findings. Ralph Loop a consequence, cite further, switch to solve / evaluate, or ask any follow-up to dig deeper.*

---

### Solve (prescriptive)

**Problema de diseño:** ¿cómo debería diseñarse el sistema de gamificación de Trofeos para que sostenga motivación a lo largo de todo el ciclo de vida del usuario (no solo en los picos de primer desbloqueo) y para que la mecánica de logros/ligas se sienta deliberadamente trabajada en vez de un bloque genérico de badges + modal?

**R1 — Foundation.** Constraint: la memoria de trabajo sostiene 3-5 unidades (Cowan, 2010). Violación: 21 logros en un grid plano sin agrupar, pese a que la taxonomía por categorías ya existe en el código (`logros.js`). Requisito: el grid DEBE exponer visualmente la estructura de categorías que ya existe en los datos, acotando el coste de escaneo a bloques de ~4-5 ítems en vez de 21 sueltos.
**Citations:** Cowan (2010); Hassin et al. (2009).

**R2 — L1.** Constraint: el halo estética-usabilidad se dispara en cada juicio de 50ms, en cada visita (Kurosu & Kashimura, 1995; Lindgaard et al., 2006). Violación: el único tratamiento de alta fidelidad visual (glow, rebote, degradados por nivel) está reservado al toast transitorio; el estado persistente (95% de las visitas) es plano. Requisito: el estado en reposo de los logros conseguidos DEBE heredar parte del lenguaje visual de la celebración (gradiente sutil por nivel bronce/plata/oro/platino, sin animación) para que el "premium" no dependa de pillar el instante exacto del desbloqueo.
**Citations:** Kurosu & Kashimura (1995); Lindgaard et al. (2006).

**R3 — L2.** Constraint: la consistencia es señal de confianza subconsciente; su violación tiene coste de predicción (Reber & Schwarz, 1999; Clark, 2013). Violación: el modal de logro no respeta la gramática grid gris=bloqueado. Requisito: cualquier superficie que renderice el mismo icono de logro DEBE aplicar la misma regla de bloqueo (escala de grises + opacidad reducida) sin excepciones — un único contrato visual, no dos.
**Citations:** Clark (2013); Reber & Schwarz (1999).

**R4 — L3.** Constraint: la confianza es una salida perceptiva de la coherencia visual, no solo del argumento textual (Seckler et al., 2015). Violación: el "detalle" que respalda una puntuación de liga (`· 1 capturas`) se ve tipográficamente idéntico a metadato decorativo. Requisito: donde se muestre un resultado autodeclarado, el rastro de evidencia que lo respalda (número de capturas) DEBE tener más peso visual que el resto del texto secundario, para que la confianza se gane por procedencia legible, no solo se afirme por copy.
**Citations:** Seckler et al. (2015).

**R5 — L4.** Constraint: la discriminabilidad de una señal exige contraste real frente al resto (Green & Swets, 1966); la arquitectura ética estructura la opción fácil = la opción querida (Thaler & Sunstein, 2008). Violación: 4 botones co-iguales en el modal de liga, sin acción primaria por contexto. Requisito: la fila de acciones DEBE marcar una única acción primaria (relleno sólido) según el estado de la liga (recién creada → compartir invitación; en curso → enviar resultado), degradando el resto — incluido "Borrar" — a tratamiento secundario.
**Citations:** Green & Swets (1966); Thaler & Sunstein (2008).

**Solución que satisface R1-R5 simultáneamente:** un único paso de rediseño con 4 cambios acotados, todos reutilizando estructura/datos ya existentes en el código (ningún cambio de modelo de datos):

1. Agrupar el grid de logros en secciones por categoría, usando directamente los bloques ya comentados en `LISTA` (`logros.js`) como fuente de la agrupación, con el mismo patrón `.pp-stats-titulo` que ya usa `seccionRecords()` para "Mejores piezas" (cierra R1).
2. Aplicar un fondo con gradiente sutil por nivel (bronce/plata/oro/platino) a `.pp-logro.conseguido` en reposo — no solo en el toast — reutilizando los mismos tokens de color que ya usa `pp-celebracion-tarjeta` (cierra R2 con el mismo sistema visual que ya cierra R1: la sección + su nivel superior de acabado son el mismo cambio).
3. En `modalLogro()` (vista-trofeos.js:213), añadir una clase condicional (`bloqueado`) al icono cuando `!l.conseguido`, y una regla CSS `.pp-modal-logro-img.bloqueado, .pp-modal-logro-ico.bloqueado { filter: grayscale(1); opacity: .5; }` junto a la regla existente en `theme.css:1251` (cierra R3, cambio de una línea de JS + una regla CSS).
4. Dar más contraste tipográfico a la porción `· N capturas` del `detalle` en `pp-rank-fila` (cierra R4); y condicionar `fill` a `'solid'` para la acción prioritaria según `liga.participantes.length` en `modalLiga()` (cierra R5).

**Contraste con el enfoque ingenuo:** una corrección "obvia" solo tocaría el punto 3 (el bug más visible/"roto"), dejando 1, 2, 4 y 5 intactos — resolvería la inconsistencia pero no la razón de fondo por la que la pantalla se siente plana el 95% del tiempo (consecuencia L1 del Analyze). Los 4 cambios son necesarios juntos porque cada uno cierra un requisito de una capa distinta que las demás no cubren.

**Hueco no cubierto por R1-R5:** ninguno de los 5 requisitos obliga, por sí solo, a resolver el compuesto integrador A del Analyze (cero mecanismo de compartir en el toast de celebración) — no es una violación de una capa existente, es una capacidad ausente. Se señala como la oportunidad no obvia: añadir un botón "Compartir" al toast de celebración, reutilizando literalmente el `compartir()` que ya existe y ya está probado en el flujo de ligas, a coste de implementación casi nulo porque el fontanería (navigator.share + fallback de portapapeles + modal) ya está resuelta en este mismo archivo.

*Initial findings. Ralph Loop a requirement, cite further, switch to analyze / evaluate, or ask any follow-up to dig deeper.*

---

### Evaluate (rated)

**Sistema de diseño detectado:** Ionic Web Components + CSS propio (sin Tailwind/Bootstrap), tema oscuro único, clases `.pp-*` a medida sobre primitivas Ionic. Confianza de detección: alta (código fuente leído directamente, no inferido de screenshots).

| Capa | Score | Estado |
|---|---|---|
| Foundation | 74 | Good (issues menores) |
| L1 — First Impression | 68 | Mediocre-alto |
| L2 — Processing Fluency | 55 | Mediocre (violación mayor) |
| L3 — Perception Bias | 66 | Mediocre-alto |
| L4 — Decision Architecture | 64 | Mediocre-alto |
| **Overall** (Foundation×1.5 + L1+L2+L3+L4)/5.5 | **66** | — |

**Foundation (74).** Violación V-F-001 (minor): grid de 21 logros sin agrupar pese a taxonomía ya presente en `logros.js`. Mecanismo: sets sin agrupar fuerzan al sistema visual a construir categorías sobre la marcha, consumiendo ancho de banda de memoria de trabajo incluso sin percepción consciente del ruido. Cita: Hassin et al. (2009); relevancia: 21 hexágonos iguales de 9.5px exceden el escaneo cómodo de un solo chunk. Fix: cabeceras de sección reutilizando el patrón `.pp-stats-titulo` ya existente. Fortaleza: el estado bloqueado/desbloqueado usa una codificación binaria fuerte y de bajo coste cognitivo (opacidad .32 + grises vs. color pleno + tinte naranja).

**L1 (68).** Violación V-L1-001 (major): el tratamiento visual de alta fidelidad (glow, rebote, arte diferenciado por nivel) está reservado al toast transitorio y no se traslada al estado persistente del grid/lista. Mecanismo: el halo estética-usabilidad necesita dispararse en los estados que el usuario ve repetidamente, no solo en un evento raro. Cita: Kurosu & Kashimura (1995); relevancia: la disparidad entre la tarjeta de celebración y los tiles planos en reposo es lo bastante grande como para leerse como "dos esfuerzos de diseño distintos". Fortaleza: el toast en sí (glow, `pp-logro-bounce`, jerarquía tipográfica) está genuinamente bien resuelto para una app sin backend.

**L2 (55).** Violación V-L2-001 (major, la más nítida de toda la auditoría): la gramática de bloqueo del grid no se respeta en el modal (`crearIcoLogro()` sin clase condicional consumida en `modalLogro()`, confirmado ausente en `theme.css:1250-1262`). Mecanismo: una vez establecida una regla visual (gris=bloqueado), el cerebro la trata como predicción; cualquier superficie que la rompa produce una pequeña sensación de error, sea o no articulable conscientemente. Cita: Clark (2013); relevancia: el par exacto de capturas auditadas (`02-grid-logros.png` vs. `03-modal-logro-bloqueado.png`) muestra el mismo logro renderizado de dos formas contradictorias en la distancia de interacción más corta posible (un toque). Fortaleza: el sistema de color por nivel (bronce/plata/oro/platino + acento naranja en conseguido) se aplica con consistencia genuina en las 21 tarjetas — cero colores sueltos fuera de sistema detectados.

**L3 (66).** Violación V-L3-001 (minor): el `detalle` autodeclarado de una puntuación de liga (`42 pts · 1 capturas`) se renderiza al mismo peso apagado que metadato puramente decorativo. Mecanismo: la confianza es salida perceptiva de la coherencia y prominencia visual, no solo de la solidez del argumento. Cita: Seckler et al. (2015); relevancia: es el único punto de toda la UI de ranking donde el rastro "cómo se calculó esto" está expuesto, y hoy es tipográficamente indistinguible de decoración. Fortaleza: el mensaje de error de código inválido ("⚠️ Código no válido (falta el prefijo PESCAPRO1)") es específico y no alarmista — exactamente el tipo de estado de sistema concreto y honesto que sostiene la confianza tras un fallo.

**L4 (64).** Violación V-L4-001 (major): los 4 botones de `modalLiga()` usan `fill:'outline'` idéntico, sin ninguno marcado como acción primaria según el estado de visita. Mecanismo: cuando todas las opciones de respuesta llevan el mismo peso visual, la discriminabilidad entre "esto es lo que debería hacer" y "esto es una opción más" cae. Cita: Green & Swets (1966); Thaler & Sunstein (2008); relevancia: la acción de mayor valor para quien acaba de crear una liga (compartir la invitación) recibe el mismo peso que "Añadir resultado de un amigo", solo relevante más adelante. Fortaleza: el copy de los CTA es concreto y específico ("Enviar mi resultado", "Crear y compartir invitación") en vez de genérico ("Submit", "OK") — satisface directamente el criterio de especificidad de etiqueta de L4.

**Cross-layer patterns:**
- La inconsistencia grid-vs-modal (V-L2-001) es una única causa raíz con doble síntoma: degrada L2 (gramática visual rota) y erosiona parcialmente L3 para el perfil completista (ver el logro bloqueado temprano aplana el pago emocional del desbloqueo futuro).
- La ausencia de una acción "compartir este logro" en el toast es un hueco Foundation-adyacente + L4: el momento de mayor arousal L1 de toda la pantalla no tiene ninguna acción L4 asociada, desaprovechando el instante en que el usuario está más dispuesto a completar una acción costosa (compartir).

**Executive summary:** Trofeos combina un momento de celebración genuinamente bien resuelto y una gramática grid de bloqueo limpia con un modal de detalle que rompe esa gramática, un estado persistente plano que no explota el sistema de niveles el 95% del tiempo, y una fila de 4 acciones sin jerarquía en el modal de liga. La mecánica de fondo es sólida y está enmarcada con honestidad (sin dark patterns, modelo de confianza transparente); la brecha principal es de consistencia y jerarquía, no de concepto.

**Top 3 fixes (por impacto/coste):**
1. Igualar el estado de bloqueo del modal con el del grid (cierra la violación L2 más nítida; coste: 1 clase condicional + 1 regla CSS).
2. Agrupar el grid por categorías usando la taxonomía ya existente en `logros.js` (cierra el hueco de Foundation; sin cambios de datos).
3. Diferenciar la acción primaria en `modalLiga()` según el estado de la liga (cierra el hueco de L4; cambio condicional de `fill`).

*Initial findings. Ralph Loop a layer score, cite further, switch to solve / analyze, or ask any follow-up to dig deeper.*

## Plan de mejora priorizado

Plan, no implementación — ningún cambio se ha aplicado bajo `src/`.

1. **[Alta prioridad, coste bajo] Unificar el estado de bloqueo entre grid y modal.** Añadir la misma regla visual (grayscale + opacidad reducida) al icono del modal de logro cuando `!l.conseguido`. Es la corrección más barata de toda la lista y cierra la violación más nítida detectada en las tres pasadas del análisis PFD (Analyze consecuencia 3, Solve R3, Evaluate V-L2-001).
2. **[Alta prioridad, coste medio] Agrupar el grid de logros por categoría.** La taxonomía ya existe en `logros.js` como comentarios de sección; exponerla como cabeceras de grupo reutilizando el patrón `.pp-stats-titulo` ya usado en "Mejores piezas". No requiere cambios de modelo de datos.
3. **[Media prioridad, coste medio] Llevar parte del lenguaje visual de la celebración al estado en reposo.** Un gradiente sutil por nivel (bronce/plata/oro/platino) en `.pp-logro.conseguido`, sin animación, para que el "premium" no dependa de coincidir con el instante exacto del desbloqueo.
4. **[Media prioridad, coste bajo] Diferenciar la acción primaria en el modal de liga.** `fill:'solid'` condicional según `liga.participantes.length` (compartir invitación si está sola; enviar resultado si ya tiene más gente), dejando el resto en `outline`.
5. **[Media prioridad, coste bajo] Dar más peso visual al rastro de evidencia de una puntuación.** El fragmento `· N capturas` de `pp-rank-fila` con mayor contraste que el resto del texto secundario, para reforzar visualmente que el número es comprobable.
6. **[Oportunidad, coste bajo] Añadir "Compartir" al toast de celebración.** Reutilizar el helper `compartir()` ya existente (usado en invitaciones/resultados de liga) para que el pico emocional de la pantalla tenga una vía de salida hacia fuera de la app — coste casi nulo porque la fontanería (`navigator.share` + fallback de portapapeles) ya está resuelta y probada en este mismo archivo.
7. **[Baja prioridad, verificación] Confirmar en dispositivo Android real que `navigator.share()` funciona en el camino feliz.** En el entorno de auditoría (Chromium headless) no está disponible y se probó únicamente el fallback de copia manual — no es un bug, pero es el único tramo del flujo de compartir no verificado end-to-end en esta sesión.

## Preguntas abiertas

- ¿Se ha decidido ya si el sistema de logros añadirá más niveles/categorías a futuro? Si es así, agrupar por categoría ahora (punto 2 del plan) evita que el grid crezca sin estructura más allá de 21 ítems.
- ¿Existe alguna telemetría (aunque sea local, tipo contador en `localStorage`) sobre cuántos usuarios llegan a desbloquear los logros de nivel platino? Ayudaría a decidir si vale la pena invertir en el punto 3 (estado en reposo premium) o si la mayoría de usuarios nunca llega tan lejos.
- El flujo de ligas asume grupos de confianza previa ("cuadrilla"); ¿hay intención de soportar grupos más grandes o más sueltos (p. ej. un club de pesca)? Si es así, el punto 5 (rastro de evidencia visible) se vuelve más urgente, ya que la fricción de una disputa sin mecanismo de resolución escala con el tamaño del grupo.
- ¿Está descartado por completo cualquier tipo de sincronización remota (aunque sea opcional/best-effort, sin cuentas) para el progreso de logros? El hallazgo del compuesto integrador B (bloqueo por aversión a la pérdida sin reenganche activo) solo es corregible con algún tipo de canal de reactivación, que hoy no existe por diseño.
- ¿Vale la pena, dado que ya existe `navigator.share()` cableado para ligas, extenderlo al toast de celebración (punto 6) en el mismo sprint que cualquier otro cambio de esta pantalla, dado lo bajo del coste de implementación frente al resto del backlog de producto?
