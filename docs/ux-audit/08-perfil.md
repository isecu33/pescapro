# Perfil

**Fecha:** 2026-09-25
**Rama:** `feature/cuaderno-fotos-multiples` · **Commit:** `7ce04d8`
**Vista auditada:** `src/ui/views/vista-perfil.js` (553 líneas) + `src/ui/util/perfil-tarjeta.js`, accesible solo desde el menú lateral (hamburguesa) → "Mi perfil".
**Método:** Playwright contra `http://localhost:5174/` (viewport móvil 393×852, geolocalización simulada en Zarautz), perfil local recién creado (sin capturas en el cuaderno). 24 capturas + un script de investigación adicional para aislar un bug de navegación.

---

## Capturas

Todas en `docs/ux-audit/screenshots/perfil/`:

| # | Archivo | Qué muestra |
|---|---|---|
| 01 | `01-menu-abierto.png` | Menú lateral abierto, cabecera de perfil compacta + chips de stats + ítem "Mi perfil" |
| 02 | `02-inicial.png` | Vista Perfil inicial, perfil vacío por defecto |
| 03 | `03-editar-modal-vacio.png` | Modal "Editar perfil" recién abierto |
| 04 | `04-editar-nombre-largo-usuario-invalido.png` | Nombre truncado a 24 car. + preview de @usuario con espacios/mayúsculas sin validar |
| 05 | `05-editar-bio-contador.png` | Bio en el límite (160/160) con contador visible |
| 06 | `06-editar-avatar-subido.png` | Avatar tras subir una imagen de prueba |
| 07 | `07-editar-banner-swatch.png` | Cambio de banner a un degradado predefinido |
| 08 | `08-tras-cancelar.png` | Tras pulsar la X: todos los cambios (nombre, bio, banner, avatar) descartados |
| 09 | `09-editar-listo-para-guardar.png` | Segunda edición, datos válidos, previa a Guardar |
| 10 | `10-tras-guardar.png` | Perfil guardado con datos reales — **aquí aparece el bug de tab-bar** (ver hallazgos) |
| 11 | `11-editar-error-nombre-vacio.png` | Error inline al intentar guardar con nombre vacío |
| 12 | `12-stats-y-secciones.png` | Fila de 4 estadísticas + secciones inferiores |
| 13 | `13-destacadas-vacio.png` | "Capturas destacadas" en estado vacío (sin cuaderno) |
| 14 | `14-logros-vacio.png` | Grid de 21 logros, ninguno conseguido |
| 15 | `15-clan-vacio.png` | Sección Clan sin clan — botones "Fundar clan" / "Unirme con código" |
| 16 | `16-modal-fundar-clan-vacio.png` | Modal "Fundar clan" vacío |
| 17 | `17-modal-fundar-clan-relleno.png` | Etiqueta escrita en minúsculas con símbolos, sin normalizar en vivo |
| 18 | `18-clan-creado.png` | Clan creado, etiqueta normalizada a "ESPN" |
| 19 | `19-modal-invitar.png` | Modal "Invitar al clan" con código generado |
| 20 | `20-modal-invitar-copiado.png` | Tras pulsar "Copiar" sin permiso de portapapeles: fallback de selección de texto activado |
| 21 | `21-tras-salir-clan.png` | Tras "Salir del clan" (confirm nativo aceptado): vuelta limpia al estado sin clan |
| 22 | `22-modal-unirse-error.png` | "Unirme con código" con código inválido: error inline claro |
| 23 | `23-menu-reabierto-tras-perfil.png` | Menú reabierto: cabecera actualizada, ítem "Mi perfil" resaltado correctamente |
| 24 | `24-tras-cerrar-menu.png` | Menú cerrado por click fuera: retorno limpio a la vista Perfil |

---

## Acciones probadas

| Acción | Resultado | Captura |
|---|---|---|
| Abrir menú lateral → Mi perfil | OK, navega a la vista Perfil | 01, 02 |
| Abrir modal "Editar perfil" | OK | 03 |
| Escribir nombre de 40 car. | Truncado correctamente a 24 (maxlength real, verificado carácter a carácter) | 04 |
| Escribir usuario con espacios/mayúsculas/símbolos | Se acepta en el campo y en la preview; sin contador ni validación en vivo | 04 |
| Rellenar bio hasta el límite | Contador 160/160 correcto, borde de aviso | 05 |
| Subir foto de avatar | Sustituye las iniciales por `<img>`; pipeline subir→comprimir→guardar→leer funciona end-to-end | 06 |
| Elegir banner predefinido tras subir foto propia | Cambia correctamente y desactiva el estado "foto" | 07 |
| Cancelar edición (botón X) | Descarta TODOS los cambios pendientes (nombre, bio, banner, avatar); perfil queda intacto | 08 |
| Guardar edición válida | Persiste nombre/usuario/bio; tarjeta y menú se actualizan | 09, 10 |
| Guardar con nombre vacío | Error inline "El nombre no puede estar vacío", no cierra el modal | 11 |
| Ver estadísticas (capturas/especies/logros/spots) | Alineación correcta, sin overflow, 4 columnas | 12 |
| Ver "Capturas destacadas" sin cuaderno | Nota vacía apropiada | 13 |
| Ver grid de 21 logros bloqueados | Se renderiza completo; **3 logros comparten el nombre "Día perfecto"** | 14 |
| Fundar clan | Nombre + etiqueta (con símbolos/minúsculas) → etiqueta normalizada a mayúsculas alfanuméricas al guardar | 16, 17, 18 |
| Invitar al clan → Copiar código | Sin permiso de portapapeles en el entorno de test, cae al fallback de `.select()` correctamente (botón no cambia a "Copiado ✓", como es esperable sin el permiso) | 19, 20 |
| Salir del clan | Dispara `window.confirm`, interceptado y aceptado; vuelve limpiamente al estado sin clan | 21 |
| Unirse con código inválido | Error inline "No es un código de clan de PescaPro" | 22 |
| Reabrir menú tras editar perfil | Cabecera y stats del menú se refrescan; ítem "Mi perfil" queda resaltado | 23 |
| Cerrar menú con click fuera | Cierre limpio, contenido de Perfil intacto debajo | 24 |

---

## Bugs y fallas encontradas

### 1. El tab-bar inferior muestra "Previsión" activo mientras se está en Perfil — SEVERIDAD: ALTA

**Archivo:** `src/ui/shell/app-shell.js:404-419` (`set vistaActiva` / `_actualizarTabSeleccionado`), en combinación con `VISTAS_MENU` (línea 43-44).

Perfil no es una pestaña del tab-bar (`VISTAS_MENU = ['perfil']`), así que al navegar a ella ningún `ion-tab-button` debería quedar marcado como seleccionado. Verificado por consola (`shell.vistaActiva === 'perfil'` y los 6 botones con `selected=false`), el estado lógico es correcto. Sin embargo, **visualmente el tab-bar resalta "Previsión" en naranja** — de forma 100% reproducible — mientras el usuario está en Perfil, incluida justo tras guardar una edición (captura 10, 12, 15, 18). Reproducido también con un script mínimo aislado (sin edición, solo navegar a Perfil) y confirmado que un tap sobre una pestaña real ("Ahora") autocorrige el estado visual y el lógico al instante.

Es decir: el bug es puramente visual/de renderizado de `ion-tab-bar`/`ion-tab-button` (probablemente un desajuste entre el atributo `selected` que la app gestiona a mano y el estado interno `selectedTab` que Ionic/Stencil mantiene por su cuenta para el indicador, dado que esta pantalla nunca contempló un estado "ninguna pestaña activa"), no un error en la lógica de navegación de la app. Como Perfil solo se alcanza desde el menú, cada visita dejará el tab-bar mintiendo sobre la ubicación real del usuario hasta que este toque una pestaña real.

**Impacto:** confunde sobre la ubicación real dentro de la app; rompe la señal de wayfinding en el 100% de las visitas a Perfil.

### 2. La vista previa en vivo del editor no valida el @usuario igual que el guardado — SEVERIDAD: MEDIA

**Archivos:** `src/ui/views/vista-perfil.js:470-480` (`pintarPreview` dentro de `modalEditar`) vs. `src/domain/perfil.js:76-82` (`actualizar`, con `RE_USUARIO`).

`pintarPreview()` solo hace `trim().replace(/^@+/, '').toLowerCase()` sobre el usuario para la tarjeta de vista previa, mientras que `actualizar()` exige `^[a-z0-9_.]{3,20}$`. Al escribir `"Usuario Con Espacios!!"` la preview lo muestra tal cual (minúsculas, con espacios y "!") como si fuera un @usuario válido (captura 04); al guardar, ese mismo valor sería rechazado por `RE_USUARIO`. La vista previa "en vivo" —pensada para dar confianza WYSIWYG antes de guardar— puede mostrar algo que el guardado luego rechaza o normaliza de forma distinta, rompiendo el contrato implícito del propio patrón de preview.

### 3. Tres logros bloqueados comparten el nombre "Día perfecto" sin diferenciador — SEVERIDAD: BAJA-MEDIA

**Evidencia:** capturas 14, 15, 18 (grid de logros, tres hexágonos consecutivos rotulados "Día perfecto"). Archivo probable: catálogo de logros en `src/domain/records/logros.js` (no auditado línea a línea en esta sesión; el hallazgo es visual desde `vista-perfil.js:222-232`, que solo pinta `l.nombre` tal cual). Sin capturas en el cuaderno no se puede confirmar si son tiers progresivos (I/II/III) sin marcador visible, o una duplicación real de datos. En cualquier caso, de cara al usuario son indistinguibles.

### 4. Sin feedback de formato en vivo para nombre/usuario/etiqueta de clan (a diferencia de bio) — SEVERIDAD: BAJA

**Archivo:** `src/ui/views/vista-perfil.js:337-360` (`campoTexto`). El contador de caracteres (`pp-perfil-contador`) solo se añade cuando `opts.multilinea` es true — hoy solo bio lo tiene, aunque nombre (24), usuario (21) y etiqueta de clan (5) también tienen `maxLength` estricto. Al escribir en esos campos el usuario simplemente deja de poder teclear más, sin indicación de cuánto le queda ni de por qué. La etiqueta de clan además se escribe en minúsculas/con símbolos (captura 17, `"espn!"`) y solo se normaliza a mayúsculas alfanuméricas (`"ESPN"`) al fundar el clan (`limpiarEtiqueta` en `src/domain/perfil.js:140-142`), sin preview de cómo quedará.

### 5. Confirmación de "Copiado" en Invitar al clan depende silenciosamente del permiso de portapapeles — SEVERIDAD: BAJA

**Archivo:** `src/ui/views/vista-perfil.js:402-422` (`modalInvitarClan`). Cuando `navigator.clipboard.writeText` falla o no está disponible, el fallback (`codigo.input.select()`) funciona correctamente, pero el botón sigue diciendo "Copiar" sin ningún indicio de que el usuario ahora debe copiar manualmente el texto ya seleccionado. En un dispositivo real esto probablemente nunca se dispara (el permiso suele concederse), pero es una ruta degradada silenciosa.

### No-bug / nota de método

Durante la prueba de subida de avatar (captura 06) el círculo quedó en negro sólido en vez de mostrar la imagen de prueba: se confirmó que la imagen fixture usada (PNG 1×1 escala de grises+alfa) no era un píxel rojo opaco como se pretendía, así que el negro es efecto de aplanar alfa sobre fondo oscuro al comprimir a JPEG, no un fallo de la app — el pipeline subir→comprimir→guardar→leer se completó correctamente (las iniciales desaparecieron y se renderizó una `<img>`).

---

## Análisis PFD

*Corpus cargado: `pfd-layer-rubric.md`, `constitutional-constraints.md`, `anti-patterns.md`, `output-schema.md` del plugin `perception-first-design` v0.7.0. Se omitió la carga completa de los 5 ejemplos ancla y del corpus extendido de psicología por eficiencia (esta auditoría no es una publicación PFD formal); las citas usadas son las que ya trae el rubric/constraints cargados. Ningún perfil de sistema de diseño web (Tailwind/WordPress/Shopify) aplica — es una app móvil Capacitor con CSS propio — así que Evaluate procede con los principios generales, tal como indica el propio protocolo para ese caso.*

### Analyze (descriptivo) — 5 consecuencias en cascada, 2 compuestos integrativos

**Pregunta:** ¿por qué esta pantalla se percibe (o no) como "hecha a medida" para pescadores en vez de un CRUD genérico, y qué produce esa impresión capa por capa?

#### 1. La carga cognitiva se paga completa en cada edición, sin atajos [Cognitive Load]
*Cambiar solo el nombre obliga a procesar visualmente 7 controles (nombre, usuario, bio, 5 banners + subida, avatar) aunque solo quieras tocar uno.*

La memoria de trabajo sostiene 3-5 elementos simultáneos (Cowan, 2010) y ese coste se paga incluso por ruido no atendido (Hassin et al., 2009). El modal "Editar perfil" agrupa nombre+usuario+bio+banner+avatar en una sola hoja sin pasos ni colapso, mitigado parcialmente por subtítulos de sección (NOMBRE/USUARIO/BIOGRAFÍA/BANNER/FOTO DE PERFIL) pero sin progressive disclosure real. Para un usuario nuevo el coste es tolerable (novedad compensa); para uno recurrente que solo quiere corregir un typo, paga el escaneo completo cada vez porque no existe una edición rápida de un solo campo.

**Qué pasa:** el coste de carga se concentra en el FLUJO DE EDICIÓN, no en la lectura — la tarjeta pública en modo lectura es liviana y clara; es el modal el que arrastra el patrón "formulario largo" que más se parece a un CRUD genérico.

**Citas:** Cowan (2010) para la capacidad de 3-5 elementos en memoria de trabajo; Hassin et al. (2009) para el coste de procesamiento no consciente.

#### 2. La personalidad de marca depende de contenido que un perfil nuevo todavía no tiene [First Impression]
*Un perfil recién creado muestra el mismo degradado e iniciales genéricas ("PL") que cualquier app; la "sensación de pesca" llega después, con datos reales.*

Los juicios de atractivo se forman en 50ms (Lindgaard et al., 2006) y ese juicio inicial tiñe todo lo demás (Kurosu & Kashimura, 1995). La tarjeta pública en cabecera es el elemento de mayor apalancamiento para la pregunta "hecho a medida vs. genérico": los 5 degradados de banner tienen nombres costeros/pesqueros (Atardecer, Océano, Temporal, Arrecife, Noche) — una elección de marca real, no un azul de SaaS por defecto. Pero en el estado vacío (el que capturan la mayoría de auditorías, reseñas o primeras aperturas) solo se ve el degradado + iniciales "PL" + "Pescador local": la parte más "de pesca" de la tarjeta (insignias, clan, capturas destacadas) todavía no existe.

**Qué pasa:** la sensación de "hecho a medida" es dependiente del estado de uso — fuerte para un usuario veterano con insignias y clan, débil exactamente en el momento en que más se evalúa la app (primera apertura, capturas de pantalla, reseñas).

**Citas:** Lindgaard et al. (2006) para la primacía del juicio de 50ms; Kurosu & Kashimura (1995) para el halo estética-usabilidad.

#### 3. La fluidez de procesamiento es alta a nivel de sistema, pero se rompe exactamente donde más importa (guardar tu identidad) [Processing Fluency]
*Todo el perfil comparte un mismo lenguaje visual (tarjetas oscuras, acento naranja, hexágonos), pero la vista previa del editor puede mostrar un @usuario que el guardado real no acepta igual.*

Lo fácil de procesar se siente más verdadero y confiable (Reber & Schwarz, 1999), y ese efecto exige coherencia entre lo que se muestra y lo que ocurre (Spence, 2011). El sistema de tarjetas oscuras + acento naranja + iconografía hexagonal se mantiene idéntico en tarjeta, stats, destacadas, logros y los 4 modales — señal fuerte de "una sola mano" diseñó todo. Pero se verificó directamente (bug #2 arriba) que la previa en vivo del @usuario no aplica la misma validación que el guardado, y que nombre/usuario (con límite duro de caracteres, igual que bio) no muestran contador mientras que bio sí.

**Qué pasa:** para entradas bien formadas la fluidez es alta y coherente; para casos límite se rompe justo en la pantalla de mayor confianza requerida —editar tu identidad pública—, produciendo un "por qué cambió esto" que se siente más a formulario sin terminar que a producto pulido.

**Citas:** Reber & Schwarz (1999) para fluidez de procesamiento como señal de verdad; Spence (2011) para coherencia cross-modal como mecanismo de confianza.

#### 4. Un contenido repetido en el grid de logros rompe la predicción de "cada insignia es única" [Perception Bias]
*Tres logros bloqueados seguidos se llaman igual ("Día perfecto"), lo que en un vistazo rápido se lee como plantilla, no como contenido diseñado.*

El sistema predice constantemente el siguiente estímulo; una violación de esa predicción dispara atención (Clark, 2013), y la coherencia visual/de contenido opera como una señal de confianza directa, no argumental (Seckler et al., 2015). 18 de los 21 logros observados tienen nombres ricos y específicos del dominio pesquero ("Leyenda del espigón", "Maestro del eging", "Guardián del faro", "Ave nocturna"): esto es un trabajo de copy genuino, no genérico. Los 3 "Día perfecto" consecutivos rompen ese patrón exactamente para el usuario que más escanea la lista completa: el jugador completista, el segmento con más probabilidad de formar y compartir una opinión sobre la app.

**Qué pasa:** para la mayoría de usuarios casuales, invisible; para el segmento de mayor compromiso —el que el propio sistema de logros está diseñado para enganchar— es la señal más concreta de "esto se generó, no se diseñó" en toda la pantalla.

**Citas:** Seckler et al. (2015) para coherencia visual como impulsor directo de confianza; Clark (2013) para violaciones de procesamiento predictivo capturando atención.

#### 5. Las etiquetas de acción son específicas y honestas, incluida la revelación del mecanismo sin servidor [Decision Architecture]
*Cada botón dice exactamente lo que hace ("Fundar clan", "Unirme con código", "Salir del clan"), y el modal de invitar explica honestamente que es solo un código para pegar en un chat — no promete infraestructura que no existe.*

Estructurar el entorno para que la opción correcta sea la más fácil (Thaler & Sunstein, 2008) exige etiquetas que predigan su destino; la detectabilidad de una CTA frente al ruido sigue la teoría de detección de señales (Green & Swets, 1966). Ninguna etiqueta observada es un "Enviar/OK/Aceptar" genérico salvo "Guardar"/"Listo" (aceptables por contexto de modal). La acción destructiva ("Salir del clan") está codificada en color distinto (rojo/peligro) y protegida por confirmación nativa, verificado directamente. El flujo de invitar a clan explica honestamente el mecanismo real (copiar/pegar un código, sin servidor) en vez de sugerir infraestructura social en tiempo real inexistente.

**Qué pasa:** en copy y flujo, esta pantalla es notablemente menos genérica que un CRUD estándar — declara sus límites reales en vez de disimularlos, lo cual es exactamente lo contrario del patrón "ai slop" (que tiende a prometer de más con copy vaga). El contraste con los hallazgos de las capas 1-4 sugiere un veredicto dividido: bespoke en copy/flujo, con costuras genéricas en la fontanería de formularios y en el fallback de wayfinding.

**Citas:** Thaler & Sunstein (2008) para arquitectura de elección; Green & Swets (1966) vía teoría de detección de señales para especificidad de etiquetas/CTAs.

### Compuestos integrativos

**A. [Cross-layer: L1 × L3] Penalización del estado vacío.** *Las dos capas que más aportan "esto es una app de pesca, no un formulario genérico" —la personalidad del banner (L1) y la variedad de logros (L3)— dependen ambas de contenido que un perfil recién creado todavía no tiene.* El nombre de los degradados y las insignias conseguidas son la textura de dominio en L1; la variedad de logros desbloqueados lo es en L3. Ambas están vacías el primer día. El momento con más probabilidad de ser evaluado externamente (primera apertura, reseña, esta misma auditoría) es también el momento en que la personalidad de dominio es más débil, sesgando estructuralmente el veredicto hacia "formulario genérico" para cualquiera que juzgue la app antes de acumular uso real.

**Qué pasa:** la calidad del diseño del estado vacío de Perfil determina desproporcionadamente el veredicto "hecho a medida vs. genérico" para cualquiera que evalúe la app pronto — exactamente la situación de esta auditoría.
**Citas:** Predicción aplicada; sin cita directa del framework cargado. Adyacente más cercana: Lindgaard et al. (2006) por la primacía del primer impacto.

**B. [Cross-layer: L0 × L2] Asimetría de bloqueo por desconfianza en la preview.** *Un usuario que sea "traicionado" una vez por el desajuste preview/validación del @usuario probablemente deje de confiar en la vista previa en general, y a partir de ahí re-verifique cada edición manualmente — lo contrario de lo que un modal con preview en vivo debería comprarle.* La confianza en una preview WYSIWYG se construye sesión a sesión; una experiencia desconfirmatoria puede generalizarse rápido ("no me fío de esta preview"), mientras que reconstruir esa confianza es más lento — la característica más sofisticada del modal (la preview en vivo) tiene valor esperado negativo precisamente para los usuarios más exploratorios/comprometidos.

**Qué pasa:** convierte un diferenciador de producto en un pasivo para el segmento más comprometido, justo el que más detalla revisa.
**Citas:** Predicción aplicada; sin cita directa del framework cargado. Adyacente más cercana: Reber & Schwarz (1999) sobre el vínculo fluidez-confianza, aplicado en sentido inverso (la disfluencia/contradicción erosiona confianza).

*Hallazgos iniciales. Repite en un consecuente concreto, cita más a fondo, cambia a solve/evaluate, o pregunta lo que necesites profundizar.*

### Solve (prescriptivo) — R1-R5 y solución

**Problema de diseño:** el usuario abre Perfil esperando ver y moldear su identidad pública de pescador — no rellenar un formulario de cuenta. Lo que impide que se perciba plenamente como "hecho a medida": partes de la pantalla (estado vacío, campos de texto sin feedback de formato, previa que no coincide con la validación real) se comportan como si vinieran de una plantilla genérica de perfil de usuario, no de algo diseñado para el dominio de pesca/clanes/logros.

**R1 (L0, Cognitive Load):** Editar un solo campo no debe obligar a procesar visualmente selectores de banner/avatar/contador que no interesan en ese momento. *Requisito:* el editor DEBE ofrecer una edición rápida de un solo campo, o una agrupación/colapso más marcado dentro del modal, para que la carga extrínseca no infle la carga intrínseca de un cambio puntual.
**Citas:** Cowan (2010); Hassin et al. (2009).

**R2 (L1, First Impression):** La identidad de dominio de la pantalla no debe depender de contenido generado por el usuario para registrarse al abrir. *Requisito:* el estado vacío/por defecto DEBE tener una firma visual de pesca más allá del degradado genérico + iniciales, para que el primer impacto lea "app de pesca" incluso con cero contenido.
**Citas:** Lindgaard et al. (2006); Kurosu & Kashimura (1995).

**R3 (L2, Processing Fluency):** Todo campo con límite estricto de caracteres DEBE exponer el mismo tipo de feedback, y cualquier preview en vivo DEBE reflejar exactamente la validación que aplica el guardado. *Requisito:* añadir contador a nombre/usuario igual que a bio, y hacer que la normalización de la preview invoque el mismo validador que `actualizar()`.
**Citas:** Reber & Schwarz (1999); Spence (2011).

**R4 (L3, Perception Bias):** Ningún elemento generado desde una lista fija del sistema (logros) puede mostrar una etiqueta visible idéntica a la de un hermano sin un diferenciador, ni siquiera en estado bloqueado. *Requisito:* si varios logros comparten nombre por diseño (tiers), DEBEN llevar un sufijo o marcador visual distinto.
**Citas:** Seckler et al. (2015); Clark (2013).

**R5 (L4, Decision Architecture):** Las acciones destructivas/de alto impacto DEBEN mantenerse visual y semánticamente distintas de las constructivas en todo el flujo, y cualquier hueco de mecanismo (sin servidor, sin verificación) DEBE declararse en el copy en el momento de decidir. *Requisito:* preservar el patrón ya presente en el flujo de clan (color de peligro, confirmación, copy honesto) al añadir funcionalidad nueva, y extender la misma disciplina de wayfinding al resto de la app — incluyendo que el tab-bar refleje siempre con precisión dónde está el usuario, aunque esté en una vista fuera del tab-bar.
**Citas:** Thaler & Sunstein (2008); Green & Swets (1966).

**Solución que satisface R1-R5 simultáneamente:** no exige un rediseño. Son cuatro intervenciones acotadas: (a) unificar el contador de nombre/usuario/bio y enrutar la normalización de la preview por el mismo validador que usa `actualizar()` — cierra R3, barato, aislado en `modalEditar`/`campoTexto`; (b) autoría de un estado vacío con más textura pesquera para el bloque de identidad — cierra R2; (c) diferenciar los 3 logros "Día perfecto" en el catálogo de datos — cierra R4, fuera de `vista-perfil.js`; (d) introducir una edición rápida de un solo campo, o aceptar que el agrupamiento actual por subtítulos es suficiente SI se resuelve R3 primero, ya que buena parte de la señal de "genérico" venía de rupturas de fluidez (L2) más que de la carga bruta (L0) en sí misma.

**Prioridad recomendada:** R3 y R4 primero (baratos, alta señal, causa directa observada en esta auditoría), R2 segundo, R1 opcional/baja prioridad.

**Contraste con lo existente:** el flujo de clan ya satisface R5 con creces (color de peligro, confirmación, copy honesto sobre el mecanismo sin servidor). R1 y R2 están parcialmente satisfechos (agrupación por subtítulos existe; el degradado sí tiene identidad de marca). R3 y R4 fallan de forma directa y reproducible (capturas 04, 14/15/18).

**Vacío no cubierto:** R3 (coherencia preview-validación) es el requisito de mayor apalancamiento sin cubrir — es el único observado causando una contradicción real de confianza durante el uso (no hipotética), es barato de arreglar (una función de validación compartida), y es exactamente el tipo de "esquina sin terminar" que se lee como CRUD genérico precisamente por ser una inconsistencia, no una funcionalidad ausente.

*Hallazgos iniciales. Repite en un requisito concreto, cita más a fondo, cambia a analyze/evaluate, o pregunta lo que necesites profundizar.*

### Evaluate (puntuado)

**Contexto (paso 0):**
- **Audiencia:** pescadores recreativos/aficionados, usuarios de una app gratuita, sin cuenta, 100% local; cómodos con cultura informal de compartir códigos por WhatsApp; nivel técnico medio, no desarrolladores.
- **Intención:** sentir que es SU vitrina de identidad de pesca — orgullo por stats/logros, un punto de "flex" social vía clan/destacadas — no una pantalla corporativa de ajustes de cuenta.
- **Posicionamiento:** hobby, gratuito, sin publicidad ni suscripción — no requiere embudos de conversión agresivos en L4; el "objetivo de negocio" aquí es retención/cariño, no venta.
- **Modelo:** sin monetización en esta pantalla; producto local-first, mecánica comunitaria (códigos de clan) sustituye infraestructura de servidor.
- **Qué funciona ya:** sistema de tarjetas oscuras + acento naranja consistente en toda la pantalla y los 4 modales; iconografía hexagonal de logros; etiquetas de botón específicas y honestas; codificación de color para acciones destructivas; preview en vivo del editor (cuando coincide con la validación).
- **Meta-nivel:** no aplica (no es un sitio de agencia de diseño demostrando su propio oficio).

**Detección de sistema de diseño:** ninguno de los perfiles web (Tailwind/WordPress/Shopify) aplica — app móvil Capacitor/Ionic con CSS propio prefijado `pp-*`. Confianza: 0 para los tres. Se evalúa con los principios generales del rubric, tal como indica el protocolo para este caso.

---

**Foundation (L0): 68/100 (fail)**
- *Razonamiento:* familia tipográfica única observada en toda la pantalla; viewport móvil correcto sin overflow en ninguna de las 24 capturas; fila de stats limitada a 4 (dentro del techo de Cowan). El modal "Editar perfil" agrupa 7 afordancias de entrada (nombre, usuario, bio, 5 banners+subida, avatar) sin pasos ni disclosure progresivo real, mitigado solo parcialmente por subtítulos de sección.
- *Violaciones:* V-F-001 (major) — modal sin paginar con 7 campos, supera la guía de "más de 4 campos deben agruparse en pasos" del rubric. V-F-002 (minor) — grid de 21 logros renderizado completo en cada visita sin colapso.
- *Fortalezas:* tipografía única; renderizado responsive correcto en las 24 capturas; subtítulos de sección como chunking ligero.
- *Fixes:* edición rápida de un solo campo (V-F-001); colapso opcional del grid de logros a futuro (V-F-002).

**Layer 1, First Impression: 79/100 (pass)**
- *Razonamiento:* la tarjeta pública (banner+avatar+nombre) es el hero, visible completo sobre el pliegue en 393×852; CTA "Editar perfil" inmediatamente visible, sólido, alto contraste. Sin imágenes rotas/placeholder.
- *Violaciones:* V-L1-001 (minor) — estado vacío por defecto ("PL"/"Pescador local") funcional pero poco autorado frente al potencial del sistema de banners.
- *Fortalezas:* 5 degradados con nombres costeros propios del dominio (no azules genéricos de SaaS); composición reconocible del género "tarjeta de perfil" (Twitter/Discord/Xbox) — encaje rápido de sistema 1.
- *Fixes:* motivo/microcopy de estado vacío más autorado.

**Layer 2, Processing Fluency: 61/100 (fail)**
- *Razonamiento:* sistema visual (tarjetas oscuras + naranja + hexágonos) aplicado uniformemente en tarjeta, stats, destacadas, logros y los 4 modales. Verificado directamente: la previa del editor no aplica la misma validación de @usuario que el guardado (bug #2); nombre/usuario sin contador pese a tener el mismo tipo de límite que bio.
- *Violaciones:* V-L2-001 (major) — divergencia preview/validación en @usuario, `vista-perfil.js` ~470-480 vs. `perfil.js` ~76-82, reproducida en esta auditoría. V-L2-002 (minor) — contador inconsistente entre campos hermanos.
- *Fortalezas:* mismo sistema de color/tarjeta/icono en las 5 superficies modales y no modales; ritmo de espaciado consistente.
- *Fixes:* enrutar la normalización de preview por el validador real (V-L2-001); añadir contadores a nombre/usuario (V-L2-002).

**Layer 3, Perception Bias: 66/100 (fail)**
- *Razonamiento:* la prueba social clásica no aplica a escala (sin otros usuarios, sin servidor); la señal L3 relevante aquí es coherencia interna del contenido autorado. 18/21 nombres de logros son específicos y con sabor pesquero; 3 comparten literalmente el nombre "Día perfecto" sin marcador de tier.
- *Violaciones:* V-L3-001 (minor) — etiqueta repetida ×3 en el mismo recorrido visual, violación de procesamiento predictivo.
- *Fortalezas:* 18/21 nombres de logro ricos y específicos; copy honesto del mecanismo de invitación a clan (sin servidor, declarado explícitamente) — un genuino pase del test de Sinceridad, y una señal anti-"ai slop" real.
- *Fixes:* sufijo o icono diferenciador para los 3 "Día perfecto" (fix de datos, fuera de `vista-perfil.js`).

**Layer 4, Decision Architecture: 70/100 (fail — justo en el límite, ver nota)**
- *Razonamiento:* etiquetas específicas y orientadas a resultado en las 24 capturas ("Editar perfil", "Elegir capturas", "Fundar clan", "Unirme con código", "Invitar", "Salir del clan"); ninguna genérica salvo "Guardar"/"Listo" (aceptable en contexto de modal). Acción destructiva codificada en color de peligro + confirmación nativa, verificado. Cancelar descarta todo correctamente, verificado. Pero el tab-bar inferior queda mostrando una pestaña incorrecta ("Previsión") en el 100% de las visitas a Perfil — un fallo directo de wayfinding (bug #1), la violación más severa encontrada en toda la auditoría de esta pantalla.
- *Violaciones:* V-L4-002 (major) — desincronización del estado visual del tab-bar al estar en una vista fuera de pestañas, `app-shell.js:404-419`, reproducido de forma determinista. V-L4-001 (minor) — sin feedback visible en el fallback de "Copiar" sin permiso de portapapeles.
- *Fortalezas:* etiquetas específicas y honestas en todo el flujo; codificación de color correcta para lo destructivo; cancelar/guardar/validar verificados correctos; revelación honesta del mecanismo sin servidor en "Invitar al clan" (test de Sinceridad); sin patrones oscuros en ningún flujo probado (test de Regla de Oro).
- *Fixes:* corregir la sincronización del tab-bar cuando `vistaActiva` no es una pestaña real (V-L4-002, la más alta prioridad de toda la evaluación); estado visible en el fallback de copiar (V-L4-001).

---

**Comprobación de dependencias:** Foundation=68 (≥40, no dispara topes). L1=79 (≥40, no dispara topes sobre L2-L4). Ninguna violación de severidad Critical registrada (la más severa es "major"), así que ninguna capa se topa a 30. Todas las puntuaciones se mantienen tal cual se calcularon.

**Patrones cross-layer:**
- La divergencia preview/validación de L2 y el modal sin paginar de L0 se refuerzan: el usuario ya cargado cognitivamente por un formulario largo sin segmentar es también el más propenso a cometer justo el tipo de entrada (typos, caracteres sueltos) que dispara la divergencia de L2 — carga cognitiva y fallo de fluidez comparten la misma pantalla, el mismo modal, la misma acción de usuario.
- La debilidad de estado vacío de L1 y la etiqueta repetida de L3 concentran la señal de "genérico" en los dos momentos donde más probablemente mira un evaluador externo: la primera apertura (perfil vacío) y el grid de logros (donde la repetición es más visible frente al copy rico del resto).

**Overall: 69/100**

Cálculo: `(68×1.5 + 79 + 61 + 66 + 70) / 5.5 = (102 + 276) / 5.5 = 68.7 → 69`.

Pantalla visualmente coherente y con personalidad de dominio genuina (degradados costeros nombrados, 18/21 logros con copy autorado, revelación honesta del mecanismo de clan sin servidor) — más cerca de "hecha a medida" que de "ai slop" en una lectura superficial — lastrada por dos costuras de corrección directamente reproducidas (preview/validación del @usuario, etiquetas de logro duplicadas) y por un fallo de wayfinding 100% reproducible en el tab-bar que es, capa por capa, la violación más seria encontrada en esta auditoría.

**Top 3 fixes (mayor impacto):**
1. **Corregir la desincronización del tab-bar cuando `vistaActiva` es una vista fuera del tab-bar** (`src/ui/shell/app-shell.js:404-419`). Capas: L4 (wayfinding) + L2 (confianza/fluidez). Impacto esperado: L4 70→~82; overall +2-3.
2. **Enrutar la normalización de la preview del @usuario por el mismo validador que usa el guardado** (`src/ui/views/vista-perfil.js` `pintarPreview` + `src/domain/perfil.js` `RE_USUARIO`). Capa: L2. Impacto esperado: L2 61→~72; overall +2.
3. **Diferenciar los 3 logros duplicados "Día perfecto"** (catálogo de logros, fuera de `vista-perfil.js`). Capa: L3. Impacto esperado: L3 66→~74; overall +1-2.

**Notas de dependencia:** sin topes aplicados (ninguna capa por debajo de 40, ninguna violación Critical). El spread entre capas (79 máx. L1 vs. 61 mín. L2, 18 puntos) es saludable y coherente con el patrón esperado del stack de dependencias de PFD — no hay agrupamiento artificial de puntuaciones.

*Hallazgos iniciales. Repite en una puntuación de capa, cita más a fondo, cambia a solve/analyze, o pregunta lo que necesites profundizar.*

---

## Plan de mejora priorizado

> Plan, no implementación. Ningún archivo bajo `src/` fue tocado en esta auditoría.

1. **[Alta prioridad] Corregir el desajuste visual del tab-bar cuando se navega a Perfil.** Investigar por qué `ion-tab-bar`/`ion-tab-button` resaltan visualmente "Previsión" cuando ningún botón tiene `selected=true` internamente (confirmado por consola: el bug es puramente visual, no de estado lógico). Candidatos: forzar explícitamente `tabBar.selectedTab = undefined` o un valor "ninguno" al entrar a una vista de `VISTAS_MENU`, o investigar si Ionic necesita un manejo distinto al mutar `selected` a mano en vez de vía su propio ciclo de clic. Es el hallazgo de mayor severidad de toda la auditoría por ser 100% reproducible y visible en cada visita.
2. **[Alta prioridad] Unificar la validación del @usuario entre la vista previa en vivo y el guardado real.** Extraer o reutilizar `RE_USUARIO`/la lógica de `actualizar()` de `src/domain/perfil.js` dentro de `pintarPreview()` en `vista-perfil.js`, de modo que la tarjeta de vista previa nunca muestre un estado que el guardado luego rechace o transforme de otra manera.
3. **[Media prioridad] Diferenciar los logros "Día perfecto" duplicados** en el catálogo de logros (fuera del alcance de `vista-perfil.js`; requiere revisar `src/domain/records/logros.js`) con un sufijo de tier o variante de icono.
4. **[Media prioridad] Añadir contador de caracteres a nombre y usuario**, igual que ya existe para bio, en `campoTexto()` (`vista-perfil.js:337-360`) — hoy el parámetro `opts.max` sin `opts.multilinea` no genera contador.
5. **[Baja prioridad] Autoría de un estado vacío con más textura de dominio** para la tarjeta de perfil sin contenido (más allá del degradado + iniciales), ya que es el estado que más probablemente ve un evaluador o usuario nuevo.
6. **[Baja prioridad] Dar feedback visible al fallback de "Copiar código de clan"** cuando el portapapeles no está disponible (hoy el texto se selecciona pero el botón no cambia de estado).
7. **[Opcional / bajo impacto medido] Evaluar una edición rápida de un solo campo** (p. ej. tocar el nombre en la tarjeta para editarlo in-place) si tras los fixes 2-6 el modal completo sigue sintiéndose pesado para cambios puntuales; de baja prioridad porque el agrupamiento actual por subtítulos ya mitiga parte de la carga.

---

## Preguntas abiertas

- ¿Los 3 logros "Día perfecto" son tiers progresivos por diseño (I/II/III) o una duplicación de datos accidental? No se pudo confirmar sin capturas reales en el cuaderno que los desbloqueen.
- ¿Es intencional que Perfil, al no ser una pestaña, deje el tab-bar en un estado "sin selección" en vez de, por ejemplo, mantener resaltada la última pestaña real visitada? El bug encontrado sugiere que ese caso simplemente no se contempló, pero valdría decidir explícitamente el comportamiento deseado antes de corregirlo.
- ¿Se ha probado el flujo completo de "Editar perfil" en un dispositivo Android real con el teclado nativo abierto? El modal usa `breakpoints: [0, 1]` (bottom-sheet a pantalla completa); no se verificó en esta auditoría si el teclado tapa el campo activo o si el contenido hace scroll correctamente con el teclado desplegado.
- La imagen de prueba usada para el avatar (PNG 1×1 escala de grises+alfa) no permitió verificar fielmente la fidelidad de color del pipeline de compresión a JPEG; valdría una prueba manual con una foto real para confirmar que no hay pérdida de calidad inesperada en avatares reales.
- ¿Existe algún límite de tamaño de archivo o validación de dimensiones mínimas para las fotos de banner/avatar? No se probó con archivos grandes ni con formatos no soportados (p. ej. un PDF renombrado a .png).
