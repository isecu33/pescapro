/* Smoke test de la interfaz: renderiza todas las vistas con DOM simulado (jsdom)
   y comprueba que no lanzan errores y producen contenido.
   Requiere: npm i jsdom --no-save  (si no está, se salta sin fallar) */
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.log('jsdom no instalado: smoke test de UI saltado (npm i jsdom --no-save para ejecutarlo)'); process.exit(0); }

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <header class="pp-header">
    <div id="hdr-spot"><span id="hdr-spot-nombre"></span><span id="hdr-update"></span></div>
    <button id="btn-fav"></button><button id="btn-refrescar"></button>
  </header>
  <div id="aviso-seguridad" style="display:none"></div>
  <main>
    <section id="vista-ahora" class="pp-vista activa"></section>
    <section id="vista-prevision" class="pp-vista"></section>
    <section id="vista-mapa" class="pp-vista"><div id="mapa"></div><span id="mapa-estado"></span><span id="mapa-hora"></span></section>
    <section id="vista-especies" class="pp-vista"></section>
    <section id="vista-cuaderno" class="pp-vista"></section>
    <section id="vista-trofeos" class="pp-vista"></section>
  </main>
  <nav class="pp-nav"><button data-vista="ahora"></button></nav>
</body></html>`, { url: 'https://localhost/' });

// Puente de globals navegador → Node (window.PP y PP deben ser el MISMO objeto)
global.PP = {};
dom.window.PP = global.PP;
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.navigator = dom.window.navigator;
global.confirm = () => true;
global.alert = () => { };
global.prompt = () => null;
global.SunCalc = require('../www/lib/suncalc.js');

require('../www/js/config.js');
require('../www/js/especies.js');
require('../www/js/api.js');
require('../www/js/mareas.js');
require('../www/js/solunar.js');
require('../www/js/indice.js');
require('../www/js/fotos.js');
require('../www/js/cuaderno.js');
require('../www/js/records.js');
require('../www/js/trofeos.js');
require('../www/js/ui.js');

const { generarDatos } = require('./fixtures');

let fallos = 0, ok = 0;
function check(cond, msg) {
  if (cond) { ok++; console.log('  ✓ ' + msg); }
  else { fallos++; console.error('  ✗ FALLO: ' + msg); }
}

(async () => {
  console.log('SMOKE TEST UI');
  const datos = generarDatos({});
  const st = {
    spot: { nombre: 'Zarautz', lat: 43.29, lon: -2.17 },
    modo: 'spinning',
    datos,
    ctx: PP.indice.preparar(datos),
    cargando: false,
    vista: 'ahora'
  };

  try {
    PP.ui.renderCabecera(st);
    check(document.querySelector('#hdr-spot-nombre').textContent === 'Zarautz', 'cabecera renderizada');

    PP.ui.renderAhora(st);
    const ahora = document.querySelector('#vista-ahora');
    check(ahora.innerHTML.length > 500, 'vista Ahora renderizada (' + ahora.innerHTML.length + ' chars)');
    check(ahora.querySelector('.pp-gauge') != null, 'gauge del índice presente');
    check(ahora.textContent.includes('Marea'), 'tarjeta de marea presente');
    check(ahora.textContent.includes('Especies activas'), 'especies activas presentes');

    PP.ui.renderPrevision(st);
    const prev = document.querySelector('#vista-prevision');
    check(prev.querySelectorAll('.pp-graf-col').length > 48, 'gráfico horario con barras (' + prev.querySelectorAll('.pp-graf-col').length + ')');

    PP.ui.renderEspecies(st);
    check(document.querySelectorAll('#vista-especies .pp-esp-card').length === PP.ESPECIES.length, 'grid de especies completo');

    PP.ui.renderCuaderno(st);
    check(document.querySelector('#vista-cuaderno .pp-boton-principal') != null, 'cuaderno con botón de captura');

    // Fotos: sin IndexedDB (jsdom) el módulo degrada sin romper
    const sinFoto = await PP.fotos.obtener('no_existe');
    check(sinFoto === null, 'fotos.obtener degrada a null sin IndexedDB');
    const borrado = await PP.fotos.borrar('no_existe');
    check(borrado === false, 'fotos.borrar degrada sin lanzar');

    // Cuaderno: captura sin foto y captura con fotoId
    PP.cuaderno.anadir({
      especie: 'lubina', talla: 42, modalidad: 'spinning',
      condiciones: { faseMarea: 'subiendo', luna: 'Luna nueva', momento: 'atardecer', viento: 12, indice: 68 }
    });
    PP.cuaderno.anadir({
      especie: 'calamar', modalidad: 'eging', fotoId: 'f_test',
      condiciones: { faseMarea: 'pleamar', luna: 'Luna nueva', momento: 'noche', viento: 6, indice: 74 }
    });
    PP.ui.renderCuaderno(st);
    const cu = document.querySelector('#vista-cuaderno');
    check(cu.textContent.includes('Lubina'), 'captura registrada y listada');
    check(cu.textContent.includes('Tus patrones'), 'estadísticas visibles');
    check(cu.textContent.includes('Galería'), 'galería visible cuando hay fotos');
    check(cu.querySelectorAll('.pp-galeria-celda').length === 1, 'una miniatura en la galería');
    check(cu.querySelector('.pp-captura-thumb') != null, 'miniatura en el historial');

    // Visor de foto
    PP.ui.modalFoto(PP.cuaderno.leer()[0]);
    check(document.getElementById('pp-modal') != null, 'visor de foto abierto');
    check(document.querySelector('#pp-modal .pp-foto-grande') != null, 'imagen grande presente');
    PP.ui.cerrarModal();

    // Borrado en cascada (no debe romper sin IndexedDB)
    const idFoto = PP.cuaderno.leer().find(c => c.fotoId).id;
    PP.cuaderno.borrar(idFoto);
    check(!PP.cuaderno.leer().some(c => c.fotoId), 'captura con foto borrada (cascada sin errores)');

    // Modal de especie
    PP.ui.modalEspecie(PP.especiePorId('calamar'), st);
    check(document.getElementById('pp-modal') != null, 'modal de especie abierto');
    check(document.getElementById('pp-modal').textContent.includes('Temporada'), 'ficha con temporada');
    PP.ui.cerrarModal();
    check(document.getElementById('pp-modal') == null, 'modal cerrado');

    // ---- Trofeos: récords, logros y competiciones ----
    PP.liga.setNombre('Tester');
    const fISO = (d) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10);
    const liga = PP.liga.crear({ nombre: 'Liga smoke', desde: fISO(-1), hasta: fISO(7), modo: 'puntos' });
    PP.liga.actualizarMiResultado(liga.id);
    PP.uiTrofeos.render(st);
    const tr = document.querySelector('#vista-trofeos');
    check(tr.textContent.includes('Récords personales'), 'trofeos: récords presentes');
    check(tr.textContent.includes('Capturas totales'), 'trofeos: contador de capturas');
    check(tr.querySelectorAll('.pp-logro').length === PP.logros.LISTA.length, 'trofeos: todos los logros pintados (' + PP.logros.LISTA.length + ')');
    check(tr.querySelectorAll('.pp-logro.conseguido').length >= 1, 'trofeos: al menos un logro conseguido');
    check(tr.textContent.includes('Liga smoke'), 'trofeos: competición listada');
    check(tr.textContent.includes('🥇'), 'trofeos: líder mostrado en la tarjeta de la liga');

    // Estado sin datos no revienta
    PP.ui.renderAhora({ spot: st.spot, modo: 'eging', datos: null, ctx: null });
    check(true, 'render sin datos no lanza errores');
  } catch (e) {
    fallos++;
    console.error('  ✗ EXCEPCIÓN: ' + e.message + '\n' + e.stack);
  }

  console.log('---- ui: ' + ok + ' ok, ' + fallos + ' fallos ----');
  process.exit(fallos ? 1 : 0);
})();
