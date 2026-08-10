/* Carga los módulos del navegador en Node para testearlos */
global.window = global;
global.SunCalc = require('../www/lib/suncalc.js');
require('../www/js/config.js');
require('../www/js/especies.js');
require('../www/js/api.js');
require('../www/js/mareas.js');
require('../www/js/solunar.js');
require('../www/js/indice.js');

let fallos = 0, ok = 0;
function check(cond, msg) {
  if (cond) { ok++; console.log('  ✓ ' + msg); }
  else { fallos++; console.error('  ✗ FALLO: ' + msg); }
}
function resumen(nombre) {
  console.log('---- ' + nombre + ': ' + ok + ' ok, ' + fallos + ' fallos ----');
  if (fallos > 0) process.exit(1);
}

module.exports = { PP: global.PP, check, resumen };
