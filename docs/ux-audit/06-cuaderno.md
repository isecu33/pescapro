# Cuaderno

**Fecha de auditoría:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples`
**Commit auditado:** `7ce04d8` — "feat(cuaderno): hasta 5 fotos por captura, spot/fecha editables y fix de scroll"
**Método:** Playwright headless, viewport móvil 393×852, geolocalización real (Zarautz), servidor Vite local (`http://localhost:5174/`), datos reales de Open-Meteo. Sin errores de consola ni `pageerror` en ninguna interacción de la sesión.

Archivos auditados: `src/ui/views/vista-cuaderno.js` (603 líneas), `src/ui/components/pp-captura-card.js` (162 líneas), `src/ui/util/modal.js`, `src/styles/theme.css` (reglas `.pp-form*`, `.pp-foto*`, `.pp-galeria*`).

---

## Capturas

Todas en `screenshots/cuaderno/`:

| # | Archivo | Qué muestra |
|---|---|---|
| 01 | `01-inicial.png` | Cuaderno vacío: CTA "Registrar captura", tarjeta Historial con texto explicativo, Exportar/Importar |
| 02 | `02-modal-nueva-captura-arriba.png` | Modal "Registrar captura" recién abierto, formulario completo visible sin scroll |
| 03 | `03-selector-fotos-0.png` | Selector de fotos con 0/5 — único slot "Añadir" |
| 04 | `04-modal-scroll-fondo.png` | Intento de scroll al fondo del modal (formulario vacío — cupo entero, sin cambio visual) |
| 05 | `05-fecha-hora-editadas.png` | Fecha y hora editadas manualmente (20/09/2026, 18:45) |
| 06 | `06-campos-rellenos.png` | Talla, peso, señuelo y notas rellenos |
| 07 | `07-selector-especie-actionsheet.png` | Action-sheet de Especie — nótese "Cancel" en inglés al final |
| 08 | `08-tras-elegir-especie.png` | Tras elegir "Dorada" |
| 09 | `09-selector-spot-actionsheet.png` | Action-sheet de Spot — mismo "Cancel" sin traducir |
| 10 | `10-selector-fotos-2-anadidas.png` | 2 fotos reales subidas (input file), grid con "X" para quitar, contador "2 de 5 fotos" |
| 11 | `11-tras-quitar-una-foto.png` | Tras quitar una foto — reacomodo instantáneo, contador "1 de 5 fotos" |
| 12 | `12-modal-scroll-fondo-relleno.png` | Formulario relleno + 1 foto, scroll al fondo — botón "Guardar captura" visible |
| 13 | `13-historial-tras-guardar.png` | Tras guardar: Galería (1), "Tus patrones" con barras de stats, Historial con la nueva tarjeta |
| 14 | `14-primera-tarjeta-historial.png` | Zoom a la tarjeta de la captura guardada |
| 15 | `15-visor-foto-detalle.png` | Visor de foto a pantalla completa (tap en miniatura) |
| 16 | `16-vista-completa-con-galeria-stats.png` | Vista completa antes de borrar |
| 17 | `17-tras-borrar.png` | Tras confirmar borrado — vuelve limpio al estado vacío |

---

## Acciones probadas

| # | Acción | Archivo/línea relevante | Resultado |
|---|---|---|---|
| 1 | Abrir tab Cuaderno con historial vacío | `vista-cuaderno.js:152-159` | Empty state bien resuelto (texto explicativo, no hueco en blanco) |
| 2 | Abrir modal "Registrar captura" | `vista-cuaderno.js:459-463`, `util/modal.js:13-47` | Sheet a pantalla completa (`breakpoints:[0,1]`), formulario vacío cabe sin scroll |
| 3 | Editar Fecha y Hora manualmente | `vista-cuaderno.js:522-534` | Inputs nativos `type=date`/`type=time`, edición correcta, `max` en fecha impide futuro |
| 4 | Rellenar Talla/Peso/Señuelo/Notas | `vista-cuaderno.js:483-542` | OK, sin fricción |
| 5 | Elegir Especie vía action-sheet | `vista-cuaderno.js:468-481` | 14 opciones en español, funciona; botón de cierre en inglés ("Cancel") |
| 6 | Elegir Spot vía action-sheet | `vista-cuaderno.js:507-517` | Mismo patrón, mismo "Cancel" sin traducir |
| 7 | Subir 2 fotos reales (input file) | `vista-cuaderno.js:339-431` | Compresión async correcta, grid de miniaturas, contador "2 de 5 fotos" |
| 8 | Quitar 1 foto del selector | `vista-cuaderno.js:378-386` | Instantáneo, sin confirmación (correcto, acción barata/reversible), contador se actualiza |
| 9 | Scroll dentro del modal (fix reciente) | `util/modal.js:40`, `vista-cuaderno.js:598-602` | Sin saltos ni contenido cortado en los escenarios probados (formulario vacío y con 1 foto); **no se pudo forzar overflow real** con 5 fotos + notas largas en headless — ver Preguntas abiertas |
| 10 | Guardar captura | `vista-cuaderno.js:550-596` | Guarda, cierra modal, re-renderiza Cuaderno con la nueva captura |
| 11 | Ver Galería y "Tus patrones" | `vista-cuaderno.js:41-94` | Ambas tarjetas aparecen correctamente tras la primera captura con foto |
| 12 | Abrir visor de foto a pantalla completa | `vista-cuaderno.js:189-271`, `pp-captura-card.js:71-87` | Foto grande, metadatos completos, notas en cursiva |
| 13 | Borrar captura | `vista-cuaderno.js:161-170` | `window.confirm()` con texto correcto ("también su foto"), borra y vuelve al empty state |
| 14 | Comprobar errores de consola/página en todo el flujo | — | **Cero errores** (`pageerror`/`console.error`) en las 14 acciones anteriores |

---

## Bugs y fallas encontradas

| Severidad | Hallazgo | Archivo:línea | Evidencia |
|---|---|---|---|
| **Media (confianza en datos)** | El snapshot de `condiciones` puede guardarse sin `faseMarea` (u otros campos) cuando la fecha editada cae fuera de la ventana de pronóstico cargada, **sin ningún aviso al usuario** ni marca diferenciada en la tarjeta o en "Tus patrones". El usuario no tiene forma de saber que un dato falta. | `vista-cuaderno.js:561-574` (cálculo de `condiciones`, no valida si `fechaSel` está dentro de `st.datos.horas`); `pp-captura-card.js:119-142` (renderiza condicionalmente sólo los campos presentes, sin indicar ausencia) | Reproducido: captura guardada con fecha 20/09/2026 quedó sin "Marea X" en la tarjeta (13, 15) y la tarjeta de stats mostró "Por fase de marea: Sin datos aún" (13) |
| **Media (i18n/cohesión)** | El botón de cierre de los `ion-select` con `interface="action-sheet"` (Especie, Modalidad, Spot) muestra "Cancel" en inglés — el resto de la app, incluidos otros botones "Cancelar" (`app.js:264`, `vista-trofeos.js:532`), está 100% en español. No hay `setupConfig`/locale de Ionic que lo traduzca (`main.js` no lo configura). | `vista-cuaderno.js:468-481, 494-503, 507-517` | Visible en 07 y 09 |
| **Baja** | Sin `min` ni feedback visual en el input de Fecha sobre qué rango de fechas tiene datos de condiciones disponibles — causa raíz "silenciosa" del hallazgo anterior. | `vista-cuaderno.js:528` (sólo `max`) | — |
| **Baja** | Al elegir más fotos de las que caben en el hueco restante, el excedente se descarta sin aviso (documentado por el propio comentario del autor). No reproducido en esta sesión (se subieron exactamente 2 fotos para 5 huecos); listado como falla conocida, no verificada en vivo. | `vista-cuaderno.js:335-338, 417` | Comentario explícito en el código |
| **Baja (redundancia visual)** | Label y placeholder muestran el mismo texto en Talla, Peso, Señuelo y Notas (p. ej. label "Talla (cm)" + placeholder "Talla (cm)"). Patrón consistente con el resto de `ion-input` de la app, no aislado — ruido visual mínimo. | `vista-cuaderno.js:483-492, 536-542` | Visible en 02 |

**No son bugs, son decisiones consistentes de producto (anotadas, no penalizadas):** `window.confirm()`/`window.prompt()` nativos para borrar/exportar/importar — coherente con el resto de la app y documentado explícitamente en el código (`vista-cuaderno.js:273-280`).

---

## Análisis PFD

*Ejecutado con `perception-first-design:all` (v0.7.0). Corpus cargado: `pfd-layer-rubric.md`, `constitutional-constraints.md`, `output-schema.md`, `anti-patterns.md`, resúmenes de capas de `SKILL.md`. **Alcance reducido** respecto a un audit Tier-2 completo: no se cargaron los 5 anchor examples de calibración ni el corpus psicológico completo (`mvs-psychology-reference.md`) ni las reglas heurísticas YAML — las citas usadas provienen de las fuentes cargadas; donde no hay cita directa se marca "observación de practicante". El rubric de la capa L3 está calibrado para sitios de conversión (prueba social, urgencia) y se adapta aquí a una pantalla de diario personal sin funnel de venta, conforme a la regla de "Deviation Handling" del framework (desviación intencional del contexto, no violación).*

### Analyze (descriptivo)

**¿Qué ocurre perceptivamente cuando un usuario interactúa con el flujo de fotos múltiples, edición de fecha/spot y snapshot automático de condiciones del Cuaderno?**
*5 cascadas de capa, 3 compuestos integrativos.*

#### 1. Un formulario plano de 10 controles paga su coste de escaneo aunque la mayoría de campos se ignoren [Cognitive Load]
*El formulario muestra Especie, Talla, Peso, Modalidad, Spot, Fecha, Hora, Señuelo, Notas y el selector de fotos en una sola lista continua, sin agrupar.*

La memoria de trabajo sostiene 3-5 fragmentos simultáneos (Cowan 2010) y ese coste se paga incluso por elementos que el usuario no va a usar conscientemente — el ruido visual consume ancho de banda aunque esté desatendido (Hassin et al., 2009). En la práctica, el flujo rápido (elegir especie, pulsar Guardar) es barato porque casi todos los demás campos son opcionales con valores por defecto sensatos (fecha/hora = ahora, spot = activo). Pero el coste de *escaneo inicial* — la primera mirada al abrir el modal — es fijo: 10 controles visibles a la vez, sin agrupación ni indicador de pasos, por encima del umbral de 7 campos que el propio rubric de PFD marca como señal de fallo sin disclosure progresivo.

**Qué ocurre:** para el uso más común (una foto + especie + guardar) la fricción real es baja; para usuarios nuevos o para sesiones con varias capturas seguidas, el "muro de campos" se vuelve un coste de reconocimiento repetido en cada apertura, aunque cada campo individual sea trivial.

**Citations:** Cowan (2001, 2010) para capacidad de memoria de trabajo 3-5 fragmentos; Hassin et al. (2009) para coste de WM en procesamiento inconsciente.

#### 2. La foto — la novedad central del release — recibe menos peso visual que su inversión de ingeniería [First-Impression Architecture]
*El selector de fotos es un único cuadrado pequeño con borde punteado; no hay ninguna llamada de atención sobre que esta pantalla ahora soporta hasta 5 fotos.*

Los juicios de atractivo visual se forman en 50ms (Lindgaard et al., 2006) y ese primer vistazo determina si el resto se evalúa con buena fe (efecto estética-usabilidad, Kurosu & Kashimura, 1995). El resto del modal es visualmente cohesivo — tema oscuro consistente, CTA naranja inequívoco — así que el 50ms no falla. Pero la funcionalidad que el equipo más ha invertido en construir esta iteración (compresión async, spinner, grid, contador "N de 5") ocupa la posición visual menos prominente del formulario: un cuadrado discreto al final de una lista de inputs de texto.

**Qué ocurre:** un usuario que abre el modal por primera vez tras la actualización probablemente no detecta, sin scrollear hasta el final, que ahora puede adjuntar varias fotos — el "descubrimiento" de la feature depende de que llegue hasta abajo, no de que la vea de un vistazo.

**Citations:** Lindgaard et al. (2006) para el juicio visual de 50ms; Kurosu & Kashimura (1995) para el efecto halo estética-usabilidad.

#### 3. El grid de fotos es internamente fluido; el "Cancel" en inglés rompe esa fluidez en el punto exacto de una decisión [Processing Fluency]
*Miniaturas, radios de borde y contador reutilizan el mismo lenguaje visual que el resto de la app — pero el botón de cierre del selector de especie/spot queda en inglés.*

La consistencia es señal de calidad subconsciente: lo fácil de procesar se siente más verdadero y más confiable (Reber & Schwarz, 1999), y ese efecto es más fuerte cuando el usuario no es consciente de la fuente (Alter & Oppenheimer, 2009). El grid de fotos (`.pp-foto-item`) reutiliza deliberadamente el mismo radio/paleta que `.pp-galeria-celda` — coherencia intencional, documentada en el propio CSS. Pero cada vez que el usuario abre el selector de Especie, Modalidad o Spot, el botón de cierre dice "Cancel" en una app que es 100% español en cualquier otro punto, incluidos otros "Cancelar" nativos de la misma app. La inconsistencia no es cosmética aislada: ocurre en el momento de una decisión activa (elegir opción o cancelar), no en un rincón pasivo.

**Qué ocurre:** el usuario hispanohablante no pierde funcionalidad, pero el "salto" de idioma en medio de una interacción activa es exactamente el tipo de inconsistencia que erosiona confianza de forma acumulativa (SKILL.md L2: "inconsistency compounds as trust erosion"), aunque el coste por ocurrencia sea pequeño.

**Citations:** Reber & Schwarz (1999) para fluidez de procesamiento como señal de verdad; Alter & Oppenheimer (2009) para el efecto de fluidez cuando la fuente es inconsciente.

#### 4. La tarjeta "Tus patrones" proyecta autoridad visual uniforme sobre datos de calidad desigual [Perception Bias]
*Las barras de estadísticas se ven igual de sólidas tengan detrás capturas con snapshot completo o capturas con datos parciales — no hay forma de distinguirlas.*

La confianza es una salida perceptiva, no argumental (Seckler et al., 2015): el usuario confía en lo que ve, no en un razonamiento sobre la integridad de los datos que nunca podría auditar. El procesamiento predictivo dispara atención ante violaciones de una predicción (Clark, 2013) — pero una *ausencia* silenciosa de dato no genera esa señal de error, porque no hay ninguna predicción visual que romper: el renderizado condicional de `pp-captura-card.js` simplemente omite el campo faltante sin dejar un hueco perceptible. El resultado es estructural, no incidental: el propio patrón de diseño (ocultar campos ausentes en vez de marcarlos) es lo que impide que el usuario note nunca la diferencia.

**Qué ocurre:** a medida que se acumulan capturas con fecha editada hacia atrás, la proporción de "Sin datos aún" en "Por fase de marea" crece de forma invisible para el usuario, que sigue leyendo el gráfico con la misma confianza aunque una fracción creciente de la muestra sea parcial — el propósito declarado de la feature ("descubrir tus patrones") se degrada exactamente donde el usuario no puede verlo.

**Citations:** Seckler et al. (2015) para confianza como salida perceptiva; Clark (2013) para procesamiento predictivo — una ausencia no dispara la misma señal de atención que una violación visible.

#### 5. El campo Fecha no señala qué elección degrada silenciosamente los datos [Decision Architecture]
*El input de fecha sólo bloquea el futuro (`max`); no distingue entre fechas con pronóstico cargado y fechas fuera de rango.*

Estructurar el entorno para que la opción correcta sea la más fácil (Thaler & Sunstein, 2008) requiere que el entorno *comunique* cuál es la opción correcta. Aquí no lo hace: elegir cualquier fecha pasada es indistinguible en la interfaz, aunque unas conserven el snapshot de condiciones completo y otras no. Esto es bidireccional, no un fallo de una sola dirección: la flexibilidad de fecha es una necesidad real (pescadores que registran al final del día, o transcriben un cuaderno en papel — casos de uso legítimos), y el coste es que usarla sin guía puede silenciar datos sin que el usuario lo elija conscientemente. El test de Sinceridad de PFD (lo que se muestra = lo que se entrega) queda en tensión: el campo se presenta como una edición neutra, pero no siempre lo es.

**Qué ocurre:** el usuario ejerce la flexibilidad que el fix del commit reciente le dio (fecha editable) sin saber que, en algunos casos, ese mismo gesto vacía silenciosamente parte del valor de otra feature (patrones). Nadie es advertido en ningún punto del flujo.

**Citations:** Thaler & Sunstein (2008) para arquitectura de elección legible; test de Sinceridad del framework PFD (constitutional-constraints.md).

---

### Compuestos integrativos

#### A. Dos features del mismo release chocan sin contrato explícito entre ellas [Cross-layer: Cognitive Load × Perception Bias]
*La edición de fecha y el motor de estadísticas se enviaron en el mismo commit, pero nadie conectó "esta fecha puede dejar la condición incompleta" con "esta captura alimenta un gráfico de confianza".*

Cuando dos funcionalidades hermanas (edición de fecha, ver patrones) interactúan sin una verificación cruzada de integridad de datos, el síntoma es exactamente este: cada feature funciona correctamente de forma aislada y el problema sólo aparece en la intersección. No es "ai slop" en el sentido de pulido visual — el pulido visual del flujo de fotos es genuinamente bueno — pero sí es la firma clásica de features shippeadas rápido sin una pasada de integración entre ellas.

**Citations:** Aplicado a partir del principio de dependencia entre capas del framework (una capa alta —confianza en L3— no puede ser más sólida que los datos de las capas bajas que la alimentan); sin cita directa del corpus psicológico cargado en este scope reducido.

#### B. El hueco de datos es permanente por diseño: no existe backfill [Cross-layer: Decision Architecture — Lock-in asymmetry]
*Una vez guardada una captura con snapshot parcial, no hay ninguna acción en la interfaz para recalcular esas condiciones más tarde.*

Los comportamientos sustitutos suelen fijarse más rápido de lo que la reintroducción los revierte. Aquí no hay ni siquiera un comportamiento sustituto: el registro queda parcial de forma permanente, sin un botón "recalcular condiciones" ni ningún camino de recuperación simétrico con la facilidad con la que se creó el hueco (editar un campo de fecha).

**Citations:** Observación de practicante (patrón de asimetría de recuperación descrito en el protocolo de análisis de PFD; sin cita psicológica directa cargada en este scope).

#### C. El propio botón "Exportar" de esta pantalla puede propagar el hueco a otra persona [Cross-layer: Decision Architecture × Social — Ecosystem]
*Marante no tiene servidor, pero README documenta competiciones resueltas por códigos e intercambio manual de datos entre usuarios — el JSON exportado desde este mismo Cuaderno es ese vehículo.*

Aunque el alcance social es reducido (app sin backend, sin feed), el propio dominio del producto ya contempla el intercambio de datos entre personas (exportar/importar, competiciones sin servidor). Un snapshot de condiciones incompleto y sin marcar viaja igual de "completo en apariencia" en el JSON exportado que uno íntegro — el receptor tampoco tiene forma de distinguirlos.

**Citations:** Observación de practicante, basada en el propio README del proyecto (mecanismo de exportar/importar ya documentado en `vista-cuaderno.js:273-331`); sin cita psicológica directa cargada en este scope.

*Initial findings. Ralph Loop a consequence, cite further, switch to solve / evaluate, or ask any follow-up to dig deeper.*

---

### Solve (prescriptivo)

**Problema:** el usuario quiere capturar el momento de una pesca con fotos rápido y sin fricción, y quiere confiar en que el snapshot automático de condiciones que alimenta "Tus patrones" refleja de verdad ese momento. Hoy el flujo de fotos es funcionalmente sólido pero visualmente subestimado, y el escape hatch de fecha editable puede vaciar silenciosamente datos que otra feature (patrones) presenta después con plena autoridad visual.

**R1 — Cognitive Load.** Restricción: memoria de trabajo de 3-5 fragmentos (Cowan 2010); más de 7 campos sin disclosure progresivo es señal de fallo documentada en el rubric de PFD. Violación: 10 controles interactivos en una lista plana sin agrupar (`vista-cuaderno.js:547-548`). Requisito: el formulario DEBE reducirse a ≤2 agrupaciones perceptibles (p. ej. "núcleo" siempre visible — Especie/Talla/Peso/Fotos — y "detalles" separado visualmente — Modalidad/Spot/Fecha-Hora/Señuelo/Notas) sin añadir pasos de navegación reales.
**Citations:** Cowan (2001, 2010) para capacidad de WM; señal de fallo del rubric PFD (>7 campos sin disclosure).

**R2 — First Impression.** Restricción: juicio visual en 50ms (Lindgaard 2006), halo estética-usabilidad (Kurosu & Kashimura 1995). Violación: el selector de fotos —la feature central del release— tiene el menor peso visual del formulario. Requisito: el control de fotos DEBE leerse, de un vistazo, como el control principal del formulario — mayor tamaño del primer slot y/o una línea de ayuda visible cerca de la parte alta del formulario, no sólo tras 8 campos de texto.
**Citations:** Lindgaard et al. (2006) para juicio visual de 50ms; Kurosu & Kashimura (1995) para el halo estética-usabilidad.

**R3 — Processing Fluency.** Restricción: la consistencia es señal subconsciente de verdad/confianza (Reber & Schwarz 1999); la inconsistencia erosiona confianza de forma acumulativa. Violación: "Cancel" en inglés en los tres `ion-select` con `interface="action-sheet"` (`vista-cuaderno.js:468-481, 494-503, 507-517`), mientras el resto de la app está en español. Requisito: TODO texto visible al usuario, incluido el chrome por defecto de Ionic, DEBE estar en español — configurar `cancelText: 'Cancelar'` allí donde se use `interface="action-sheet"`.
**Citations:** Reber & Schwarz (1999) para fluidez como señal de verdad; principio L2 de SKILL.md ("inconsistency compounds as trust erosion").

**R4 — Perception Bias / Trust.** Restricción: la confianza es una salida perceptiva, no argumental (Seckler et al. 2015); las ausencias no disparan señal de atención como sí lo hacen las violaciones visibles (Clark 2013). Violación: capturas con `condiciones` parcial o nulo se renderizan con la misma autoridad visual que capturas completas, tanto en la tarjeta de Historial como en "Tus patrones". Requisito: cuando una captura se guarde con snapshot parcial o nulo, la interfaz DEBE mostrar una señal ligera y honesta — en el momento de guardar (p. ej. una línea junto a Fecha: "Sin datos de marea para esta fecha") y/o una marca discreta en la tarjeta guardada — para que la procedencia de los datos agregados siga siendo legible.
**Citations:** Seckler et al. (2015) para confianza como salida perceptiva; Clark (2013) para procesamiento predictivo.

**R5 — Decision Architecture.** Restricción: estructurar el entorno para que la elección correcta sea la más fácil de identificar (Thaler & Sunstein 2008); test de Sinceridad de PFD (lo mostrado = lo entregado). Violación: el input de Fecha sólo restringe el futuro (`max`, línea 528); no hay ninguna diferenciación entre fechas dentro/fuera de la ventana de pronóstico cargada. Requisito: el selector de fecha/hora DEBE comunicar, antes o en el momento de la elección, qué rango produce un snapshot completo (deshabilitar/atenuar fechas fuera de `st.datos.horas`, o mostrar microcopy inline al elegir una fecha fuera de rango).
**Citations:** Thaler & Sunstein (2008) para arquitectura de elección legible; test de Sinceridad (constitutional-constraints.md).

**Solución que satisface R1-R5 simultáneamente:** reestructurar el modal en dos agrupaciones visuales sin añadir pasos reales de navegación (satisface R1) — cluster "núcleo" (Especie + Talla + Peso + selector de fotos, con el selector agrandado y una línea de ayuda visible desde el principio del scroll, satisface R2) y un cluster "Detalles" con separador visual sutil (Modalidad + Spot + Fecha/Hora + Señuelo + Notas). Fijar `cancelText` en español en los tres action-sheets — cambio de una línea, sin rediseño (satisface R3). Añadir una única comprobación reutilizando la lógica ya existente en el handler de guardado (`horaMasCercana`/`indiceHora`, líneas 561-574): si el resultado de `condiciones` queda nulo o con campos ausentes, mostrar microcopy junto a Fecha en el momento de la elección (satisface R5) y reflejar la misma bandera como una marca discreta en la tarjeta guardada (satisface R4) — R4 y R5 comparten una sola implementación porque ambos consumen la misma señal de "condiciones incompletas" ya calculada.

**Test contra lo ya implementado (commit `7ce04d8`):** no satisface R1 (formulario plano de 10 campos); satisface R2 parcialmente (el selector existe pero no destaca); no satisface R3 (Cancel en inglés); no satisface R4 ni R5 (cero señal ante snapshot incompleto).

**El hueco no obvio:** R4 y R5 convergen en una única pieza de UI pequeña (microcopy + marca en tarjeta) que nadie pediría explícitamente como "una advertencia", pero que la pila de requisitos hace desproporcionadamente valiosa frente a su coste de implementación — reutiliza lógica de nulidad que el propio `save handler` ya calcula, no requiere plumbing nuevo.

*Initial findings. Ralph Loop a requirement, cite further, switch to analyze / evaluate, or ask any follow-up to dig deeper.*

---

### Evaluate (rated)

**Context Discovery**
- **Audiencia:** el propio usuario registrado de Marante, pescador de costa que ya usa el resto de la app — no un visitante de marketing. Sofisticación variable (desde ocasional hasta habitual), sin conocimiento técnico esperado.
- **Intención:** que la persona sienta que registrar una captura es rápido y fiable, y que confíe en las estadísticas agregadas que la app le devuelve más adelante. No hay conversión ni venta — el objetivo es percepción de fiabilidad y bajo esfuerzo.
- **Posicionamiento:** utilidad gratuita, sin monetización, funcional más que premium — la barra de exigencia visual es "coherente y cuidada", no "lujosa".
- **Modelo de negocio:** ninguno — app local-first, sin servidor, sin mecanismo de ingreso. No aplica ninguna de las 6 palancas de Cialdini orientadas a venta.
- **Qué funciona ya:** el tema oscuro es consistente en toda la captura, el CTA principal es inequívoco, el empty state está resuelto con texto explicativo (no un hueco), el flujo de fotos (compresión, grid, contador, quitar) funciona sin errores de consola en ningún paso probado, y el patrón de reutilización de estilos entre galería y selector de fotos está documentado y es real (no accidental).
- **Meta-nivel:** no aplica — esta pantalla no es una demostración de un servicio de diseño; se evalúa la ejecución en sus propios términos de utilidad personal.

**Adaptación del rubric:** la capa L3 (Perception Bias) del rubric de PFD está calibrada para sitios de conversión (prueba social, urgencia, Cialdini). En una pantalla de diario personal sin funnel de venta, la ausencia de prueba social/urgencia **no se penaliza** (deviation handling: contexto no aplicable). En su lugar, L3 se evalúa aquí por su núcleo transferible — alineación entre lo que la interfaz proyecta (autoridad visual de los datos) y lo que realmente hay detrás (integridad de esos datos) — que sí es un hallazgo real y medible en esta pantalla.

**Detección de sistema de diseño**
- Framework: Ionic Framework (Capacitor) + tokens CSS propios (`--pp-*` en `theme.css`) sobre los componentes Ionic.
- Librería de componentes: `@ionic/core` con Shadow DOM propio en `<pp-captura-card>`.
- Confianza: 95%.
- Notas: ninguno de los 3 perfiles MVS (Tailwind/WordPress/Shopify) aplica — evaluación con principios generales de PFD, no ajustes de framework web.

---

**Foundation (L0): 58/100 (fail)**
- Razonamiento: sin problemas de responsive (es una app móvil nativa en su viewport propio), sin exceso de familias tipográficas (una sola, consistente), pero 10 controles interactivos en una lista plana sin agrupación ni disclosure progresivo — por encima del umbral de 7 que el rubric marca como señal de fallo.
- Violaciones: **Mayor** — formulario de 10 campos sin agrupación visual ni pasos (`vista-cuaderno.js:547-548`).
- Fortalezas: empty state del Historial con texto explicativo, no hueco vacío (`vista-cuaderno.js:152-159`); la mayoría de campos son opcionales con valores por defecto sensatos, así que el coste real de completar es bajo aunque el coste de escaneo inicial no lo sea.
- Fixes: agrupar el formulario en 2 clusters visuales (núcleo siempre visible + detalles separados) sin añadir navegación real.

**Layer 1, First Impression: 78/100 (pass)**
- Razonamiento: apertura del modal cohesiva y sin sorpresas — tema oscuro consistente, CTA "Guardar captura" en alto contraste, ninguna imagen rota o placeholder. Las fotos reales usadas en la sesión (foto de calamar) se ven de calidad y relevantes una vez cargadas.
- Violaciones: **Menor** — el selector de fotos, siendo la novedad central del release, ocupa la posición de menor peso visual del formulario.
- Fortalezas: CTA principal inequívoco y de alto contraste; cero imágenes rotas/placeholder en toda la sesión; el visor de foto a pantalla completa (15) comunica calidad y cuidado.
- Fixes: aumentar la prominencia visual del primer slot de foto y/o añadir una línea de ayuda visible antes de llegar al final del scroll.

**Layer 2, Processing Fluency: 66/100 (fail)**
- Razonamiento: consistencia tipográfica y de espaciado fuerte en toda la captura; el grid de fotos reutiliza deliberadamente el radio/paleta de la galería existente (documentado en el propio CSS). El hallazgo real es el "Cancel" en inglés, sistemático en los tres `ion-select` con action-sheet.
- Violaciones: **Mayor** — "Cancel" sin traducir en Especie/Modalidad/Spot (`vista-cuaderno.js:468-481, 494-503, 507-517`), mientras el resto de la app (incluidos otros "Cancelar") está en español.
- Fortalezas: reutilización intencional de estilos entre `.pp-galeria-celda` y `.pp-foto-item` (comentado en `theme.css`); paleta y radios de borde consistentes en toda la pantalla; iconografía uniforme (`ion-icon` en todos los puntos).
- Fixes: configurar `cancelText: 'Cancelar'` (u opción equivalente de Ionic) en los tres selectores con `interface="action-sheet"` — cambio de una línea, sin rediseño.
- Nota de desviación: la redundancia label/placeholder en Talla/Peso/Señuelo/Notas se clasifica como **desviación intencional** (aplicada consistentemente en toda la app, coincide con el patrón de floating-label de Ionic) — no se puntúa como violación.

**Layer 3, Perception Bias: 60/100 (fail)**
- Razonamiento: sin funnel de venta, así que las señales estándar de esta capa (prueba social, urgencia) no aplican — evaluado en su lugar por alineación entre autoridad visual y calidad de datos. La tarjeta "Tus patrones" presenta barras de estadísticas con la misma autoridad visual estén construidas sobre datos completos o parciales, sin ninguna distinción.
- Violaciones: **Mayor** — la tarjeta de estadísticas no comunica cuándo una fracción de sus datos de origen está incompleta (`vista-cuaderno.js:77-94`; causa raíz en `561-574`).
- Fortalezas: lenguaje concreto y directo en toda la interfaz ("Registrar captura", "Guardar captura") — el nivel de abstracción coincide con una tarea de registro, no de venta.
- Fixes: propagar una bandera de "snapshot parcial" desde el cálculo de condiciones hasta la tarjeta y hasta el agregado de estadísticas.

**Layer 4, Decision Architecture: 64/100 (fail)**
- Razonamiento: CTA claro y específico ("Guardar captura"), sin patrones oscuros en ningún punto observado, confirmación de borrado que describe con precisión la consecuencia ("también su foto"). El fallo de Sinceridad está en el campo Fecha: lo que se muestra (un input de fecha libre) no comunica lo que a veces se entrega (un snapshot incompleto).
- Violaciones: **Mayor** — sin guía ni feedback en el input de Fecha sobre qué rango preserva datos completos (`vista-cuaderno.js:528`).
- Fortalezas: cero patrones oscuros; Exportar/Importar con igual peso visual, sin default manipulador; confirmación de borrado precisa y específica (`vista-cuaderno.js:165`).
- Fixes: deshabilitar/atenuar visualmente fechas fuera de `st.datos.horas`, o mostrar microcopy inline al elegir una fecha fuera de rango.

---

**Cross-Layer Patterns**
1. El hallazgo de "condiciones incompletas silenciosas" aparece simultáneamente en L3 (autoridad visual vs. calidad de datos) y L4 (Sinceridad del campo Fecha) — es un único root cause con dos síntomas de capa distinta, corregible con una sola implementación compartida (ver Solve, R4+R5).
2. El "Cancel" sin traducir es un único gap de configuración de Ionic (ausencia de `cancelText`/locale) que se manifiesta como violación L2 en tres puntos distintos del mismo formulario — una sola línea de código resuelve los tres.

---

**Overall: 65/100**
Pantalla con craft real en su feature más nueva (el flujo de fotos es fluido, coherente visualmente y no generó un solo error de consola en 14 acciones probadas), lastrada por un puñado de hallazgos concretos y accionables: un formulario sin agrupar, un string sin traducir, y — el más relevante — un hueco de confianza silencioso entre la edición de fecha y las estadísticas agregadas. No se detectó ninguna violación crítica; ningún cap de dependencia se activó.

---

**Top 3 Fixes (Highest Impact)**
1. Agrupar el formulario en 2 clusters visuales (núcleo + detalles) — Foundation (capa con peso 1.5x), impacto estimado 58→~72.
2. Propagar una señal de "condiciones parciales" desde el cálculo existente hasta Fecha, la tarjeta y las estadísticas — L3+L4 simultáneamente (una sola implementación, dos capas), impacto estimado L3 60→72, L4 64→75.
3. Configurar `cancelText: 'Cancelar'` en los tres action-sheets — L2, cambio de una línea, impacto estimado 66→76.

---

**Dependency Notes**
Ningún cap de dependencia se activó: Foundation (58) ≥ 40 y L1 (78) ≥ 40, y no se registró ninguna violación de severidad Crítica en ninguna capa. Todos los scores mostrados son directos, sin capar.

*Initial findings. Ralph Loop a layer score, cite further, switch to solve / analyze, or ask any follow-up to dig deeper.*

---

## Plan de mejora priorizado

(Plan únicamente — nada de esto se ha implementado en esta auditoría.)

1. **[Alto impacto, bajo esfuerzo] Traducir el "Cancel" de los action-sheets.** Configurar `cancelText: 'Cancelar'` (o el locale de Ionic) en los tres `ion-select interface="action-sheet"` de `vista-cuaderno.js`. Cambio de una línea, resuelve una inconsistencia visible en 3 puntos del flujo.
2. **[Alto impacto, esfuerzo medio] Señalizar snapshots de condiciones incompletos.** Reutilizar el cálculo ya existente en el handler de guardado (`vista-cuaderno.js:561-574`) para detectar cuándo `condiciones` queda nulo o parcial, y reflejarlo: (a) microcopy junto a Fecha en el momento de elegirla, (b) una marca discreta en la tarjeta de Historial guardada. Es el hallazgo que más compromete la promesa central de la feature ("descubre tus patrones").
3. **[Impacto medio, esfuerzo medio] Agrupar visualmente el formulario en 2 clusters.** Núcleo (Especie/Talla/Peso/Fotos) siempre visible arriba; Detalles (Modalidad/Spot/Fecha-Hora/Señuelo/Notas) con separador visual sutil debajo. No requiere pasos de navegación nuevos, sólo reestructuración visual.
4. **[Impacto medio, esfuerzo bajo] Dar más prominencia visual al selector de fotos.** Ampliar el primer slot o añadir una línea de ayuda visible cerca de la parte alta del formulario, no sólo tras 8 campos de texto — la feature más nueva del release merece corresponder su peso visual con la inversión de ingeniería que recibió.
5. **[Impacto bajo, esfuerzo bajo] Confirmar en dispositivo real el fix de scroll bajo estrés.** Verificar manualmente (no se pudo forzar en headless) el caso con 5 fotos + notas largas, que es exactamente el escenario que motivó el cambio a `breakpoints:[0,1]` en el commit auditado.
6. **[Impacto bajo, esfuerzo bajo] Avisar cuando se descartan fotos por exceder el máximo.** Actualmente el excedente se ignora sin aviso (comportamiento documentado por el propio autor, no verificado en vivo en esta sesión) — un mensaje breve en `ayuda.textContent` bastaría.

---

## Preguntas abiertas

- ¿Se ha probado el fix de scroll (`breakpoints:[0,1]`) en un dispositivo real con las 5 fotos llenas + notas largas? Esta auditoría no pudo forzar ese overflow en headless (el contenido probado siempre cupo en viewport, incluso con 1-2 fotos) — es el escenario exacto que el commit dice resolver y queda sin verificar al 100%.
- ¿Es intencional que el snapshot de condiciones se guarde silenciosamente incompleto al editar la fecha fuera de rango, o es un descuido del alcance de la tarea de "spot/fecha editables"? Si es intencional, ¿debería comunicarse igualmente al usuario?
- ¿Vale la pena, a medio plazo, sustituir `window.confirm()`/`window.prompt()` nativos (borrar, exportar, importar) por componentes propios de la app, dado el nivel de cuidado visual del resto de la pantalla? No se penaliza en esta auditoría por ser un patrón consistente y ya documentado como decisión deliberada, pero es la superficie más "cruda" que queda visible al usuario.
- ¿Qué pasa si el usuario importa un JSON (vía "Importar") con capturas que tienen `condiciones` parciales de otra persona? La ausencia de marca de "datos parciales" también viajaría en ese flujo — no se probó en esta sesión.
