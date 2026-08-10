/* PescaPro - Mapa Leaflet: spot, corrientes (flechas por rejilla de puntos con
   selector de hora), viento y carta náutica OpenSeaMap opcional.
   Las corrientes proceden del modelo oceánico de Open-Meteo: muestran el patrón
   previsto hora a hora (que en la costa está dominado por el ciclo de marea,
   es decir, el comportamiento "típico" de la zona se ve deslizando las horas). */
window.PP = window.PP || {};

PP.mapa = (function () {
  let map = null, capaFlechas = null, capaSpot = null, capaSeamark = null, capaFavs = null;
  let gridDatos = null, horaSel = 0, onMoverSpot = null;

  function iniciar(divId, spot, callbacks) {
    onMoverSpot = callbacks && callbacks.onMoverSpot;
    map = L.map(divId, { zoomControl: true, attributionControl: true })
      .setView([spot.lat, spot.lon], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    capaSeamark = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '© OpenSeaMap', opacity: 0.9
    });
    capaFlechas = L.layerGroup().addTo(map);
    capaFavs = L.layerGroup().addTo(map);
    ponerSpot(spot);
    map.on('click', (e) => {
      if (onMoverSpot) onMoverSpot({ lat: e.latlng.lat, lon: e.latlng.lng });
    });
    return map;
  }

  function ponerSpot(spot) {
    if (!map) return;
    if (capaSpot) map.removeLayer(capaSpot);
    capaSpot = L.marker([spot.lat, spot.lon], {
      title: spot.nombre || 'Spot',
      icon: L.divIcon({
        className: 'pp-spot-icon',
        html: '<div class="pp-pin">📍</div>',
        iconSize: [30, 30], iconAnchor: [15, 28]
      })
    }).addTo(map);
    map.setView([spot.lat, spot.lon], map.getZoom() || 12);
  }

  function pintarFavoritos(favs, onIr) {
    if (!map) return;
    capaFavs.clearLayers();
    favs.forEach(f => {
      L.marker([f.lat, f.lon], {
        icon: L.divIcon({ className: 'pp-fav-icon', html: '⭐', iconSize: [22, 22] })
      }).addTo(capaFavs)
        .bindPopup('<b>' + (f.nombre || 'Favorito') + '</b><br><a href="#" data-fav-ir="' + f.lat + ',' + f.lon + '">Usar este spot</a>')
        .on('popupopen', (ev) => {
          const a = ev.popup.getElement().querySelector('[data-fav-ir]');
          if (a) a.addEventListener('click', (e2) => {
            e2.preventDefault();
            if (onIr) onIr(f);
          });
        });
    });
  }

  function toggleSeamark(on) {
    if (!map) return;
    if (on) capaSeamark.addTo(map); else map.removeLayer(capaSeamark);
  }

  /* Guarda los datos de la rejilla de corrientes y pinta la hora seleccionada */
  function setCorrientes(grid) {
    gridDatos = grid;
    pintarHora(horaSel);
  }

  /* indiceHora: desplazamiento en horas desde la primera hora de la serie */
  function pintarHora(indiceHora) {
    horaSel = indiceHora;
    if (!map || !gridDatos) return null;
    capaFlechas.clearLayers();
    let etiquetaHora = null;
    for (const p of gridDatos) {
      if (!p.time || !p.time.length) continue;
      const i = Math.min(indiceHora, p.time.length - 1);
      const vel = p.vel ? p.vel[i] : null;
      const dir = p.dir ? p.dir[i] : null;
      if (etiquetaHora == null && p.time[i]) etiquetaHora = new Date(p.time[i]);
      if (vel == null || dir == null || isNaN(vel)) continue;
      dibujarFlecha(p.lat, p.lon, vel, dir);
    }
    return etiquetaHora;
  }

  /* Flecha de corriente: dirección oceánica = hacia dónde VA el flujo */
  function dibujarFlecha(lat, lon, vel, dir) {
    const color = vel < 0.15 ? '#7f8fa0' : vel < 0.35 ? '#4dabf7' : vel < 0.6 ? '#f59f00' : '#e03131';
    const esc = 0.010 + Math.min(vel, 1.2) * 0.028; // longitud en grados
    const rad = (90 - dir) * Math.PI / 180; // a matemático (dir = hacia dónde va, desde el norte)
    const dLat = Math.sin(rad) * esc;
    const dLon = Math.cos(rad) * esc / Math.cos(lat * Math.PI / 180);
    const p1 = [lat - dLat / 2, lon - dLon / 2];
    const p2 = [lat + dLat / 2, lon + dLon / 2];
    L.polyline([p1, p2], { color, weight: 2.5, opacity: 0.9 }).addTo(capaFlechas);
    // punta de flecha
    const ang = Math.atan2(dLat, dLon);
    const la = 0.28 * esc;
    [ang + 2.65, ang - 2.65].forEach(a => {
      L.polyline([p2, [p2[0] + Math.sin(a) * la * (Math.abs(Math.cos(a)) + 0.6), p2[1] + Math.cos(a) * la]],
        { color, weight: 2.5, opacity: 0.9 }).addTo(capaFlechas);
    });
    L.circleMarker([lat, lon], { radius: 2, color, fillOpacity: 1, opacity: 0.6 })
      .bindTooltip((vel).toFixed(2) + ' m/s → ' + PP.util.gradosACardinal(dir))
      .addTo(capaFlechas);
  }

  /* Flecha grande de viento en el spot (dirección meteorológica = de dónde viene) */
  let capaViento = null;
  function pintarViento(lat, lon, vel, dirDesde) {
    if (!map) return;
    if (capaViento) map.removeLayer(capaViento);
    if (vel == null || dirDesde == null) return;
    const hacia = (dirDesde + 180) % 360;
    capaViento = L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({
        className: 'pp-viento-icon',
        html: '<div class="pp-viento" style="transform:rotate(' + hacia + 'deg)">⬆</div><div class="pp-viento-txt">' + Math.round(vel) + ' km/h</div>',
        iconSize: [60, 60], iconAnchor: [30, 30]
      })
    }).addTo(map);
  }

  function redibujar() { if (map) setTimeout(() => map.invalidateSize(), 60); }

  return { iniciar, ponerSpot, pintarFavoritos, toggleSeamark, setCorrientes, pintarHora, pintarViento, redibujar };
})();
