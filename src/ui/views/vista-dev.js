/* PescaPro - Panel de modo desarrollador.
   Solo se monta si domain/dev.js está activo (import.meta.env.DEV) --
   quien abre este panel ya ha comprobado eso (ver app-shell.js/app.js).

   Permite forzar el estado de "conseguido" de cada logro y el nivel del
   banner de seguridad de la vista Ahora, sin tocar el cuaderno real. El
   override vive en su propia clave de localStorage (domain/dev.js) y se
   puede limpiar de un toque con "Quitar todos los overrides". */
import { LISTA, evaluar } from '../../domain/records/logros.js';
import { leer as leerCapturas } from '../../domain/cuaderno.js';
import { crearIcoLogro } from './vista-trofeos.js';
import {
  logroOverride, setLogroOverride,
  seguridadOverride, setSeguridadOverride,
  resetOverrides
} from '../../domain/dev.js';

const NIVELES = [
  { valor: null, etiqueta: 'Auto' },
  { valor: 'ok', etiqueta: 'Ok' },
  { valor: 'amarillo', etiqueta: 'Amarillo' },
  { valor: 'rojo', etiqueta: 'Rojo' }
];

export function panelDev() {
  const cont = document.createElement('div');
  cont.className = 'pp-dev-panel';
  render(cont);
  return cont;
}

function render(cont) {
  cont.replaceChildren();

  const titulo = document.createElement('h3');
  titulo.textContent = '🛠️ Modo desarrollador';
  cont.appendChild(titulo);

  const aviso = document.createElement('p');
  aviso.className = 'pp-nota';
  aviso.textContent = 'Solo visible en desarrollo (npm run dev). No toca tus capturas reales ni el cuaderno.';
  cont.appendChild(aviso);

  cont.appendChild(seccionSeguridad(cont));
  cont.appendChild(seccionLogros(cont));

  const btnReset = document.createElement('button');
  btnReset.className = 'pp-chip';
  btnReset.style.marginTop = '14px';
  btnReset.textContent = 'Quitar todos los overrides';
  btnReset.addEventListener('click', () => { resetOverrides(); render(cont); });
  cont.appendChild(btnReset);
}

function seccionSeguridad(cont) {
  const card = document.createElement('div');
  card.className = 'pp-card';

  const h = document.createElement('h3');
  h.textContent = 'Banner de seguridad (vista Ahora)';
  card.appendChild(h);

  const actual = seguridadOverride();
  const fila = document.createElement('div');
  fila.className = 'pp-dev-chips';
  NIVELES.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'pp-chip' + (actual === n.valor ? ' pp-chip-acento' : '');
    btn.textContent = n.etiqueta;
    btn.addEventListener('click', () => { setSeguridadOverride(n.valor); render(cont); });
    fila.appendChild(btn);
  });
  card.appendChild(fila);
  return card;
}

function seccionLogros(cont) {
  const card = document.createElement('div');
  card.className = 'pp-card';

  const capturas = leerCapturas();
  const logros = evaluar(capturas);

  const h = document.createElement('h3');
  const conseguidos = logros.filter(l => l.conseguido).length;
  h.textContent = 'Logros (' + conseguidos + '/' + logros.length + ')';
  card.appendChild(h);

  logros.forEach(l => card.appendChild(filaLogro(l, cont)));
  return card;
}

function filaLogro(l, cont) {
  const fila = document.createElement('div');
  fila.className = 'pp-dev-fila';

  fila.appendChild(crearIcoLogro(l));

  const nombre = document.createElement('span');
  nombre.className = 'pp-dev-fila-nombre';
  nombre.textContent = l.nombre;
  fila.appendChild(nombre);

  const actual = logroOverride(l.id);
  const chips = document.createElement('div');
  chips.className = 'pp-dev-chips';
  [{ valor: null, etiqueta: 'Auto' }, { valor: true, etiqueta: '✓' }, { valor: false, etiqueta: '✗' }].forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'pp-chip' + (actual === o.valor ? ' pp-chip-acento' : '');
    btn.textContent = o.etiqueta;
    btn.addEventListener('click', () => { setLogroOverride(l.id, o.valor); render(cont); });
    chips.appendChild(btn);
  });
  fila.appendChild(chips);

  return fila;
}
