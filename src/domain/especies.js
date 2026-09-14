/* PescaPro - Base de datos de especies del Cantábrico / norte de España.
   Predicción SIN IA: cada especie define reglas (temporada, temperatura del agua,
   estado del mar, marea, momento del día, luna) y su actividad se calcula
   multiplicando factores en indice.js.

   Campos:
   - meses: peso 0..1 por mes (ene..dic) — temporada
   - sst: [min, opt1, opt2, max] temperatura del agua °C (trapecio)
   - oleaje: [min, opt1, opt2, max] altura de ola en m (trapecio)
   - marea: pesos 0..1 por fase { subiendo, pleamar, bajando, bajamar }
   - momento: pesos 0..1 { amanecer, dia, atardecer, noche }
   - luna: pesos 0..1 [nueva, creciente, llena, menguante] (efecto suave)
   - zonas, tecnicas, cebos: texto orientativo
   - tallaMin: cm (normativa orientativa — verifícala siempre) o null
   - modos: modalidades en las que es objetivo habitual
*/
export const ESPECIES = [
  {
    id: 'lubina', nombre: 'Lubina', cientifico: 'Dicentrarchus labrax', icono: '🐟',
    meses: [0.9, 0.85, 0.7, 0.6, 0.5, 0.45, 0.45, 0.5, 0.65, 0.85, 1.0, 1.0],
    sst: [8, 11, 18, 22],
    oleaje: [0.3, 0.8, 2.0, 3.2],
    marea: { subiendo: 1.0, pleamar: 0.85, bajando: 0.7, bajamar: 0.45 },
    momento: { amanecer: 1.0, dia: 0.45, atardecer: 1.0, noche: 0.85 },
    luna: [1.0, 0.85, 0.75, 0.85],
    zonas: 'Playas batidas, rompientes, bocanas de ría y espigones',
    tecnicas: 'Spinning (paseantes, jerkbaits, vinilos), surfcasting',
    cebos: 'Gusana americana/coreana, cangrejo, sardina',
    tallaMin: 36,
    modos: ['spinning', 'surfcasting'],
    notas: 'La reina del Cantábrico. Con mar movido y espuma se arrima a comer. Los cambios de luz son oro.'
  },
  {
    id: 'dorada', nombre: 'Dorada', cientifico: 'Sparus aurata', icono: '🐠',
    meses: [0.15, 0.15, 0.3, 0.5, 0.75, 0.9, 1.0, 1.0, 0.95, 0.8, 0.5, 0.2],
    sst: [13, 16, 24, 27],
    oleaje: [0, 0.2, 1.2, 2.2],
    marea: { subiendo: 1.0, pleamar: 0.9, bajando: 0.6, bajamar: 0.4 },
    momento: { amanecer: 0.9, dia: 0.7, atardecer: 0.9, noche: 0.75 },
    luna: [0.9, 0.85, 1.0, 0.85],
    zonas: 'Playas con fondo de arena y roca, estuarios, cerca de bateas y puertos',
    tecnicas: 'Surfcasting a fondo, currusquilla',
    cebos: 'Cangrejo ermitaño, navaja, gusana, mejillón, tita',
    tallaMin: 19,
    modos: ['surfcasting'],
    notas: 'Busca moluscos y crustáceos en fondos mixtos. Con marea entrante come confiada. Muy desconfiada con aguas turbias extremas.'
  },
  {
    id: 'sargo', nombre: 'Sargo', cientifico: 'Diplodus sargus', icono: '🐡',
    meses: [0.7, 0.8, 0.95, 1.0, 0.9, 0.7, 0.6, 0.6, 0.8, 0.95, 0.9, 0.75],
    sst: [10, 13, 21, 24],
    oleaje: [0.2, 0.5, 1.6, 2.6],
    marea: { subiendo: 1.0, pleamar: 0.95, bajando: 0.6, bajamar: 0.35 },
    momento: { amanecer: 1.0, dia: 0.6, atardecer: 1.0, noche: 0.7 },
    luna: [0.9, 0.85, 0.9, 0.85],
    zonas: 'Roca batida, espigones, bajos con espuma',
    tecnicas: 'Pesca a fondo ligera, boya, rockfishing',
    cebos: 'Gusana, mejillón, ermitaño, quisquilla',
    tallaMin: 23,
    modos: ['surfcasting', 'spinning'],
    notas: 'Ama la espuma blanca sobre la roca. Con algo de resaca y marea subiendo entra a comer a muy poca agua.'
  },
  {
    id: 'jurel', nombre: 'Jurel / Chicharro', cientifico: 'Trachurus trachurus', icono: '🐟',
    meses: [0.3, 0.3, 0.5, 0.7, 0.9, 1.0, 1.0, 1.0, 0.95, 0.8, 0.5, 0.35],
    sst: [12, 14, 21, 24],
    oleaje: [0, 0.1, 1.0, 1.8],
    marea: { subiendo: 0.9, pleamar: 0.85, bajando: 0.9, bajamar: 0.7 },
    momento: { amanecer: 1.0, dia: 0.5, atardecer: 1.0, noche: 0.95 },
    luna: [1.0, 0.85, 0.7, 0.85],
    zonas: 'Puertos, escolleras, aguas con corriente e iluminadas de noche',
    tecnicas: 'LRF/rockfishing, jigs pequeños, sabiki',
    cebos: 'Gusana, trocitos de sardina, vinilos pequeños',
    tallaMin: 15,
    modos: ['spinning'],
    notas: 'En bancos. De noche se concentra bajo las luces del puerto. Corriente = comida en movimiento.'
  },
  {
    id: 'caballa', nombre: 'Caballa / Verdel', cientifico: 'Scomber scombrus', icono: '🐟',
    meses: [0.2, 0.4, 0.9, 1.0, 1.0, 0.8, 0.5, 0.4, 0.4, 0.3, 0.2, 0.2],
    sst: [10, 12, 18, 21],
    oleaje: [0, 0.1, 1.2, 2.0],
    marea: { subiendo: 0.9, pleamar: 0.85, bajando: 0.9, bajamar: 0.75 },
    momento: { amanecer: 1.0, dia: 0.75, atardecer: 1.0, noche: 0.6 },
    luna: [0.85, 0.85, 0.9, 0.85],
    zonas: 'Escolleras profundas, puertos exteriores, costa abierta en primavera',
    tecnicas: 'Jigs, plumas, spinning con cucharilla',
    cebos: 'Sardina, plumas, cualquier vinilo brillante',
    tallaMin: 20,
    modos: ['spinning'],
    notas: 'La "costera del verdel" (marzo-mayo) arrima bancos enormes a la costa. Come casi cualquier cosa cuando está activa.'
  },
  {
    id: 'lisa', nombre: 'Lisa / Muble', cientifico: 'Chelon labrosus', icono: '🐟',
    meses: [0.7, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.7],
    sst: [8, 12, 24, 28],
    oleaje: [0, 0, 0.6, 1.2],
    marea: { subiendo: 0.9, pleamar: 1.0, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.8, dia: 1.0, atardecer: 0.8, noche: 0.5 },
    luna: [0.85, 0.85, 0.85, 0.85],
    zonas: 'Puertos, rías y estuarios, aguas tranquilas',
    tecnicas: 'Boya con pan, pesca fina',
    cebos: 'Pan, masilla, gusana',
    tallaMin: null,
    modos: ['surfcasting'],
    notas: 'Abundante y desconfiada: buen entrenamiento de pesca fina. Con pleamar en puertos y rías come en superficie.'
  },
  {
    id: 'congrio', nombre: 'Congrio', cientifico: 'Conger conger', icono: '🐍',
    meses: [0.9, 0.9, 0.85, 0.8, 0.7, 0.6, 0.6, 0.6, 0.7, 0.8, 0.9, 0.95],
    sst: [8, 10, 18, 22],
    oleaje: [0, 0.2, 1.5, 2.5],
    marea: { subiendo: 0.9, pleamar: 0.8, bajando: 0.7, bajamar: 0.6 },
    momento: { amanecer: 0.4, dia: 0.1, atardecer: 0.6, noche: 1.0 },
    luna: [1.0, 0.8, 0.5, 0.8],
    zonas: 'Roca profunda, escolleras y puertos de noche, cuevas y grietas',
    tecnicas: 'Fondo con aparejos fuertes y bajos con fluorocarbono grueso',
    cebos: 'Sardina entera, calamar, pota',
    tallaMin: 58,
    modos: ['surfcasting'],
    notas: 'Estrictamente nocturno. Las noches oscuras y templadas de invierno son las mejores. Aparejo fuerte: pelea en su cueva.'
  },
  {
    id: 'faneca', nombre: 'Faneca', cientifico: 'Trisopterus luscus', icono: '🐟',
    meses: [1.0, 1.0, 0.9, 0.7, 0.5, 0.35, 0.3, 0.3, 0.5, 0.8, 0.95, 1.0],
    sst: [8, 10, 16, 19],
    oleaje: [0.1, 0.3, 1.4, 2.4],
    marea: { subiendo: 1.0, pleamar: 0.9, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.8, dia: 0.5, atardecer: 0.9, noche: 1.0 },
    luna: [0.9, 0.85, 0.8, 0.85],
    zonas: 'Fondos mixtos arena-roca, playas profundas, escolleras',
    tecnicas: 'Surfcasting ligero, fondo desde escollera',
    cebos: 'Gusana, quisquilla, mejillón, sardina',
    tallaMin: null,
    modos: ['surfcasting'],
    notas: 'El clásico del invierno cantábrico. Noches frías con mar moderado: fanecada casi asegurada.'
  },
  {
    id: 'salmonete', nombre: 'Salmonete', cientifico: 'Mullus surmuletus', icono: '🐠',
    meses: [0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.0, 1.0, 0.9, 0.7, 0.5, 0.35],
    sst: [12, 15, 22, 25],
    oleaje: [0, 0.1, 0.9, 1.6],
    marea: { subiendo: 0.9, pleamar: 0.8, bajando: 0.8, bajamar: 0.6 },
    momento: { amanecer: 0.9, dia: 0.8, atardecer: 1.0, noche: 0.6 },
    luna: [0.85, 0.85, 0.85, 0.85],
    zonas: 'Fondos de arena limpia, playas tranquilas, dársenas',
    tecnicas: 'Fondo fino con anzuelo pequeño',
    cebos: 'Gusana fina, quisquilla pelada',
    tallaMin: 15,
    modos: ['surfcasting'],
    notas: 'Rebusca en la arena con sus barbillones. Mar en calma y agua clara: se ve incluso comer.'
  },
  {
    id: 'calamar', nombre: 'Calamar', cientifico: 'Loligo vulgaris', icono: '🦑',
    meses: [0.9, 0.7, 0.5, 0.3, 0.15, 0.1, 0.15, 0.3, 0.7, 1.0, 1.0, 1.0],
    sst: [10, 12, 18, 20],
    oleaje: [0, 0, 0.5, 1.0],
    marea: { subiendo: 1.0, pleamar: 0.95, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.8, dia: 0.3, atardecer: 1.0, noche: 1.0 },
    luna: [1.0, 0.85, 0.7, 0.85],
    zonas: 'Puertos y dársenas iluminadas, calas resguardadas con agua clara, praderas de algas',
    tecnicas: 'Eging con jibioneras (egis 1.8–3.0), pesca a la encesa con luz',
    cebos: 'Egis naturales al atardecer, brillantes/glow de noche',
    tallaMin: null,
    modos: ['eging'],
    notas: 'Necesita agua CLARA y en calma. Tras temporales, espera 2-3 días a que aclare. Noches oscuras junto a luces de puerto son letales.'
  },
  {
    id: 'sepia', nombre: 'Sepia / Choco', cientifico: 'Sepia officinalis', icono: '🦑',
    meses: [0.5, 0.8, 1.0, 1.0, 0.8, 0.4, 0.2, 0.2, 0.4, 0.6, 0.6, 0.5],
    sst: [10, 12, 20, 23],
    oleaje: [0, 0, 0.6, 1.2],
    marea: { subiendo: 1.0, pleamar: 0.9, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.9, dia: 0.7, atardecer: 1.0, noche: 0.9 },
    luna: [0.9, 0.85, 0.85, 0.85],
    zonas: 'Fondos de arena y algas someros, bahías resguardadas, cerca de praderas',
    tecnicas: 'Eging lento cerca del fondo, jibión lastrado',
    cebos: 'Egis arrastradas por el fondo, cangrejo en aparejos específicos',
    tallaMin: null,
    modos: ['eging'],
    notas: 'En primavera se arrima a muy poca agua a desovar. Trabaja la egi LENTA y pegada al fondo: ataca al posarse.'
  },
  {
    id: 'pulpo', nombre: 'Pulpo', cientifico: 'Octopus vulgaris', icono: '🐙',
    meses: [0.7, 0.6, 0.5, 0.4, 0.4, 0.5, 0.8, 1.0, 1.0, 1.0, 0.9, 0.8],
    sst: [10, 12, 20, 24],
    oleaje: [0, 0, 0.7, 1.3],
    marea: { subiendo: 0.6, pleamar: 0.5, bajando: 0.9, bajamar: 1.0 },
    momento: { amanecer: 0.9, dia: 0.9, atardecer: 0.9, noche: 0.6 },
    luna: [0.85, 0.85, 0.85, 0.85],
    zonas: 'Roca somera con grietas y pozas, bajamar con agua clara',
    tecnicas: 'Pulpera/cangrejera trabajada a fondo entre rocas',
    cebos: 'Pulperas blancas o con cangrejo',
    tallaMin: null,
    pesoMin: 1,
    modos: ['eging'],
    notas: 'IMPORTANTE: su pesca recreativa está muy regulada o vedada en varias comunidades del Cantábrico. Consulta la normativa antes de pescarlo. Peso mínimo habitual: 1 kg.'
  }
];

/* Devuelve la especie por id */
export function especiePorId(id) {
  return ESPECIES.find(e => e.id === id) || null;
}
