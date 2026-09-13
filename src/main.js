/* Bootstrap de la app: registra los Custom Elements de Ionic (loader lazy,
   cada ion-* se carga bajo demanda -- minimiza el peso final en el APK),
   registra los iconos usados de forma local (sin CDN, offline-first) y
   monta el shell. Las vistas se cablean en app.js (Fase 4). */
import { defineCustomElements } from '@ionic/core/loader';
import { addIcons } from 'ionicons';
import {
  speedometerOutline, trendingUpOutline, mapOutline, fishOutline, bookOutline, trophyOutline,
  refreshOutline, starOutline, starSharp, closeOutline, addOutline, addCircleOutline,
  cameraOutline, locationOutline, trashOutline
} from 'ionicons/icons';

import '@ionic/core/css/core.css';
import '@ionic/core/css/normalize.css';
import '@ionic/core/css/structure.css';
import '@ionic/core/css/typography.css';
import '@ionic/core/css/palettes/dark.always.css'; // solo tema oscuro (uso nocturno/exterior)
import './styles/theme.css';

import './ui/shell/app-shell.js';

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
  'trash-outline': trashOutline
});

defineCustomElements(window);

document.addEventListener('DOMContentLoaded', () => {
  const raiz = document.getElementById('app');
  raiz.appendChild(document.createElement('pp-app-shell'));
});
