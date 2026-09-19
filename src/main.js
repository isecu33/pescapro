/* Bootstrap de la app: registra los Custom Elements de Ionic (loader lazy,
   cada ion-* se carga bajo demanda -- minimiza el peso final en el APK),
   registra los iconos usados de forma local (sin CDN, offline-first),
   monta el shell y arranca la orquestacion (src/app.js, Fase 4). */
import { defineCustomElements } from '@ionic/core/loader';
import { addIcons } from 'ionicons';
import {
  speedometerOutline, trendingUpOutline, mapOutline, fishOutline, bookOutline, trophyOutline,
  refreshOutline, starOutline, starSharp, closeOutline, addOutline, addCircleOutline,
  cameraOutline, locationOutline, trashOutline,
  menuOutline, personCircleOutline, notificationsOutline, settingsOutline, informationCircleOutline,
  chevronForwardOutline, moonOutline, sunnyOutline, cloudDownloadOutline,
  waterOutline, navigateOutline, cloudUploadOutline
} from 'ionicons/icons';

import '@ionic/core/css/core.css';
import '@ionic/core/css/normalize.css';
import '@ionic/core/css/structure.css';
import '@ionic/core/css/typography.css';
import '@ionic/core/css/palettes/dark.always.css'; // solo tema oscuro (uso nocturno/exterior)
import './styles/theme.css';

import './ui/shell/app-shell.js';
import { crearApp } from './app.js';

addIcons({
  'speedometer-outline': speedometerOutline,
  'trending-up-outline': trendingUpOutline,
  'map-outline': mapOutline,
  'fish-outline': fishOutline,
  'book-outline': bookOutline,
  'trophy-outline': trophyOutline,
  'refresh-outline': refreshOutline,
  'star-outline': starOutline,
  'star': starSharp,
  'close-outline': closeOutline,
  'add-outline': addOutline,
  'add-circle-outline': addCircleOutline,
  'camera-outline': cameraOutline,
  'location-outline': locationOutline,
  'trash-outline': trashOutline,
  'menu-outline': menuOutline,
  'person-circle-outline': personCircleOutline,
  'notifications-outline': notificationsOutline,
  'settings-outline': settingsOutline,
  'information-circle-outline': informationCircleOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'moon-outline': moonOutline,
  'sunny-outline': sunnyOutline,
  'cloud-download-outline': cloudDownloadOutline,
  'water-outline': waterOutline,
  'navigate-outline': navigateOutline,
  'cloud-upload-outline': cloudUploadOutline
});

defineCustomElements(window);

document.addEventListener('DOMContentLoaded', () => {
  const raiz = document.getElementById('app');
  const shell = document.createElement('pp-app-shell');
  raiz.appendChild(shell);
  crearApp(shell); // se engancha a su propio DOMContentLoaded (once) para arrancar
});
