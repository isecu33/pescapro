# 🐟 PescaPro

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat&logo=android&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen?style=flat)

App Android de condiciones de pesca para costa: **marea, viento, oleaje, clima, temperatura del agua y corrientes**, con un **índice de pesca (0-100)** por modalidad y **predicción de actividad por especie** (lubina, dorada, sargo, calamar, sepia, pulpo...). Todo calculado con **reglas transparentes, sin IA**, y con **datos gratuitos de Open-Meteo sin API key**.

## Screenshots

> TODO: add app screenshots here

## Cómo funciona

- **Datos**: [Open-Meteo](https://open-meteo.com) (previsión meteo), su [Marine API](https://open-meteo.com/en/docs/marine-weather-api) (olas, temperatura del agua, corrientes y nivel del mar con marea) y su geocoding para buscar spots. Gratuitos para uso no comercial, sin registro. La app refresca los datos automáticamente cada 30 min y los cachea para funcionar sin cobertura.
- **Mareas**: se extraen pleamares/bajamares de la serie de nivel del mar con interpolación parabólica. Se clasifica la amplitud (vivas/medias/muertas) y se calcula el flujo (media marea = máxima corriente = máxima actividad).
- **Astronomía**: sol y luna calculados en local con SunCalc (sin red): amaneceres, fases lunares y periodos solunares (tránsitos y orto/ocaso lunar).
- **Índice de pesca**: cada factor (viento, oleaje, marea, solunar, momento del día, tendencia de presión, cielo, corriente, Tª del agua) se puntúa 0..1 con funciones trapecio y se pondera según la modalidad (spinning / eging / surfcasting). Los pesos están en `www/js/config.js` — ajústalos a tu experiencia.
- **Especies**: cada especie define su temporada, agua, mar, marea, luz y luna preferidas en `www/js/especies.js`. Su actividad es una media geométrica ponderada de esos factores.
- **Cuaderno**: cada captura guarda una instantánea de las condiciones del momento y, si quieres, una **foto** (cámara o galería). Las fotos se comprimen y se guardan en el dispositivo (IndexedDB, sin subir nada a ningún servidor), con galería y visor integrados. Con el tiempo verás TUS patrones (por fase de marea, luna, franja horaria...).
- **Trofeos**: récords personales automáticos (mejores piezas por especie, mejor día, totales), 14 logros desbloqueables (trofeo de lubina ≥50 cm, rey del eging, madrugador, contra pronóstico...) y **competiciones con amigos sin servidor**: creas una liga (más capturas / pieza mayor / puntos por talla), compartes el código de invitación por WhatsApp y cada amigo envía su código de resultado; el ranking se calcula en tu móvil. Tu resultado sale solo de tu Cuaderno — sistema de confianza entre amigos.
- **Seguridad**: con viento > 45 km/h, rachas > 60, olas > 3 m o tormenta, el índice se capa y aparece un aviso rojo.

## Probar en el navegador (ya mismo)

Abre `www/index.html` en cualquier navegador (doble clic vale). Funciona igual que en el móvil.

## Tests

```bash
npm test                        # lógica (mareas, índice, especies) — sin red
node test/test_api_live.js      # integración con el API real — requiere internet
npm i jsdom --no-save && node test/test_ui_smoke.js   # render de la interfaz
```

## Compilar la app Android

Requisitos (una sola vez):
1. Instala [Node.js LTS](https://nodejs.org) y [Android Studio](https://developer.android.com/studio) (con el SDK que propone por defecto).

Después, en la carpeta del proyecto:

```bash
npm install
npx cap add android      # crea la carpeta android/ (proyecto nativo)
npx cap sync android     # copia www/ dentro del proyecto Android
npx cap open android     # abre Android Studio
```

**Permiso de ubicación (GPS)**: edita `android/app/src/main/AndroidManifest.xml` y añade dentro de `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

En Android Studio: espera a que termine el Gradle sync y dale a **Run ▶** con tu móvil conectado por USB (activa "Depuración USB" en el móvil, en Opciones de desarrollador). Ya tienes la app instalada.

Cada vez que cambies algo en `www/`, ejecuta `npx cap sync android` y vuelve a compilar.

## Publicar en Google Play

1. **Cuenta de desarrollador**: date de alta en [Play Console](https://play.google.com/console) (pago único de 25 USD).
2. **Firma**: en Android Studio, `Build → Generate Signed App Bundle`. Crea un keystore nuevo (guárdalo y apunta las contraseñas: si lo pierdes no podrás actualizar la app). Elige **Android App Bundle (.aab)**, variante `release`.
3. **Ficha de la app**: en Play Console crea la app (nombre: PescaPro; idioma: español), rellena la ficha (descripción, capturas de pantalla del móvil, icono 512×512), la declaración de privacidad y los cuestionarios de contenido. Al usar GPS, declara el permiso de ubicación ("funcionalidad principal: mostrar condiciones de pesca en tu ubicación"). La app no recoge ni envía datos personales (todo se queda en el dispositivo), lo que simplifica la sección de Seguridad de los datos.
4. **Prueba cerrada obligatoria**: las cuentas personales creadas después de nov-2023 deben pasar una prueba cerrada con **al menos 12 testers durante 14 días seguidos** antes de poder publicar en producción. Amigos del club de pesca: perfecto para esto.
5. Sube el `.aab` a producción, envía a revisión y en unos días estará en la Play Store.

## Personalización rápida

| Qué | Dónde |
|---|---|
| Spot por defecto | `www/js/config.js` → `DEFAULT_SPOT` |
| Pesos del índice por modalidad | `www/js/config.js` → `PP.MODOS` |
| Umbrales de seguridad | `www/js/config.js` → `PP.SEGURIDAD` |
| Añadir/editar especies | `www/js/especies.js` |
| Frecuencia de refresco | `www/js/config.js` → `REFRESH_MS` |
| Colores/tema | `www/css/app.css` → `:root` |

## Limitaciones honestas

- El nivel del mar de Open-Meteo viene de un modelo global (~8 km) referido al nivel medio del mar, no al datum de las cartas náuticas: úsalo para **fases y horas** de marea y contrasta alturas con las tablas oficiales de tu puerto.
- Las corrientes del mapa son previsión del modelo oceánico, orientativas cerca de costa; deslizando las horas ves el patrón típico de la zona con el ciclo de marea.
- Las tallas mínimas son orientativas: **verifica siempre la normativa de tu comunidad autónoma** (y las vedas, p. ej. el pulpo).
- El índice orienta, no promete peces. El mar siempre tiene la última palabra 🌊.

## English Summary

PescaPro is an Android fishing-conditions app for coastal anglers, built with Capacitor and vanilla JavaScript. It combines free, no-API-key Open-Meteo data (weather, marine, and geocoding) with locally computed tide, sun/moon, and current analysis to produce a transparent, rule-based 0-100 fishing index tailored to each technique (spinning, eging, surfcasting) and predicted activity per species. It also includes an offline-first fishing log with photos stored on-device, automatic personal records and unlockable achievements, and a serverless friend-to-friend league/competition system — all without collecting or transmitting any personal data.
