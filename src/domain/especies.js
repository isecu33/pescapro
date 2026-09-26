/* PescaPro - Base de datos de especies del Cantábrico / norte de España.
   Predicción SIN IA: cada especie define reglas (temporada, temperatura del agua,
   estado del mar, marea, momento del día, luna) y su actividad se calcula
   como media geométrica ponderada de esos factores (src/domain/indice.js).

   Campos añadidos respecto al original:
   - silhoueta: { vb, d } — viewBox y path SVG de la silueta (fill:currentColor)
   - foto: ruta relativa al WebP bundleado (ver /public/img/especies/)
   - reglamento: datos de Galicia (talla, cupo, veda). VERIFICAR con Consellería
     do Mar / Xunta de Galicia antes de pescar — la normativa cambia.

   Actividad = media geométrica de factores ponderados [0..1]:
   - modos: modalidades en las que es objetivo habitual
*/
export const ESPECIES = [
  {
    id: 'lubina', nombre: 'Lubina', cientifico: 'Dicentrarchus labrax', icono: '🐟', imagen: './iconos/svg/lubina.svg', foto: './iconos/png/lubina.png',
    meses: [0.9, 0.85, 0.7, 0.6, 0.5, 0.45, 0.45, 0.5, 0.65, 0.85, 1.0, 1.0],
    sst: [8, 11, 18, 22],
    oleaje: [0.3, 0.8, 2.0, 3.2],
    marea: { subiendo: 1.0, pleamar: 0.85, bajando: 0.7, bajamar: 0.45 },
    momento: { amanecer: 1.0, dia: 0.45, atardecer: 1.0, noche: 0.85 },
    luna: [1.0, 0.85, 0.75, 0.85],
    zonas: 'Playas batidas, rompientes, bocanas de ría y espigones',
    tecnicas: 'Spinning (paseantes, jerkbaits, vinilos), surfcasting',
    cebos: 'Gusana americana/coreana, cangrejo, sardina',
    modos: ['spinning', 'surfcasting'],
    notas: 'La reina del Cantábrico. Con mar movido y espuma se arrima a comer. Los cambios de luz son oro.',
    reglamento: {
      tallaMin: 36, pesoMin: null, cupo: 5, veda: null,
      nota: 'Galicia: 36 cm mínimo, cupo 5 ejemplares/día en recreativa. Fuente: Xunta de Galicia.'
    },
    silhoueta: {
      vb: '0 0 120 60',
      d: 'M5,30 C10,16 25,10 55,10 C80,10 100,16 108,24 L118,15 L112,30 L118,45 L108,36 C100,44 80,50 55,50 C25,50 10,44 5,30 Z'
    }
  },
  {
    id: 'dorada', nombre: 'Dorada', cientifico: 'Sparus aurata', icono: '🐠', imagen: './iconos/svg/dorada.svg', foto: './iconos/png/dorada.png',
    meses: [0.15, 0.15, 0.3, 0.5, 0.75, 0.9, 1.0, 1.0, 0.95, 0.8, 0.5, 0.2],
    sst: [13, 16, 24, 27],
    oleaje: [0, 0.2, 1.2, 2.2],
    marea: { subiendo: 1.0, pleamar: 0.9, bajando: 0.6, bajamar: 0.4 },
    momento: { amanecer: 0.9, dia: 0.7, atardecer: 0.9, noche: 0.75 },
    luna: [0.9, 0.85, 1.0, 0.85],
    zonas: 'Playas con fondo de arena y roca, estuarios, cerca de bateas y puertos',
    tecnicas: 'Surfcasting a fondo, currusquilla',
    cebos: 'Cangrejo ermitaño, navaja, gusana, mejillón, tita',
    modos: ['surfcasting'],
    notas: 'Busca moluscos y crustáceos en fondos mixtos. Con marea entrante come confiada. Muy desconfiada con aguas turbias extremas.',
    reglamento: {
      tallaMin: 19, pesoMin: null, cupo: 5, veda: null,
      nota: 'Galicia: 19 cm mínimo, cupo 5 ejemplares/día. Fuente: Xunta de Galicia.'
    },
    silhoueta: {
      vb: '0 0 110 64',
      d: 'M12,32 C11,18 18,8 40,7 C65,6 95,13 104,26 L110,19 L106,32 L110,45 L104,38 C95,51 65,58 40,57 C18,56 11,46 12,32 Z'
    }
  },
  {
    id: 'sargo', nombre: 'Sargo', cientifico: 'Diplodus sargus', icono: '🐡', imagen: './iconos/svg/sargo.svg', foto: null,
    meses: [0.7, 0.8, 0.95, 1.0, 0.9, 0.7, 0.6, 0.6, 0.8, 0.95, 0.9, 0.75],
    sst: [10, 13, 21, 24],
    oleaje: [0.2, 0.5, 1.6, 2.6],
    marea: { subiendo: 1.0, pleamar: 0.95, bajando: 0.6, bajamar: 0.35 },
    momento: { amanecer: 1.0, dia: 0.6, atardecer: 1.0, noche: 0.7 },
    luna: [0.9, 0.85, 0.9, 0.85],
    zonas: 'Roca batida, espigones, bajos con espuma',
    tecnicas: 'Pesca a fondo ligera, boya, rockfishing',
    cebos: 'Gusana, mejillón, ermitaño, quisquilla',
    modos: ['surfcasting', 'spinning'],
    notas: 'Ama la espuma blanca sobre la roca. Con algo de resaca y marea subiendo entra a comer a muy poca agua.',
    reglamento: {
      tallaMin: 23, pesoMin: null, cupo: null, veda: null,
      nota: 'Galicia: 23 cm mínimo. Fuente: Xunta de Galicia.'
    },
    silhoueta: {
      vb: '0 0 108 68',
      d: 'M16,34 C14,16 22,4 46,4 C70,4 96,12 103,28 L108,20 L104,34 L108,48 L103,40 C96,56 70,64 46,64 C22,64 14,52 16,34 Z'
    }
  },
  {
    id: 'jurel', nombre: 'Jurel / Chicharro', cientifico: 'Trachurus trachurus', icono: '🐟', imagen: './iconos/svg/jurel-chicharro.svg', foto: './iconos/png/jurel-chicharro.png',
    meses: [0.3, 0.3, 0.5, 0.7, 0.9, 1.0, 1.0, 1.0, 0.95, 0.8, 0.5, 0.35],
    sst: [12, 14, 21, 24],
    oleaje: [0, 0.1, 1.0, 1.8],
    marea: { subiendo: 0.9, pleamar: 0.85, bajando: 0.9, bajamar: 0.7 },
    momento: { amanecer: 1.0, dia: 0.5, atardecer: 1.0, noche: 0.95 },
    luna: [1.0, 0.85, 0.7, 0.85],
    zonas: 'Puertos, escolleras, aguas con corriente e iluminadas de noche',
    tecnicas: 'LRF/rockfishing, jigs pequeños, sabiki',
    cebos: 'Gusana, trocitos de sardina, vinilos pequeños',
    modos: ['spinning'],
    notas: 'En bancos. De noche se concentra bajo las luces del puerto. Corriente = comida en movimiento.',
    reglamento: {
      tallaMin: 15, pesoMin: null, cupo: null, veda: null,
      nota: 'Galicia: 15 cm mínimo (reglamento UE). Sin cupo diario establecido en recreativa. Fuente: Xunta de Galicia.'
    },
    silhoueta: {
      vb: '0 0 130 56',
      d: 'M5,28 C8,17 22,11 52,11 C80,11 108,17 116,24 L128,13 L120,28 L128,43 L116,36 C108,45 80,45 52,45 C22,45 8,39 5,28 Z'
    }
  },
  {
    id: 'caballa', nombre: 'Caballa / Verdel', cientifico: 'Scomber scombrus', icono: '🐟', imagen: './iconos/svg/caballa-verdel.svg', foto: './iconos/png/caballa-verdel.png',
    meses: [0.2, 0.4, 0.9, 1.0, 1.0, 0.8, 0.5, 0.4, 0.4, 0.3, 0.2, 0.2],
    sst: [10, 12, 18, 21],
    oleaje: [0, 0.1, 1.2, 2.0],
    marea: { subiendo: 0.9, pleamar: 0.85, bajando: 0.9, bajamar: 0.75 },
    momento: { amanecer: 1.0, dia: 0.75, atardecer: 1.0, noche: 0.6 },
    luna: [0.85, 0.85, 0.9, 0.85],
    zonas: 'Escolleras profundas, puertos exteriores, costa abierta en primavera',
    tecnicas: 'Jigs, plumas, spinning con cucharilla',
    cebos: 'Sardina, plumas, cualquier vinilo brillante',
    modos: ['spinning'],
    notas: 'La "costera del verdel" (marzo-mayo) arrima bancos enormes a la costa. Come casi cualquier cosa cuando está activa.',
    reglamento: {
      tallaMin: 20, pesoMin: null, cupo: null, veda: null,
      nota: 'Galicia: 20 cm mínimo. Fuente: Xunta de Galicia / UE.'
    },
    silhoueta: {
      vb: '0 0 135 54',
      d: 'M4,27 C7,16 20,10 48,10 C78,10 108,17 118,24 L132,11 L123,27 L132,43 L118,34 C108,41 78,44 48,44 C20,44 7,38 4,27 Z'
    }
  },
  {
    id: 'lisa', nombre: 'Lisa / Muble', cientifico: 'Chelon labrosus', icono: '🐟', imagen: './iconos/svg/lisa-muble.svg', foto: './iconos/png/lisa-muble.png',
    meses: [0.7, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.7],
    sst: [8, 12, 24, 28],
    oleaje: [0, 0, 0.6, 1.2],
    marea: { subiendo: 0.9, pleamar: 1.0, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.8, dia: 1.0, atardecer: 0.8, noche: 0.5 },
    luna: [0.85, 0.85, 0.85, 0.85],
    zonas: 'Puertos, rías y estuarios, aguas tranquilas',
    tecnicas: 'Boya con pan, pesca fina',
    cebos: 'Pan, masilla, gusana',
    modos: ['surfcasting'],
    notas: 'Abundante y desconfiada: buen entrenamiento de pesca fina. Con pleamar en puertos y rías come en superficie.',
    reglamento: {
      tallaMin: null, pesoMin: null, cupo: null, veda: null,
      nota: 'Sin talla mínima establecida en Galicia para la lisa. Pesca muy común en rías. Verificar con Consellería do Mar.'
    },
    silhoueta: {
      vb: '0 0 120 54',
      d: 'M8,27 C12,17 26,13 55,13 C84,13 102,17 110,24 L116,18 L112,27 L116,36 L110,30 C102,37 84,41 55,41 C26,41 12,37 8,27 Z'
    }
  },
  {
    id: 'congrio', nombre: 'Congrio', cientifico: 'Conger conger', icono: '🐍', imagen: './iconos/svg/congrio.svg', foto: './iconos/png/congrio.png',
    meses: [0.9, 0.9, 0.85, 0.8, 0.7, 0.6, 0.6, 0.6, 0.7, 0.8, 0.9, 0.95],
    sst: [8, 10, 18, 22],
    oleaje: [0, 0.2, 1.5, 2.5],
    marea: { subiendo: 0.9, pleamar: 0.8, bajando: 0.7, bajamar: 0.6 },
    momento: { amanecer: 0.4, dia: 0.1, atardecer: 0.6, noche: 1.0 },
    luna: [1.0, 0.8, 0.5, 0.8],
    zonas: 'Roca profunda, escolleras y puertos de noche, cuevas y grietas',
    tecnicas: 'Fondo con aparejos fuertes y bajos con fluorocarbono grueso',
    cebos: 'Sardina entera, calamar, pota',
    modos: ['surfcasting'],
    notas: 'Estrictamente nocturno. Las noches oscuras y templadas de invierno son las mejores. Aparejo fuerte: pelea en su cueva.',
    reglamento: {
      tallaMin: 58, pesoMin: null, cupo: null, veda: null,
      nota: 'Galicia: 58 cm mínimo. Fuente: Reglamento UE / Xunta de Galicia.'
    },
    silhoueta: {
      vb: '0 0 200 36',
      d: 'M5,16 C40,6 80,22 115,12 C150,4 180,16 196,12 L198,14 L198,18 C180,24 150,32 115,24 C80,18 40,30 5,22 Z'
    }
  },
  {
    id: 'faneca', nombre: 'Faneca', cientifico: 'Trisopterus luscus', icono: '🐟', imagen: './iconos/svg/faneca.svg', foto: './iconos/png/faneca.png',
    meses: [1.0, 1.0, 0.9, 0.7, 0.5, 0.35, 0.3, 0.3, 0.5, 0.8, 0.95, 1.0],
    sst: [8, 10, 16, 19],
    oleaje: [0.1, 0.3, 1.4, 2.4],
    marea: { subiendo: 1.0, pleamar: 0.9, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.8, dia: 0.5, atardecer: 0.9, noche: 1.0 },
    luna: [0.9, 0.85, 0.8, 0.85],
    zonas: 'Fondos mixtos arena-roca, playas profundas, escolleras',
    tecnicas: 'Surfcasting ligero, fondo desde escollera',
    cebos: 'Gusana, quisquilla, mejillón, sardina',
    modos: ['surfcasting'],
    notas: 'El clásico del invierno cantábrico. Noches frías con mar moderado: fanecada casi asegurada.',
    reglamento: {
      tallaMin: null, pesoMin: null, cupo: null, veda: null,
      nota: 'Sin talla mínima establecida para la faneca en Galicia. Verificar con Consellería do Mar.'
    },
    silhoueta: {
      vb: '0 0 115 58',
      d: 'M8,29 C9,18 18,12 40,12 C65,12 88,18 100,26 L108,30 L100,34 C88,42 65,46 40,46 C18,46 9,40 8,29 Z'
    }
  },
  {
    id: 'salmonete', nombre: 'Salmonete', cientifico: 'Mullus surmuletus', icono: '🐠', imagen: './iconos/svg/salmonete.svg', foto: './iconos/png/salmonete.png',
    meses: [0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.0, 1.0, 0.9, 0.7, 0.5, 0.35],
    sst: [12, 15, 22, 25],
    oleaje: [0, 0.1, 0.9, 1.6],
    marea: { subiendo: 0.9, pleamar: 0.8, bajando: 0.8, bajamar: 0.6 },
    momento: { amanecer: 0.9, dia: 0.8, atardecer: 1.0, noche: 0.6 },
    luna: [0.85, 0.85, 0.85, 0.85],
    zonas: 'Fondos de arena limpia, playas tranquilas, dársenas',
    tecnicas: 'Fondo fino con anzuelo pequeño',
    cebos: 'Gusana fina, quisquilla pelada',
    modos: ['surfcasting'],
    notas: 'Rebusca en la arena con sus barbillones. Mar en calma y agua clara: se ve incluso comer.',
    reglamento: {
      tallaMin: 15, pesoMin: null, cupo: null, veda: null,
      nota: 'Galicia: 15 cm mínimo. Fuente: Xunta de Galicia / UE.'
    },
    silhoueta: {
      vb: '0 0 108 56',
      d: 'M10,28 C12,20 22,16 44,15 C70,14 90,18 98,26 L106,20 L102,28 L106,36 L98,30 C90,38 70,42 44,41 C22,40 12,36 10,28 Z M10,28 L2,36 M11,30 L3,40'
    }
  },
  {
    id: 'calamar', nombre: 'Calamar', cientifico: 'Loligo vulgaris', icono: '🦑', imagen: './iconos/svg/calamar.svg', foto: './iconos/png/calamar.png',
    meses: [0.9, 0.7, 0.5, 0.3, 0.15, 0.1, 0.15, 0.3, 0.7, 1.0, 1.0, 1.0],
    sst: [10, 12, 18, 20],
    oleaje: [0, 0, 0.5, 1.0],
    marea: { subiendo: 1.0, pleamar: 0.95, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.8, dia: 0.3, atardecer: 1.0, noche: 1.0 },
    luna: [1.0, 0.85, 0.7, 0.85],
    zonas: 'Puertos y dársenas iluminadas, calas resguardadas con agua clara, praderas de algas',
    tecnicas: 'Eging con jibioneras (egis 1.8–3.0), pesca a la encesa con luz',
    cebos: 'Egis naturales al atardecer, brillantes/glow de noche',
    modos: ['eging'],
    notas: 'Necesita agua CLARA y en calma. Tras temporales, espera 2-3 días a que aclare. Noches oscuras junto a luces de puerto son letales.',
    reglamento: {
      tallaMin: null, pesoMin: null, cupo: null, veda: null,
      nota: 'Sin talla mínima establecida para el calamar en recreativa en Galicia. Verificar con Consellería do Mar.'
    },
    silhoueta: {
      vb: '0 0 150 62',
      d: 'M40,31 C40,18 58,13 92,15 C118,17 134,23 138,31 C134,39 118,45 92,47 C58,49 40,44 40,31 Z M138,31 L150,20 L143,31 L150,42 Z M40,31 L24,18 M40,31 L20,26 M40,31 L18,31 M40,31 L20,36 M40,31 L24,44'
    }
  },
  {
    id: 'sepia', nombre: 'Sepia / Choco', cientifico: 'Sepia officinalis', icono: '🦑', imagen: './iconos/svg/sepia.svg', foto: './iconos/png/sepia.png',
    meses: [0.5, 0.8, 1.0, 1.0, 0.8, 0.4, 0.2, 0.2, 0.4, 0.6, 0.6, 0.5],
    sst: [10, 12, 20, 23],
    oleaje: [0, 0, 0.6, 1.2],
    marea: { subiendo: 1.0, pleamar: 0.9, bajando: 0.7, bajamar: 0.5 },
    momento: { amanecer: 0.9, dia: 0.7, atardecer: 1.0, noche: 0.9 },
    luna: [0.9, 0.85, 0.85, 0.85],
    zonas: 'Fondos de arena y algas someros, bahías resguardadas, cerca de praderas',
    tecnicas: 'Eging lento cerca del fondo, jibión lastrado',
    cebos: 'Egis arrastradas por el fondo, cangrejo en aparejos específicos',
    modos: ['eging'],
    notas: 'En primavera se arrima a muy poca agua a desovar. Trabaja la egi LENTA y pegada al fondo: ataca al posarse.',
    reglamento: {
      tallaMin: null, pesoMin: null, cupo: null, veda: null,
      nota: 'Sin talla mínima para la sepia en Galicia en recreativa. Verificar con Consellería do Mar.'
    },
    silhoueta: {
      vb: '0 0 120 70',
      d: 'M18,35 C17,15 32,5 60,5 C88,5 103,15 102,35 C103,55 88,65 60,65 C32,65 17,55 18,35 Z M60,65 L50,72 M60,65 L60,74 M60,65 L70,72'
    }
  },
  {
    id: 'pulpo', nombre: 'Pulpo', cientifico: 'Octopus vulgaris', icono: '🐙', imagen: './iconos/svg/pulpo.svg', foto: './iconos/png/pulpo.png',
    meses: [0.7, 0.6, 0.5, 0.4, 0.4, 0.5, 0.8, 1.0, 1.0, 1.0, 0.9, 0.8],
    sst: [10, 12, 20, 24],
    oleaje: [0, 0, 0.7, 1.3],
    marea: { subiendo: 0.6, pleamar: 0.5, bajando: 0.9, bajamar: 1.0 },
    momento: { amanecer: 0.9, dia: 0.9, atardecer: 0.9, noche: 0.6 },
    luna: [0.85, 0.85, 0.85, 0.85],
    zonas: 'Roca somera con grietas y pozas, bajamar con agua clara',
    tecnicas: 'Pulpera/cangrejera trabajada a fondo entre rocas',
    cebos: 'Pulperas blancas o con cangrejo',
    modos: ['eging'],
    notas: 'IMPORTANTE: su pesca recreativa está muy regulada o vedada en varias comunidades del Cantábrico. Consulta la normativa antes de pescarlo.',
    reglamento: {
      tallaMin: null, pesoMin: 1, cupo: null,
      veda: 'Consultar — vedas frecuentes en Galicia',
      nota: 'Galicia: peso mínimo 1 kg habitual; sujeto a vedas y cuotas por cofradías. VERIFICAR antes de pescar con Consellería do Mar.'
    },
    silhoueta: {
      vb: '0 0 120 90',
      d: 'M60,36 C44,36 36,26 42,18 C48,10 56,8 60,8 C64,8 72,10 78,18 C84,26 76,36 60,36 Z M60,36 C50,40 38,58 32,72 M60,36 C54,42 46,62 42,76 M60,36 C57,44 56,66 54,80 M60,36 C63,44 64,66 66,80 M60,36 C66,42 74,62 78,76 M60,36 C70,40 82,58 88,72 M60,36 C54,36 40,46 30,54 M60,36 C66,36 80,46 90,54'
    }
  }
];

/* Devuelve la especie por id */
export function especiePorId(id) {
  return ESPECIES.find(e => e.id === id) || null;
}

/* Crea un elemento de imagen de la especie.
   Si la especie tiene imagen → <img> con clase `cls`
   Si no → <span> con el emoji icono.
   Este es el único punto donde se decide qué mostrar. */
export function espImgEl(esp, cls) {
  if (esp && esp.imagen) {
    const img = document.createElement('img');
    img.src = esp.imagen;
    img.alt = esp.nombre;
    if (cls) img.className = cls;
    return img;
  }
  const span = document.createElement('span');
  span.textContent = esp ? esp.icono : '🐟';
  if (cls) span.className = cls;
  return span;
}
