# Ahora (pantalla principal)

**Fecha:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples`
**Commit:** `7ce04d8`

Auditoría visual real con Playwright (viewport móvil 393×852, geolocalización
fija en Zarautz, Vite dev server en `http://localhost:5174/`) sobre
`src/ui/views/vista-ahora.js` y sus componentes (`pp-gauge.js`,
`pp-curva-marea.js`), más el header/tab-bar de `src/ui/shell/app-shell.js` y
la orquestación de `src/app.js`.

---

## Capturas

Todas en `screenshots/ahora/`.

| Archivo | Qué muestra |
|---|---|
| `00-loading-t500ms.png` / `t1000ms.png` | Pantalla completamente negra durante la carga inicial (sin caché) |
| `01-inicial.png` | Intento de captura "inicial" a los 4s — en este run concreto seguía en negro (ver bug #1) |
| `02-modo-spinning.png` | Modalidad Spinning (88/100, top factores Oleaje/Viento/Marea) |
| `02-modo-eging.png` | Modalidad Eging (58/100, label "Momento..." truncado) |
| `02-modo-surfcasting.png` | Modalidad Surfcasting (90/100, label "Moment..." truncado) |
| `03-info-expandido.png` / `03b-info-colapsado.png` | Botón "ⓘ" expande/colapsa el desglose de 9 factores |
| `04-curva-marea-hud.png` / `04b-curva-marea-hud-zoom.png` | Interacción hover sobre la curva de marea |
| `05-refrescar-justo-tras-click.png` / `05b-refrescar-estable.png` | Botón refrescar del header, antes/después |
| `06-modal-favorito.png` | Modal "Guardar favorito" (estrella del header) |
| `07-modal-especie.png` | Modal de ficha de especie (Salmonete) — foto casi invisible |
| `08-ver-todas-navega-especies.png` | Tras pulsar "Ver todas →": contenido cambia a Especies pero el tab bar sigue marcando "Ahora" |
| `08b-bug-tab-ahora-stuck-en-especies.png` | Tras pulsar la pestaña "Ahora" en ese estado: sigue mostrando Especies (no reacciona) |
| `08c-recuperado-via-prevision.png` | Recuperación: pasando por "Previsión" antes de "Ahora" sí funciona |
| `09b-score-panel-crop.png` | Zoom del número grande del índice (tipografía monoespaciada) |

---

## Acciones probadas

| Acción | Resultado | Notas |
|---|---|---|
| Carga inicial sin caché | **BUG** | Pantalla negra 1-6+ s sin ningún spinner/texto de carga (ver bug #1) |
| Cambiar a Spinning / Eging / Surfcasting | OK (con matiz) | Score, color, etiqueta y factores cambian coherentemente; label "Momento del día" se trunca (ver bug #2) |
| Botón "ⓘ" (desglose de factores) | OK | Expande/colapsa los 9 factores con pesos; toggle funciona en ambos sentidos |
| Hover/touch sobre curva de marea | OK | HUD muestra hora + nivel + flecha de tendencia en el punto correcto |
| Botón refrescar (header) | OK | Dispara `pp-refrescar` → `refrescarManual()`; el icono tiene clase `.girando` (animación CSS) confirmada en código; sin confirmación textual de éxito/frescura |
| Botón favorito (estrella) | OK | Abre modal centrado "Guardar favorito" con input prellenado y editable; cierra con Escape/click fuera |
| Fila de especie ("Especies activas ahora") | OK | Abre modal de ficha (`abrirModalEspecie`) con temporada, mejores momentos, etc. |
| "Ver todas →" (especies) | **BUG** | Navega correctamente al contenido de Especies pero rompe el estado del tab bar (ver bug #3, severidad alta) |
| Foto de especie sin `foto` fotorrealista real | **BUG** | Salmonete usa una silueta negra sólida como "foto", casi invisible sobre el fondo oscuro del modal (ver bug #4) |

---

## Bugs y fallas encontradas

### 1. Pantalla en negro sin feedback durante la carga inicial — **CRÍTICO**

**Dónde:** `src/app.js:80-97` (función `iniciar()`) + `src/ui/views/vista-ahora.js:44-47` (`elCargando()`)

En una sesión sin caché en `localStorage` (primer uso, o cualquier apertura
cuyo caché haya caducado por `CONFIG.STALE_MS`), `iniciar()` llama a
`mostrarVista(st.vista)` (que solo hace `display:''`/`display:'none'` sobre
contenedores **vacíos**) y no invoca `renderVistaActiva()` hasta que:
- hay caché (`app.js:84-89`), o
- `refrescar()` resuelve el `await cargarTodo(...)` (`app.js:99-111`).

Como consecuencia, el estado `elCargando()` — el `<div class="pp-cargando">`
con spinner y texto "Cargando datos…" definido en `vista-ahora.js:44-47` —
**nunca llega a pintarse en el arranque en frío**, porque nada llama a
`renderAhora()` con `st.ctx` aún nulo en ese camino. Es, en la práctica,
código muerto para el caso que más importa (primera apertura).

Confirmado con capturas a t=500ms, 1000ms, 2000ms, 3000ms, 4000ms, 6000ms:
`.pp-cargando` nunca estuvo visible en ningún muestreo, y el área de
contenido fue negro puro hasta que los datos reales llegaron (entre 1 y 2s en
`localhost`, pero potencialmente mucho más en una conexión 4G real en costa,
que es el contexto de uso típico de esta app). El primer run de esta
auditoría capturó negro incluso a los 4000ms.

**Por qué importa:** el header (logo, spot, botones) se pinta correctamente
de inmediato, así que el usuario ve una app "viva" seguida de un rectángulo
negro sin ninguna señal de progreso — exactamente el patrón que se lee como
app rota/congelada, no como "cargando".

### 2. Etiqueta "Momento del día" truncada a "Moment…" — **MEDIO**

**Dónde:** `src/styles/theme.css:604-611` (`.pp-factor-mini-nombre { flex: 0 0 52px; ... white-space: nowrap; text-overflow: ellipsis; }`)

En el panel compacto de "top 3 factores" (`vista-ahora.js:223-249`), la
columna de nombre tiene un ancho fijo de 52px. Es suficiente para "Oleaje",
"Viento", "Marea", "Presión", "Corriente" pero no para "Momento del día",
que se trunca a "Moment…" (visible en `02-modo-eging.png` y
`02-modo-surfcasting.png`, donde "Momento del día" entra en el top-3). No
hay `title` ni ningún fallback accesible.

**Por qué importa:** "Momento del día" pesa hasta el 15-20% según modalidad
y es más probable que aparezca en el top-3 precisamente en las horas de
mayor actividad (amanecer/atardecer) — exactamente cuando el usuario más
prisa tiene por leer el dato correcto de un vistazo.

### 3. El tab bar se desincroniza del contenido tras "Ver todas →" — **CRÍTICO**

**Dónde:** `src/ui/views/vista-ahora.js:646-650` (dispatch directo de
`pp-cambiar-vista`) + `src/app.js:159-165` (`irA()`) + `src/ui/shell/app-shell.js:404-419` (getter/setter `vistaActiva`)

Reproducido y verificado paso a paso:

1. El enlace "Ver todas →" de "Especies activas ahora" dispara
   `pp-cambiar-vista` directamente sobre el DOM (bubbles+composed), sin pasar
   por el setter `shell.vistaActiva = id`.
2. `app.js` escucha ese evento a nivel de `shell` y sí llama a `irA('especies')`
   → el contenido cambia correctamente a la vista Especies (confirmado en
   `08-ver-todas-navega-especies.png`).
3. Pero `irA()` **nunca** actualiza `shell.vistaActiva`, así que
   `app-shell.js` sigue creyendo que `_vistaActiva === 'ahora'` y el botón
   "Ahora" del tab bar sigue marcado como activo (naranja) mientras la
   pantalla muestra Especies.
4. Al pulsar el botón "Ahora" del tab bar, el setter hace
   `if (id === this._vistaActiva) return;` (`app-shell.js:407`) — como para
   el shell nunca dejó de ser "ahora", **el clic no hace nada**. El usuario
   queda atrapado viendo Especies con el tab bar marcando Ahora
   (`08b-bug-tab-ahora-stuck-en-especies.png`).
5. Solo se recupera si primero pulsa otra pestaña (p.ej. "Previsión") y
   luego "Ahora" — confirmado en `08c-recuperado-via-prevision.png`.

**Por qué importa:** es una autocontradicción de la propia interfaz (la
navegación dice una cosa, el contenido muestra otra) en un flujo de
descubrimiento primario, no un caso límite. El mismo patrón de evento
(`pp-cambiar-vista` disparado directamente en vez de vía
`shell.vistaActiva`) es el contrato documentado en el propio comentario de
cabecera de `app-shell.js`, así que es plausible que otros enlaces internos
del mismo tipo en la app (menú, otras vistas) tengan el mismo problema —
alcance a confirmar fuera de esta auditoría de "Ahora".

### 4. La "foto" de Salmonete es en realidad una silueta negra casi invisible — **MEDIO**

**Dónde:** `src/domain/especies.js:193` (`foto: './iconos/png/salmonete.png'`)
+ asset `img/salmonete.png` / `www/img/salmonete.png` + `src/ui/views/vista-especies.js:89-102`

CLAUDE.md documenta explícitamente la convención (decisión sep-16):
`imagen` = silueta SVG para iconos, `foto` = PNG fotorrealista para el modal
de ficha, opcional y `null` solo en sargo. El asset real de Salmonete no es
una foto: es una silueta negra sólida sobre fondo transparente, con el mismo
tratamiento visual que el SVG de icono. Renderizada dentro de
`.pp-esp-modal-foto` (sin regla CSS propia, fondo heredado del modal
`var(--pp-panel)` = `#121212`), el resultado es negro-sobre-casi-negro:
prácticamente invisible (ver `07-modal-especie.png`).

**Por qué importa:** rompe la convención documentada del propio proyecto y,
en la práctica, hace que el modal de ficha de especie parezca tener una
imagen rota justo en la especie que el usuario esté consultando — un golpe
de credibilidad visual en el flujo de especies, que es uno de los
diferenciadores reales de la app.

### 5. Sin confirmación de éxito/frescura al refrescar — **BAJO**

**Dónde:** `src/ui/shell/app-shell.js:431-433` (`set refrescando`)

El único feedback del botón de refrescar es la clase CSS `.girando` sobre el
icono (confirmado en código, no observable de forma fiable en una captura
estática). No hay texto tipo "Actualizado hace 2s" ni toast de confirmación.
Para una pantalla llamada "Ahora", cuya promesa central es la frescura del
dato, la ausencia de una señal explícita de éxito es una fricción de
confianza menor pero real.

---

## Análisis PFD

Ejecutado con `perception-first-design:all` (los 3 modos: analyze / solve /
evaluate) sobre la pantalla completa, incorporando los 4 bugs anteriores
como hechos ya verificados por código. Resumen de los tres modos —
transcripción completa del razonamiento disponible bajo petición, aquí se
recoge la síntesis operativa:

### Analyze (descriptivo) — qué pasa perceptualmente al abrir "Ahora"

- **L0 (Carga cognitiva):** la estructura de tarjetas (resumen → modo →
  índice → marea → sol/luna → condiciones → especies) usa bien la
  divulgación progresiva (scroll + desglose colapsable de 9 factores), pero
  el hueco de carga sin *scaffold* (bug #1) es un vacío que el cerebro no
  puede archivar como "cargando" — lo archiva como "roto". El pico de
  información llega de golpe justo cuando esa ansiedad se resuelve, en vez
  de en rampa.
- **L1 (Primera impresión):** la tarjeta "resumen del día" es un ancla L1
  genuinamente buena — veredicto en mayúsculas + color, mejor ventana y
  tendencia de marea en el primer bloque, respondiendo la pregunta central
  antes de cualquier scroll. Pero esa fuerza se diluye dos veces: por el
  hueco negro previo (bug #1) y, río abajo, por la foto rota de especie
  (bug #4) en el flujo de mayor diferenciación de la app.
- **L2 (Fluidez de procesamiento):** sistema visual internamente muy
  coherente (un único acento, panel oscuro consistente, iconografía SVG
  monocroma uniforme, numeral monoespaciado reservado solo para el score).
  El truncamiento de "Momento del día" (bug #2) rompe exactamente el panel
  diseñado para ser la lectura más rápida.
- **L3 (Sesgo de percepción):** el desglose transparente de pesos por
  factor es un mecanismo de confianza real y poco común (la mayoría de apps
  esconden el "por qué" del score). Pero el desajuste del tab bar (bug #3)
  es un evento de error de predicción severo: el chrome de navegación —la
  parte de la UI que el usuario trata como verdad absoluta— se contradice a
  sí mismo en un flujo de descubrimiento primario.
- **L4 (Arquitectura de decisión):** el "resumen del día" acierta en
  identificar que la decisión real no es un clic sino una acción offline
  (salir a pescar o no) y la resuelve bien arriba del todo. Pero el cambio
  de modalidad no da feedback garantizado dentro del viewport tras hacer
  scroll, y el refresco no confirma éxito (bug #5) — fricciones menores en
  la arquitectura de decisión secundaria.
- **Compuestos integrativos:** (A) L0→L1→L3 encadenan en una única
  narrativa de erosión de confianza ("esta app no siempre hace lo que dice")
  particularmente costosa en una herramienta cuyo valor es la fiabilidad de
  datos en tiempo real con implicación de seguridad real. (B) Asimetría de
  bloqueo: un usuario que sufre el bug #3 una vez probablemente deje de usar
  "Ver todas →" y confíe solo en el tab bar — el cambio de comportamiento es
  instantáneo, pero recuperar la confianza en ese enlace requeriría muchos
  usos limpios repetidos.

### Solve (prescriptivo) — qué tendría que ser cierto para que funcione

- **R1 (L0):** debe existir un *scaffold* de carga visible desde t=0 tanto en
  arranque frío como en refetch por caché caducado — hoy `renderVistaActiva()`
  no se llama hasta que los datos resuelven.
- **R2 (L1):** el primer frame tras el header debe contener algo reconocible
  (no negro puro), y todo asset de imagen debe ser distinguible de su propio
  fondo al contraste real del tema.
- **R3 (L2):** ninguna etiqueta en una columna de ancho fijo puede truncarse
  en silencio sin `title`/alternativa — menos aún en el panel diseñado para
  ser la lectura más rápida.
- **R4 (L3):** el estado "vista actual" debe tener una única fuente de
  verdad; hoy `shell._vistaActiva` (chrome) y `st.vista` (contenido,
  `app.js`) son dos variables independientes que pueden desincronizarse —
  causa raíz exacta del bug #3.
- **R5 (L4):** toda acción que cambia datos mostrados (modalidad, refresco)
  debe dar feedback dentro del viewport actual, y el refresco debe reportar
  éxito/frescura explícitamente.

**Solución mínima derivada:** una única corrección arquitectónica —enrutar
todo disparo de `pp-cambiar-vista` a través de `shell.vistaActiva = id` en
vez de despachar el evento crudo desde las vistas— satisface R4 de raíz (no
es un parche visual, es una corrección de propiedad de estado). R1 se
resuelve llamando a `renderVistaActiva()` con un estado de carga *antes* del
primer fetch, no solo tras resolverlo. R2/R3 son fixes pequeños e
independientes (CSS + asset). R5 necesita una pieza propia (toast/timestamp
+ scroll-into-view o resaltado tras cambiar de modalidad). El hallazgo no
obvio: bajo la superficie de "bugs visuales sueltos" hay un único problema
de propiedad de estado (R4) que es la causa raíz más profunda, no la más
visible.

### Evaluate (puntuado) — contra la rúbrica de 5 capas de PFD

Sin framework de diseño web detectado (Ionic Web Components + CSS a medida,
no Tailwind/WordPress/Shopify) → evaluación contra los principios generales
de percepción, sin perfil de framework específico.

| Capa | Score bruto | Cap aplicado | Score final | Motivo del cap |
|---|---|---|---|---|
| Foundation (L0) | 62 | — | **62** | Sin cap (≥40); estructura y divulgación progresiva sólidas, penalizado por el hueco de carga sin *scaffold* |
| L1 · Primera impresión | — | Crítico → 30 | **30** | Violación crítica autopropia: pantalla negra bajo un header funcional coincide casi literalmente con la señal de fallo de la rúbrica ("diseño que dispara reconocimiento de patrón spam/abandonado") |
| L2 · Fluidez | 68 | L1<40 → cap 50 | **50** | Sistema visual muy coherente, un Major (truncamiento) |
| L3 · Sesgo de percepción | — | Crítico → 30 | **30** | Transparencia de factores es una fortaleza real, pero el autocontradicción del tab bar es una violación crítica que anula la capa |
| L4 · Arquitectura de decisión | 70 | L1<40 → cap 40 | **40** | "Resumen del día" es una arquitectura de decisión sofisticada y específica del dominio; dos Major (feedback fuera de viewport, refresco sin confirmación) |

**Overall = (62×1.5 + 30 + 50 + 30 + 40) / 5.5 = 243 / 5.5 ≈ 44/100** (banda
"Poor: violaciones críticas presentes" de la rúbrica — pero ver nota abajo).

**Nota de interpretación (importante):** el número de 44 refleja
mecánicamente cómo el marco de dependencias de PFD castiga violaciones
críticas en capas bajas — no refleja que el diseño subyacente sea pobre. La
calidad de diseño *bruta* (antes de aplicar los caps) ronda 62-70 en casi
todas las capas, comparable al anchor "good" (65-75) de la rúbrica. Son
exactamente **2 bugs concretos y arreglables** (pantalla negra en carga,
desincronización del tab bar) los que activan los caps críticos y arrastran
el resultado a la banda "Poor". Es, de hecho, el hallazgo más útil de la
auditoría: arreglar esos 2 bugs no es "una mejora más" en una lista de
deseos — es lo único que impide que el resto del trabajo de diseño (que ya
es bueno) se perciba como tal.

**Veredicto explícito — ¿"ai slop" genérico o personalidad propia?**
**No es "ai slop".** Un dashboard SaaS genérico no incluiría: pesos
porcentuales reales por factor con desglose de 9 variables, columnas
separadas "Mayor actividad"/"Menor actividad" solunar, coeficiente de marea
(`coef. ~88`) y amplitud junto al tipo de marea, ni fichas de especie con
"mejores momentos (72h)" y motivo textual de actividad. Es contenido de
dominio real, no relleno intercambiable, y el vocabulario en español
(`mareas`, `solunar`, `bajamar`, `coef.`) refuerza que es una app pensada,
no traducida de una plantilla. Lo que le falta para tener **más**
personalidad propia (más allá de los bugs):
1. La paleta "dark mode + un acento naranja" es, por sí sola, indistinguible
   de una fintech o una app de fitness — sin el contenido de dominio, el
   sistema de color no comunicaría "pesca" por nada intrínseco a él. Un
   segundo color o textura asociada al mar (no solo el degradado naranja de
   la curva de marea) ayudaría.
2. Las siluetas SVG de especies son funcionales pero genéricas — no hay
   ningún tratamiento ilustrativo propio que las distinga de un stock de
   iconos de pesca cualquiera.
3. Toda la tipografía es system-ui excepto el score (monoespaciada) — no hay
   ninguna elección tipográfica que aporte carácter a los titulares
   ("BUENAS CONDICIONES", nombres de especie); es la elección más segura y
   más anónima posible.

---

## Plan de mejora priorizado

### Quick win (horas, bajo riesgo)

1. **Fix CSS del truncamiento "Momento del día"** — `src/styles/theme.css:604-611`.
   Ampliar `.pp-factor-mini-nombre` (quitar el `flex: 0 0 52px` fijo o
   subirlo, p. ej. a `flex: 0 0 78px` con `font-size` ligeramente menor) y
   añadir `title` con el nombre completo como fallback accesible.
2. **Sustituir/corregir el asset `img/salmonete.png`** — no es código, es un
   asset de contenido: reemplazar por una foto real o, si no existe, dejar
   `foto: null` en `src/domain/especies.js:193` para que el modal no
   intente pintar una imagen invisible (mismo tratamiento que sargo).
3. **Confirmación textual de refresco** — añadir un texto breve tipo
   "Actualizado hace Xs" en `app-shell.js` (ya existe `set actualizado`,
   hoy deshabilitado a propósito — recuperar esa señal con un formato más
   discreto que el timestamp original, o un toast corto).

### Medio (días, cambios contenidos)

4. **Unificar la fuente de verdad de "vista actual"** —
   `src/ui/views/vista-ahora.js:646-650` no debería despachar
   `pp-cambiar-vista` directamente; debería invocar algo equivalente a
   `shell.vistaActiva = 'especies'` (o el evento debe ir acompañado
   siempre de la actualización del estado del shell). Requiere revisar
   `src/app.js:159-165` (`irA`) y `src/ui/shell/app-shell.js:404-419` para
   que exista un único punto de escritura de "vista activa", y auditar si
   otros disparos de `pp-cambiar-vista` en el resto de la app (menú lateral,
   otras vistas) tienen el mismo patrón roto.
5. **Loading skeleton real en el arranque frío** —
   `src/app.js:80-97` (`iniciar()`): llamar a `renderVistaActiva()` con un
   estado de carga explícito inmediatamente tras `mostrarVista(st.vista)`,
   antes de esperar a `cache` o `refrescar()`, para que `elCargando()` (ya
   escrito en `vista-ahora.js:44-47`) deje de ser código muerto en el
   camino más común (primera apertura / caché caducada).
6. **Feedback visible del cambio de modalidad** — al pulsar un chip en
   `selectorModo()` (`vista-ahora.js:156-179`), considerar un scroll suave
   hacia `cardIndiceFull` o un resaltado breve de la tarjeta del índice
   si queda fuera del viewport, para que el cambio de score sea
   perceptible incluso tras hacer scroll.

### Grande (rediseño / trabajo de más alcance)

7. **Pase de personalidad visual** (no bug, decisión de producto): explorar
   un segundo acento o textura asociada al mar más allá del naranja de
   marea, y una tipografía de titulares propia para "BUENAS CONDICIONES" /
   nombres de especie, para reducir la dependencia total en system-ui +
   monoespaciada. Requiere alinear con `www/css/app.css` (legacy) si se
   quiere mantener coherencia entre ambas apps.
8. **Auditoría del patrón `pp-cambiar-vista` en toda la app** — confirmar si
   el bug #3 es un caso aislado de "Ver todas →" o si el mismo patrón
   (evento disparado sin pasar por `shell.vistaActiva`) afecta a otros
   enlaces internos (cuaderno, trofeos, perfil) fuera del alcance de esta
   auditoría de "Ahora".

---

## Preguntas abiertas

- ¿Cuánto tarda realmente `cargarTodo()` contra Open-Meteo en una conexión
  4G en costa (no en `localhost`)? Esta auditoría solo pudo medir contra el
  dev server local; el hueco negro real en campo podría ser bastante mayor
  a los 1-6s observados aquí.
- ¿El patrón de navegación roto (bug #3) se reproduce también desde el menú
  lateral (`ion-menu`) o solo desde enlaces "Ver todas →"/similares
  incrustados en el contenido? No se auditó fuera de la pantalla "Ahora".
- ¿Hay alguna razón intencional por la que `set actualizado()` en
  `app-shell.js:429` es un no-op ("el timestamp no aporta info útil", según
  el propio comentario)? Si fue una decisión de producto deliberada, la
  recomendación de añadir confirmación de refresco (quick win #3) debería
  revisarse con quien tomó esa decisión en vez de revertirla sin más.
- ¿Existe ya un asset de foto real para Salmonete en algún otro lugar del
  repo (por ejemplo, pendiente de subir) o hay que encargarlo/buscarlo de
  cero?
