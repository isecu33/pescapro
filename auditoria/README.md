# Auditoría funcional de PescaPro

Batería de tests escrita **desde fuera**: parte de lo que la app **promete**
(README, comentarios de contrato del código, física de mareas y astronomía,
modelo de amenazas de los códigos compartidos), no de los tests ni de los
casos que ya existían. Un test que falla significa que la app **no cumple uno
de sus propios supuestos**.

```bash
npm run test:auditoria
```

- Va aparte de `npm test` a propósito: su trabajo es encontrar desviaciones,
  así que puede estar en rojo sin bloquear commits.
- Zona horaria fija `Europe/Madrid` (`setup.js`): es la del usuario objetivo y
  tiene horario de verano, que es donde aparecen los errores de "día local
  frente a día UTC".
- Las pruebas que dependen de la hora congelan el reloj en varias horas del
  día (00:30, 01:30, 06:00, 12:00, 18:30, 23:30), porque el resultado no debe
  depender de cuándo abra el usuario la app.
- Los datos sintéticos (`util.js`) llevan una "verdad" conocida. Por ejemplo,
  una marea sinusoidal cuyas pleamares se sabe exactamente cuándo ocurren.

## Supuestos cubiertos

| Fichero | Supuesto |
|---|---|
| `01-config` | Los pesos suman 1, los trapecios están ordenados, los umbrales de seguridad son los del README, se conocen todos los códigos WMO de Open-Meteo, etiqueta y color del índice son coherentes, rumbos, refresco de 30 min y sin API key |
| `02-mareas` | Los extremos coinciden con la marea real (±10 min, ±3 cm), pleamar y bajamar se alternan, con ruido del modelo no aparecen mareas espurias, "media marea = máxima corriente", clases de amplitud y coeficiente entre 20 y 120 |
| `03-solunar` | Fases lunares frente a efemérides, amanecer y ocaso realistas en el Cantábrico, orden noche→amanecer→día→atardecer→noche, tránsitos cada ~24 h 50 min, periodos de 3 h y 1,5 h, "1 = periodo mayor" |
| `04-indice` | Índice entero entre 0 y 100 (fuzz), capado y aviso rojo según el README, más viento o mar fuera del óptimo nunca sube el índice, tendencia de presión, la tira de días empieza hoy, invariantes de las mejores ventanas |
| `05-especies` | Fichas completas y coherentes con mareas y solunar, eging = calamar y sepia, actividad entre 0 y 100, fuera de temporada = 0, un factor mejor nunca baja la actividad, ranking y mejores horas |
| `06-api` | Fusión clima y marino por hora, horas en la zona del spot, parámetros de Open-Meteo, timeout, caché sin cobertura, flujo completo de datos a índice, CSP |
| `07-cuaderno-records` | Alta y baja de capturas, ids únicos, almacenamiento lleno, exportar/importar, favoritos, récords, "mejor día" por día local |
| `08-logros` | Umbrales exactos de cada descripción, progreso coherente con el estado, un logro no se pierde, horas locales, amanecer en el lugar de la captura, faros |
| `09-liga` | Validación, periodo por días locales, puntuación, flujo entre dos móviles, reimportación sin duplicados, códigos rotos o manipulados |
| `10-perfil` | Valores por defecto, límites, nombre único entre perfil y ligas, insignias y destacadas, clanes entre móviles, tarjeta pública sin ids |
| `11-integridad` | Toda imagen referenciada existe en `img/`, textos sin caracteres corruptos, los scripts de `package.json` apuntan a ficheros reales |

## Hallazgos (primera ejecución: 437 tests, 16 fallan)

| # | Severidad | Supuesto incumplido | Dónde |
|---|---|---|---|
| 1 | Alta | **El buscador de lugares está bloqueado por la CSP.** `buscarLugar()` llama a `nominatim.openstreetmap.org`, pero `connect-src` en `index.html` solo permite Open-Meteo. En la app compilada, la búsqueda falla siempre. | `index.html`, `src/domain/api.js:118` |
| 2 | Media | **Días UTC en lugar de días locales.** `toISOString().slice(0,10)` hace que, en verano, lo pescado entre las 00:00 y las 02:00 cuente para el día anterior. Afecta a "mejor día", a los logros "día perfecto", a si una captura entra en una liga y a si una liga está activa a las 00:30 de su primer día. | `records.js:17`, `liga.js:66,75` |
| 3 | Media | **La tira de próximos días empieza AYER** si se abre la app entre las 00:00 y la 01:59, porque `serie()` incluye 2 h pasadas. | `indice.js:120` (`serie`, usada por `diasDisponibles`) |
| 4 | Media | **Horas del móvil, no del spot.** Un spot en Canarias consultado con el móvil en hora peninsular desplaza 1 h mareas, amanecer e índice: `fusionar()` ignora `utc_offset_seconds`. | `api.js:142` |
| 5 | Media | **Importar un fichero con entradas inválidas deja el cuaderno inservible:** `estadisticas()` lanza `TypeError` en cada llamada posterior. | `cuaderno.js:80` (`importar`) |
| 6 | Media | **Participantes duplicados:** reimportar el resultado de un amigo con un nombre de más de 24 caracteres añade un participante nuevo cada vez, porque busca por el nombre completo pero guarda el nombre recortado. | `liga.js:214-216` |
| 7 | Baja | **Mojibake en textos visibles:** la ficha del calamar muestra "dÃ¡rsenas" y la del pulpo "estÃ¡ … CantÃ¡brico". | `especies.js` (zonas del calamar, notas del pulpo) |
| 8 | Baja | **"Madrugador" usa siempre el amanecer de A Coruña,** no el del lugar de la captura. En Canarias, una captura al amanecer local no desbloquea el logro. | `logros.js:10-11,114` |
| 9 | Baja | **Códigos WMO 56 y 57 (llovizna helada) sin texto ni icono:** la UI muestra "—". | `config.js` `WMO`, `icons.js` `WMO_ICO` |
| 10 | Baja | **`liga.setNombre('   ')` guarda un nombre vacío,** aunque el perfil lo prohíbe, y deja al pescador sin nombre. | `liga.js:32` |
| 11 | Doc | **El README dice "viento > 45, rachas > 60, olas > 3 m",** pero el código usa `>=`. Hay que alinear una de las dos cosas. | `indice.js:37-39` / README |

Además, la suite existente (`npm run test:vitest`) tiene **dos tests que
dependen de la hora a la que se ejecutan**:
`indice.test.js › resumenDias()` y `logros.test.js › logro nocturno`. Fallan
de noche.

### Comprobados y correctos

Todo lo demás pasa, incluido lo siguiente:

- mareas frente a la física, incluso con ruido;
- efemérides lunares y solares;
- capado de seguridad en las tres modalidades;
- monotonía del índice;
- ventanas de pesca;
- caché offline y timeout;
- validación de códigos de liga y clan;
- tarjeta pública sin ids;
- existencia de todas las imágenes.

Además, se verificó con datos reales de 2026 en tres costas españolas que
nunca se solapan un periodo menor y uno mayor, así que `factorSolunar` es
correcto en la práctica.
