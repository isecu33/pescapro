/* <pp-mapa> -- envoltorio de Leaflet (spot, corrientes por rejilla con
   selector de hora, viento, carta nautica OpenSeaMap opcional).
   Reemplaza www/js/mapa.js sin cambiar su logica interna (mismo calculo
   de flechas, mismos colores por velocidad), expuesta ahora como
   metodos de un Custom Element en vez de un modulo PP.mapa con un
   `divId` externo -- el propio elemento es el contenedor del mapa.

   Leaflet pasa de vendored manual (www/lib/leaflet/) a paquete npm,
   bundleado por Vite (sigue siendo 100% local, sin CDN, coherente con
   el requisito offline-first).

   Fix CRITICAL de auditoria: mapa.js:53 (pintarFavoritos) construia el
   popup de un favorito con `bindPopup('<b>' + f.nombre + '</b>...')`,
   sin escapar. Leaflet acepta un Node (no solo un string) en
   bindPopup() -- aqui crearPopupFavorito() construye el popup con
   document.createElement/textContent, eliminando tambien el hack de
   'popupopen' + querySelector que el original necesitaba para
   enganchar el click del enlace.

   Fix de bug real (detectado con Playwright, no por los tests happy-dom:
   L.map() no se comporta igual en happy-dom, asi que esto no fallaba en
   la suite): `import 'leaflet/dist/leaflet.css'` sin `?inline` hace que
   Vite inyecte esa hoja de estilos en <head> del documento PRINCIPAL --
   pero el mapa vive dentro de un Shadow Root (ver constructor), y el
   CSS del documento NO atraviesa el limite de encapsulacion de Shadow
   DOM. Sin las reglas de Leaflet (sobre todo `.leaflet-container {
   overflow: hidden }`), los tiles posicionados con transform quedaban
   sin recortar y el contenedor crecia a miles de px de alto -- por eso
   la vista Mapa se veia completamente en blanco. Con `?inline` se
   importa el CSS como texto y se inyecta a mano dentro del propio
   Shadow Root. */
import L from 'leaflet';
import leafletCss from 'leaflet/dist/leaflet.css?inline';
import { util } from '../../domain/config.js';

export function colorPorVelocidad(vel) {
  return vel < 0.15 ? '#666666' : vel < 0.35 ? '#cc6600' : vel < 0.6 ? '#ff7200' : '#e03131';
}

/* Geometria pura de una flecha de corriente (direccion oceanica = hacia
   donde VA el flujo). Extraida de dibujarFlecha() para poder testearla
   sin necesitar una instancia real de Leaflet. */
export function calcularFlecha(lat, lon, vel, dir) {
  const color = colorPorVelocidad(vel);
  const escala = 0.010 + Math.min(vel, 1.2) * 0.028; // longitud en grados
  const rad = (90 - dir) * Math.PI / 180; // a matematico (dir = hacia donde va, desde el norte)
  const dLat = Math.sin(rad) * escala;
  const dLon = Math.cos(rad) * escala / Math.cos(lat * Math.PI / 180);
  const p1 = [lat - dLat / 2, lon - dLon / 2];
  const p2 = [lat + dLat / 2, lon + dLon / 2];
  const ang = Math.atan2(dLat, dLon);
  const la = 0.28 * escala;
  const puntas = [ang + 2.65, ang - 2.65].map(a => [
    p2[0] + Math.sin(a) * la * (Math.abs(Math.cos(a)) + 0.6),
    p2[1] + Math.cos(a) * la
  ]);
  return { color, p1, p2, puntas };
}

/* Construye el popup de un favorito como Node real (fix CRITICAL de
   XSS): f.nombre se asigna con textContent, nunca se concatena en un
   string HTML. */
export function crearPopupFavorito(f, onIr) {
  const div = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = f.nombre || 'Favorito';
  div.appendChild(b);
  div.appendChild(document.createElement('br'));
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = 'Usar este spot';
  a.addEventListener('click', (e) => { e.preventDefault(); if (onIr) onIr(f); });
  div.appendChild(a);
  return div;
}

export class PpMapa extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = leafletCss + `
      :host { display: block; width: 100%; height: 100%; }
      .mapa { width: 100%; height: 100%; }
    `;
    shadow.appendChild(style);
    this._div = document.createElement('div');
    this._div.className = 'mapa';
    shadow.appendChild(this._div);

    this._map = null;
    this._capaFlechas = null;
    this._capaSpot = null;
    this._capaSeamark = null;
    this._capaFavs = null;
    this._capaViento = null;
    this._gridDatos = null;
    this._horaSel = 0;
    this._onMoverSpot = null;
  }

  iniciar(spot, callbacks) {
    this._onMoverSpot = callbacks && callbacks.onMoverSpot;
    this._map = L.map(this._div, { zoomControl: true, attributionControl: true })
      .setView([spot.lat, spot.lon], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '© OpenStreetMap'
    }).addTo(this._map);
    this._capaSeamark = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '© OpenSeaMap', opacity: 0.9
    });
    this._capaFlechas = L.layerGroup().addTo(this._map);
    this._capaFavs = L.layerGroup().addTo(this._map);
    this.ponerSpot(spot);
    this._map.on('click', (e) => {
      if (this._onMoverSpot) this._onMoverSpot({ lat: e.latlng.lat, lon: e.latlng.lng });
    });
    return this._map;
  }

  ponerSpot(spot) {
    if (!this._map) return;
    if (this._capaSpot) this._map.removeLayer(this._capaSpot);
    this._capaSpot = L.marker([spot.lat, spot.lon], {
      title: spot.nombre || 'Spot',
      icon: L.divIcon({
        className: 'pp-spot-icon', html: '<div class="pp-pin">📍</div>',
        iconSize: [30, 30], iconAnchor: [15, 28]
      })
    }).addTo(this._map);
    this._map.setView([spot.lat, spot.lon], this._map.getZoom() || 12);
  }

  pintarFavoritos(favs, onIr) {
    if (!this._map) return;
    this._capaFavs.clearLayers();
    favs.forEach(f => {
      L.marker([f.lat, f.lon], {
        icon: L.divIcon({ className: 'pp-fav-icon', html: '⭐', iconSize: [22, 22] })
      }).addTo(this._capaFavs)
        .bindPopup(crearPopupFavorito(f, onIr));
    });
  }

  toggleSeamark(on) {
    if (!this._map) return;
    if (on) this._capaSeamark.addTo(this._map); else this._map.removeLayer(this._capaSeamark);
  }

  /* Guarda los datos de la rejilla de corrientes y pinta la hora seleccionada */
  setCorrientes(grid) {
    this._gridDatos = grid;
    return this.pintarHora(this._horaSel);
  }

  /* indiceHora: desplazamiento en horas desde la primera hora de la serie */
  pintarHora(indiceHora) {
    this._horaSel = indiceHora;
    if (!this._map || !this._gridDatos) return null;
    this._capaFlechas.clearLayers();
    let etiquetaHora = null;
    for (const p of this._gridDatos) {
      if (!p.time || !p.time.length) continue;
      const i = Math.min(indiceHora, p.time.length - 1);
      const vel = p.vel ? p.vel[i] : null;
      const dir = p.dir ? p.dir[i] : null;
      if (etiquetaHora == null && p.time[i]) etiquetaHora = new Date(p.time[i]);
      if (vel == null || dir == null || isNaN(vel)) continue;
      this._dibujarFlecha(p.lat, p.lon, vel, dir);
    }
    return etiquetaHora;
  }

  _dibujarFlecha(lat, lon, vel, dir) {
    const { color, p1, p2, puntas } = calcularFlecha(lat, lon, vel, dir);
    L.polyline([p1, p2], { color, weight: 2.5, opacity: 0.9 }).addTo(this._capaFlechas);
    puntas.forEach(p3 => {
      L.polyline([p2, p3], { color, weight: 2.5, opacity: 0.9 }).addTo(this._capaFlechas);
    });
    L.circleMarker([lat, lon], { radius: 2, color, fillOpacity: 1, opacity: 0.6 })
      .bindTooltip(vel.toFixed(2) + ' m/s → ' + util.gradosACardinal(dir))
      .addTo(this._capaFlechas);
  }

  /* Flecha grande de viento en el spot (direccion meteorologica = de donde viene) */
  pintarViento(lat, lon, vel, dirDesde) {
    if (!this._map) return;
    if (this._capaViento) this._map.removeLayer(this._capaViento);
    if (vel == null || dirDesde == null) return;
    const hacia = (dirDesde + 180) % 360;
    this._capaViento = L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({
        className: 'pp-viento-icon',
        html: '<div class="pp-viento" style="transform:rotate(' + hacia + 'deg)">⬆</div>' +
          '<div class="pp-viento-txt">' + Math.round(vel) + ' km/h</div>',
        iconSize: [60, 60], iconAnchor: [30, 30]
      })
    }).addTo(this._map);
  }

  redibujar() {
    if (this._map) setTimeout(() => this._map.invalidateSize(), 60);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('pp-mapa')) {
  customElements.define('pp-mapa', PpMapa);
}
