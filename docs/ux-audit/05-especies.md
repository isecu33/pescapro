# Especies

Fecha: 2026-09-25
Rama: `feature/cuaderno-fotos-multiples` — commit `7ce04d8`
Entorno: Vite dev server (`localhost:5174`), viewport móvil 393×852, geolocalización simulada (Zarautz).
Archivos auditados: `src/ui/views/vista-especies.js`, `src/domain/especies.js`, `src/ui/util/modal.js`, `src/styles/theme.css` (bloque "Imágenes de especies", líneas 777-898).

## Capturas

Todas en `docs/ux-audit/screenshots/especies/`:

| Archivo | Contenido |
|---|---|
| `01-inicial.png` | Grid inicial (6 primeras de 12 tarjetas) |
| `02-grid-completo.png` | Intento de captura de página completa (ver nota en Bugs — `ion-content` no scrollea con `fullPage`, resultado equivalente a 01) |
| `03-modal-lubina.png` | Ficha de Lubina — especie **con** `foto` asignada |
| `04-tras-cerrar-x.png` | Grid tras cerrar el modal con el botón X (scroll intermedio del grid) |
| `05-modal-sargo-sin-foto.png` | Ficha de Sargo — única especie **sin** `foto` (`foto: null`) |
| `06-modal-sargo-scroll.png` | Ficha de Sargo, sección inferior (reglamento + mejores horas) |
| `07-tras-esc.png` | Estado tras pulsar Escape sobre el modal de Sargo (ver Bugs) |
| `08-modal-pulpo.png` | Ficha de Pulpo — especie con `foto` + aviso de veda |

## Acciones probadas

| # | Acción | Resultado |
|---|---|---|
| 1 | Cargar vista Especies desde el tab bar | Grid de 12 tarjetas renderiza correctamente, sin errores de consola/página (`pageerror`/`console.error`: ninguno registrado) |
| 2 | Inspeccionar icono de las 12 tarjetas (`.pp-esp-card-ico`) | Las 12 son `<img>` con SVG real (`./iconos/svg/<id>.svg`); **ninguna** cae al fallback de emoji — todas las especies tienen `imagen` definida |
| 3 | Abrir ficha de Lubina (con foto) | Modal se abre, título + silueta SVG blanca, bloque "foto" se renderiza pero es una mancha negra casi invisible (ver Bugs #1) |
| 4 | Abrir ficha de Sargo (sin foto) | Modal se abre sin el bloque de foto, pasa directo de título a "Temporada" — visualmente más limpio que Lubina/Pulpo |
| 5 | Abrir ficha de Pulpo (con foto + veda) | Igual que Lubina: mancha negra en el bloque foto. Además, texto de `notas`/`veda` con mojibake (ver Bugs #2) |
| 6 | Cerrar modal con botón X | Funciona correctamente en los tres casos probados (Lubina, Pulpo) |
| 7 | Cerrar modal con tecla Escape | El modal de Sargo permanece abierto tras `Escape` (capturas 06 y 07 idénticas) — ver Bugs #3 |
| 8 | Cerrar modal con click fuera / gesto de swipe | No probado con gesto táctil real (Playwright headless no reproduce el drag del sheet de Ionic de forma fiable); pendiente de verificación manual |
| 9 | Buscar filtros/chips de modalidad o hábitat en la vista | No existen — confirmado tanto por inspección de `vista-especies.js` (no hay lógica de filtrado) como por el DOM en runtime. Los chips "Spinning/Eging/Surfcasting" detectados en el DOM pertenecen a otra vista (Previsión) que permanece montada, no a Especies |
| 10 | Revisar consistencia de tamaño/recorte de siluetas SVG entre tarjetas | Peso visual muy desigual entre tarjetas — ver Bugs #4 |

## Bugs y fallas encontradas

### 1. CRÍTICO — El campo `foto` no es una fotografía: es la misma silueta en PNG negro, casi invisible en tema oscuro

- **Archivo:línea:** `src/domain/especies.js:17,39,149,...` (campo `foto` de cada especie) y `src/ui/views/vista-especies.js:89-102` (bloque que la renderiza).
- El comentario de cabecera de `especies.js` (línea 9) describe `foto` como "ruta relativa al WebP bundleado" y el de `vista-especies.js` (línea 6) dice "El modal incluye foto real (bundleada, offline)". En la práctica, `img/iconos/png/lubina.png`, `pulpo.png`, `dorada.png`, etc. son PNG en escala de grises con alpha (`8-bit gray+alpha`, confirmado con `file`) que contienen el **mismo dibujo de silueta** que el SVG de `imagen`, solo que relleno de negro sólido en vez de blanco.
- Renderizado en el modal (fondo oscuro de la app, `<img>` sin filtro de color, `object-fit: cover`, `max-height: 200px`) el resultado es una mancha negra que se funde con el fondo — ver `03-modal-lubina.png` y `08-modal-pulpo.png`. Ocupa ~180-200 px de la ficha sin aportar ninguna información reconocible.
- **Impacto:** de las 12 especies, 11 tienen `foto` no-null (todas salvo Sargo) → **11 de 12 fichas muestran esta mancha rota**, no solo un caso aislado.
- **Contraste revelador:** Sargo, la única especie con `foto: null`, omite el bloque entero y pasa directo a "Temporada" (`05-modal-sargo-sin-foto.png`) — el caso "sin foto" es visualmente más limpio y de más confianza que el caso "con foto".
- **Severidad:** CRÍTICO — es el elemento más prominente del modal (justo bajo el título, antes que cualquier dato útil) y está roto en el 92% de las fichas.

### 2. ALTO — Mojibake (corrupción de codificación) en textos de Pulpo y Calamar

- **Archivo:línea:** `src/domain/especies.js` líneas 222-223, 270, 273 (y la cabecera del archivo, líneas 1-11).
- Texto real visto en pantalla (`08-modal-pulpo.png`): *"su pesca recreativa estÃ¡ muy regulada o vedada en varias comunidades del CantÃ¡brico"* y *"Consultar â€" vedas frecuentes en Galicia"*.
- En el código fuente (leído directamente) esto corresponde a cadenas como `'IMPORTANTE: su pesca recreativa estÃ¡ muy regulada...'` y `veda: 'Consultar â€" vedas frecuentes en Galicia'` — es decir, el archivo tiene **mojibake ya en el propio código fuente** (UTF-8 re-codificado como Latin-1), no es un problema de renderizado. Afecta a las entradas de `pulpo` y `calamar` (líneas 222-223, 270-274); el resto del archivo usa acentos correctos (`óptima`, `mínimo`, etc.), lo que confirma que solo esas ediciones puntuales se guardaron con la codificación incorrecta.
- **Severidad:** ALTO — texto visiblemente roto para el usuario final en dos especies (una de ellas, Pulpo, con contenido regulatorio importante sobre vedas).

### 3. MEDIO — Escape no cierra el modal de ficha de especie

- **Archivo:línea:** `src/ui/util/modal.js:13-47` (`abrirModal`, usado por `abrirModalEspecie` en `vista-especies.js:119`).
- `abrirModal()` (basado en `<ion-modal>`) no registra ningún listener de teclado. Solo `abrirModalCentrado()` (línea 57-84, el modal "div" alternativo usado en otras partes de la app) llama a `document.addEventListener('keydown', escCierraModal)`.
- En la prueba, pulsar Escape sobre la ficha de Sargo no la cerró (capturas `06` y `07` idénticas). No se pudo confirmar si esto reproduce el comportamiento real en dispositivo (Ionic gestiona overlays con su propio overlay-controller que normalmente sí escucha Escape) o si es un artefacto del entorno headless sin foco de teclado correcto.
- **Severidad:** MEDIA, a confirmar manualmente — si se reproduce en dispositivo/navegador real, es una inconsistencia de accesibilidad respecto al otro sistema de modal de la app (que sí soporta Escape y click-fuera).

### 4. MEDIO — Peso visual muy desigual entre siluetas del grid

- **Archivo:línea:** `src/domain/especies.js` (campo `silhoueta`/`imagen` por especie, cada SVG con su propio `viewBox` nativo) + `src/styles/theme.css:779-786` (`.pp-esp-card-ico { aspect-ratio: 4/3; object-fit: contain; }`).
- Los SVG de origen tienen relaciones de aspecto muy dispares: Sargo `2048×2048` (cuadrado) vs. Lubina `1365×520` (muy alargado) vs. Pulpo `1365×996` (casi cuadrado) vs. Congrio/Caballa (silueta muy fina y alargada). Con `object-fit: contain` dentro de un contenedor fijo 4:3, las siluetas alargadas quedan como una línea fina y pequeña centrada en un recuadro casi vacío, mientras que Pulpo y Dorada casi llenan la tarjeta.
- Visible comparando `01-inicial.png` (Dorada y Pulpo dominantes) contra `07-tras-esc.png` (Sargo, Congrio, Caballa muy pequeños dentro del mismo tamaño de tarjeta).
- **Severidad:** MEDIA — no es un error funcional, pero rompe el ritmo/consistencia del grid: algunas tarjetas "pesan" visualmente mucho más que otras sin relación con la información que transmiten (el índice de actividad, que es el dato relevante).

### 5. BAJO — `fullPage` screenshot no captura el grid completo

- No es un bug de producto: `ion-content` gestiona su propio scroll interno, así que `page.screenshot({ fullPage: true })` no lo recorre (ver `02-grid-completo.png`, idéntica a `01-inicial.png`). Mencionado solo como nota metodológica — la cobertura visual completa del grid se obtuvo igualmente vía scroll incremental (`04`, `07`).

### 6. NOTA — motivo de tarjeta inconsistente en redacción

- `vista-especies.js:66-68` muestra `r.act.motivo` tal cual lo genera `indice.js` (fuera del alcance de este archivo). La mayoría de tarjetas muestran una frase completa ("Condiciones muy favorables", "Condiciones aceptables"), pero al menos una ("Caballa / Verdel", `07-tras-esc.png`) muestra solo "Temperatura del agua" — un fragmento/factor limitante en vez de una frase evaluativa. No se ha investigado `indice.js` (fuera del alcance de esta sección), se deja como pregunta abierta.

## Análisis PFD

*(Invocado `perception-first-design:all`; los archivos internos del corpus del skill — `skills/pfd/SKILL.md` y comandos asociados — no están presentes en este repo/entorno, por lo que el análisis de abajo aplica el marco de las 3 lentes (descriptiva / prescriptiva / evaluativa) directamente sobre los hallazgos verificados, sin citas al corpus interno del skill.)*

### Analyze (descriptivo) — qué pasa realmente cuando un usuario toca una tarjeta

1. **Capa de primer vistazo (grid):** el usuario escanea 12 siluetas blancas sobre negro. La lectura funciona razonablemente porque el color/tamaño de fuente del índice numérico (naranja, grande) es el verdadero foco de atención — las siluetas actúan como ornamento identificador secundario. El peso desigual entre siluetas (bug #4) no rompe la usabilidad del escaneo (el nombre en texto desambigua), pero sí transmite una sensación de "sets de assets" distintos, no de un sistema deliberado.
2. **Capa de apertura de ficha:** al tocar, el usuario espera "más detalle, más confianza" — es el momento de mayor expectativa dentro del flujo. Lo primero que recibe (en 11 de 12 casos) es una mancha negra sin forma reconocible ocupando el espacio más prominente de la pantalla, inmediatamente debajo del título. Esto es una ruptura de expectativa en el punto de mayor atención.
3. **Efecto cascada sobre la confianza en el resto de la ficha:** el usuario no tiene forma de saber, solo mirando la app, que el "hueco negro" es un bug de asset y no una foto real cargando o un placeholder intencional. La reacción típica ante un elemento visualmente roto en la posición más prominente es generalizar la desconfianza hacia el resto del contenido — en este caso, datos regulatorios (tallas mínimas, cupos, vedas) que el usuario podría usar para decidir si un pez es legal para llevarse. Este es el efecto más grave del bug: no es solo estético, contamina la percepción de fiabilidad de contenido normativo real.
4. **Contraste Sargo vs. resto:** la especie sin foto (Sargo) produce, por omisión, la experiencia objetivamente mejor. Un usuario que navegue varias especies notará la inconsistencia entre fichas "limpias" (sin foto) y fichas "con mancha" (con foto) — el patrón dominante (11/12) es el peor, no el mejor.
5. **Mojibake en Pulpo/Calamar:** el texto corrupto aparece justo en el campo de "Consejo"/"Veda" de Pulpo, que es la especie con la advertencia regulatoria más importante del set ("su pesca... está muy regulada o vedada"). Un mensaje de seguridad legal legible mal impacta la credibilidad exactamente donde más se necesita que el usuario confíe en el dato.

### Solve (prescriptivo) — qué tendría que ser cierto para que este sistema de imágenes funcionara

- **R1 (identidad visual coherente):** un mismo lenguaje visual (silueta monocroma) debe usarse en todos los puntos de contacto (tarjeta, título de modal) — esto ya se cumple hoy vía `espImgEl()` como único punto de renderizado; no tocar.
- **R2 (el bloque "foto grande" del modal debe aportar información que la silueta ya no da):** si el propósito es mostrar cómo es realmente el pez (color, forma en vivo), el asset tiene que ser una fotografía o ilustración a color, no una reexportación de la misma silueta. Alternativa mínima-viable si no hay fotos reales disponibles: eliminar el bloque `foto` por completo y dejar que todas las fichas se comporten como Sargo (ya validado como el resultado más limpio) hasta que existan fotos reales.
- **R3 (peso visual proporcional entre tarjetas del grid):** normalizar el "bounding box" visual de cada silueta (recortar el `viewBox` a su contenido real, o aplicar un factor de escala por especie) para que ninguna domine ni desaparezca dentro del recuadro 4:3 — esto es un problema de datos (los `viewBox` de origen), no de CSS.
- **R4 (integridad de codificación):** el pipeline de edición del archivo de datos (`especies.js`) debe garantizar UTF-8 consistente; revisar con un linter/verificación automática (p. ej. grep de secuencias `Ã.` o `â€`) antes de commitear cambios de contenido, dado que ya ocurrió al menos una vez.
- **R5 (degradación consistente):** el patrón "si no hay dato, omitir el bloque en vez de mostrar un placeholder roto" que ya usa el `foto: null` de Sargo y el reglamento (`crearSeccionReglamento` retorna `null` si no hay `reg`) es el patrón correcto del propio código base — el bug no es de diseño de sistema, es que el dato (`foto`) está mal poblado para las otras 11 especies. La solución de más bajo esfuerzo es aplicar la misma regla de "sin dato válido → sin bloque" también a `foto`, hasta disponer de fotos reales.
- **Alternativa descartada:** mantener el PNG negro pero aplicarle un filtro CSS (como se hace con las siluetas SVG, `filter: brightness(0) invert(1)`) para que "sea blanca" — se descarta porque no resuelve el problema real (seguiría siendo la misma silueta repetida, no aporta nada nuevo respecto al icono ya mostrado en el título) y sería una solución cosmética que oculta el hueco de contenido en vez de admitirlo.
- **Hard-fail:** ninguna solución de CSS/frontend resuelve esto — requiere decisión de producto (¿se consiguen fotos reales? ¿se elimina el campo?) y no debe implementarse sin esa decisión, que queda fuera del alcance de esta auditoría (solo plan, no código).

### Evaluate (rated) — puntuación del sistema de iconos sobre las capturas

| Aspecto | Nota (1-5) | Justificación |
|---|---|---|
| Coherencia del icono en tarjeta + título de modal (SVG blanco) | 4/5 | Un único punto de renderizado (`espImgEl`), estilo consistente, sin fallback a emoji en ningún caso probado. Único lastre: peso visual desigual entre siluetas (bug #4). |
| Bloque "foto" del modal | 1/5 | Roto en 11 de 12 fichas; el caso "ausente" (Sargo) supera al caso "presente" en 11 especies — la métrica más dura de un sistema de contenido: hacer nada es mejor que lo que hace hoy. |
| Integridad de contenido textual | 3/5 | Sólido en general (español correcto, tono consistente) salvo mojibake puntual en 2/12 especies, en campos de alto valor informativo (veda). |
| Percepción global ("ai slop" vs. intencional) | 2.5/5 | La base (grid + siluetas) se percibe como un sistema deliberado y de calidad razonable. Pero el bloque de foto rota y el mojibake son exactamente el tipo de defecto que un usuario atribuye a "esto no se ha probado" — rompen la ilusión de acabado antes de llegar a leer los datos técnicos que sí están bien trabajados (heatmap de temporada, reglamento, mejores horas). |

## Plan de mejora priorizado

> Plan únicamente — no se ha modificado código de `src/` ni `www/` como parte de esta auditoría.

1. **P0 — Decidir el destino del campo `foto`.** Dos caminos, a decidir por producto:
   - (a) Conseguir/generar fotos reales a color para las 11 especies restantes (misma fuente/estilo que una futura foto de Sargo), o
   - (b) Eliminar el bloque `foto` del modal (`vista-especies.js:89-102`) y el campo `foto` de `especies.js` hasta tener contenido real, dejando que **todas** las fichas se comporten como la de Sargo hoy.
   - Dado que (b) es reversible y de bajísimo esfuerzo, y que ya está validado visualmente como superior al estado actual, se recomienda como parche inmediato mientras se resuelve (a) a medio plazo.
2. **P0 — Corregir el mojibake de Pulpo y Calamar** en `src/domain/especies.js` (líneas 222-223, 270, 273 y cabecera 1-11): re-guardar el archivo en UTF-8 limpio y verificar visualmente las 12 fichas tras el fix. Añadir una verificación (grep de `Ã` / `â€`) antes de futuros commits de contenido de especies.
3. **P1 — Normalizar el peso visual de las siluetas del grid.** Recortar/ajustar el `viewBox` de cada SVG a su bounding box real de contenido (o introducir un factor de escala por especie en los datos) para que Sargo/Congrio/Caballa/Jurel no queden como una línea diminuta frente a Pulpo/Dorada casi llenando la tarjeta.
4. **P1 — Confirmar en dispositivo/navegador real si Escape y backdrop-click cierran `abrirModal()` (ion-modal).** Si no lo hacen, valorar alinear su comportamiento con `abrirModalCentrado()` (que sí gestiona ambos casos), por consistencia entre los dos sistemas de modal de la app.
5. **P2 — Revisar la redacción de `motivo`** para casos como "Temperatura del agua" (Caballa) que rompen el patrón de frase completa ("Condiciones muy favorables/aceptables") usado por el resto — esto vive en `indice.js`, fuera del archivo de esta sección; dejar como ticket para quien audite Previsión/Ahora.

## Preguntas abiertas

- ¿Existen fotos reales de las especies en algún banco de assets del proyecto (por ejemplo, en `www/` legacy, `dist/`, o pendientes de importar) que simplemente no se enlazaron correctamente en `especies.js`, o el PNG "silueta negra" es efectivamente el único asset que existe hoy para el campo `foto`?
- ¿La decisión de negocio es conseguir fotografías reales (con los derechos de uso correspondientes) o preferís evitar fotos reales por consistencia de marca y quedaros solo con siluetas (en cuyo caso el campo `foto` debería eliminarse del modelo de datos, no solo ocultarse en la UI)?
- ¿El mojibake en `especies.js` (Pulpo, Calamar) apareció por un guardado con editor/codificación distinta, o por un proceso de importación de datos (copiar-pegar desde otra fuente)? Vale la pena revisar si hay más ocurrencias en otros archivos de dominio (`indice.js`, `cuaderno.js`, etc.) fuera del alcance de esta auditoría de Especies.
- ¿Es intencional que `abrirModal()` (usado por Especies) no soporte cierre por Escape/backdrop, a diferencia de `abrirModalCentrado()`? Si Ionic lo resuelve de forma nativa en dispositivo real, no hay acción que tomar; si no, es una inconsistencia a documentar como estándar del proyecto.
- ¿Vale la pena, a futuro, exponer algún filtro por modalidad (spinning/eging/surfcasting) en esta vista, dado que cada especie ya tiene `modos` en los datos pero no se usa aquí? Está fuera del alcance de esta auditoría (que solo evalúa lo existente), pero el dato ya está disponible sin coste de modelado adicional.
