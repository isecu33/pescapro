// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cada test necesita su propio localStorage fake (records/logros/ligas viven
// ahi) y su propio estado de custom elements limpio en el DOM -- se usa el
// mismo patron que src/domain/cuaderno.test.js y src/domain/records/liga.test.js:
// vi.resetModules() + vi.stubGlobal('localStorage', ...) ANTES de importar (de
// forma dinamica) tanto los modulos de dominio como la propia vista, para que
// todos compartan la misma instancia de liga.js/cuaderno.js dentro de un test.
function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

describe('renderTrofeos: vista Trofeos (records, logros, competiciones) -- Fase 3', () => {
  let renderTrofeos, cuaderno, liga;
  let contenedor;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '';
    vi.stubGlobal('localStorage', fakeLocalStorage());
    cuaderno = await import('../../domain/cuaderno.js');
    liga = await import('../../domain/records/liga.js');
    ({ renderTrofeos } = await import('./vista-trofeos.js'));
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
  });

  const stBase = () => ({ spot: null, modo: 'spinning', datos: null, ctx: null, vista: 'trofeos', cargando: false, error: null });

  it('muestra records y logros calculados a partir del cuaderno (sin necesitar st.ctx)', () => {
    const hoy = new Date().toISOString();
    cuaderno.anadir({ especie: 'lubina', talla: 48, fecha: hoy });
    cuaderno.anadir({ especie: 'lubina', talla: 52, fecha: hoy });

    renderTrofeos(contenedor, stBase());

    expect(contenedor.textContent).toContain('Récords personales');
    expect(contenedor.textContent).toContain('Capturas totales: 2');
    expect(contenedor.textContent).toContain('Lubina');
    expect(contenedor.textContent).toContain('Logros');
    // Logro "Primera captura" conseguido con 2 capturas registradas.
    expect(contenedor.textContent).toContain('Primera captura');
  });

  it('sin capturas muestra el mensaje de "registra capturas" en vez de una tabla vacia', () => {
    renderTrofeos(contenedor, stBase());
    expect(contenedor.textContent).toContain('Registra capturas en el Cuaderno');
  });

  it('crear una liga la añade a la lista como <pp-liga-item>, sin innerHTML', () => {
    liga.setNombre('Iker');
    const hoy = new Date().toISOString().slice(0, 10);
    liga.crear({ nombre: 'Liga de prueba', desde: hoy, hasta: hoy, modo: 'puntos' });

    renderTrofeos(contenedor, stBase());

    const items = contenedor.querySelectorAll('pp-liga-item');
    expect(items).toHaveLength(1);
    expect(items[0].liga.nombre).toBe('Liga de prueba');
    // La tarjeta resumen no vuelve a usar innerHTML con el nombre de la liga.
    expect(contenedor.innerHTML).not.toContain('<script');
  });

  it('pulsar pp-abrir-liga abre el modal con <pp-rank-fila> por participante', () => {
    liga.setNombre('Iker');
    const hoy = new Date().toISOString().slice(0, 10);
    const l = liga.crear({ nombre: 'Liga con ranking', desde: hoy, hasta: hoy, modo: 'capturas' });

    renderTrofeos(contenedor, stBase());

    const item = contenedor.querySelector('pp-liga-item');
    item.dispatchEvent(new CustomEvent('pp-abrir-liga', { detail: { id: l.id }, bubbles: true, composed: true }));

    const modal = document.getElementById('pp-modal');
    expect(modal).toBeTruthy();
    const filas = modal.querySelectorAll('pp-rank-fila');
    expect(filas).toHaveLength(1);
    expect(filas[0].entrada.nombre).toBe('Iker');
    expect(filas[0].entrada.esYo).toBe(true);
    expect(filas[0].entrada.posicion).toBe(1);
  });

  it('importar un codigo invalido muestra el mensaje de error EN EL MODAL, sin alert ni fallo silencioso', () => {
    liga.setNombre('Iker');
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);

    renderTrofeos(contenedor, stBase());

    const bUnirse = [...contenedor.querySelectorAll('ion-button')].find(b => b.textContent.includes('Unirse'));
    expect(bUnirse).toBeTruthy();
    bUnirse.click();

    const modal = document.getElementById('pp-modal');
    expect(modal).toBeTruthy();
    const area = modal.querySelector('ion-textarea');
    area.value = 'esto no es un código PescaPro';
    const boton = [...modal.querySelectorAll('ion-button')].find(b => b.textContent.includes('Importar'));
    boton.click();

    // El modal de importar sigue abierto (no se cierra en el fallo) y
    // muestra el mensaje de error de liga.importar() como texto plano.
    const modalTrasFallo = document.getElementById('pp-modal');
    expect(modalTrasFallo).toBeTruthy();
    expect(modalTrasFallo.textContent).toMatch(/código no válido/i);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('importar un codigo de invitacion valido cierra el modal y abre el ranking de la liga', () => {
    liga.setNombre('Ander');
    const hoy = new Date().toISOString().slice(0, 10);
    const l = liga.crear({ nombre: 'Liga compartida', desde: hoy, hasta: hoy, modo: 'capturas' });
    const codigo = liga.codigoInvitacion(l);
    liga.borrar(l.id); // simula "otro movil": aun no estoy en la liga

    renderTrofeos(contenedor, stBase());
    const bUnirse = [...contenedor.querySelectorAll('ion-button')].find(b => b.textContent.includes('Unirse'));
    bUnirse.click();
    const modal = document.getElementById('pp-modal');
    modal.querySelector('ion-textarea').value = codigo;
    [...modal.querySelectorAll('ion-button')].find(b => b.textContent.includes('Importar')).click();

    const modalRanking = document.getElementById('pp-modal');
    expect(modalRanking.textContent).toContain('Liga compartida');
    expect(modalRanking.querySelectorAll('pp-rank-fila')).toHaveLength(1);
  });

  it('pide el nombre de pescador antes de crear si el perfil no tiene nombre', () => {
    renderTrofeos(contenedor, stBase());
    const bCrear = [...contenedor.querySelectorAll('ion-button')].find(b => b.textContent.includes('Crear'));
    bCrear.click();

    const modalNombre = document.getElementById('pp-modal');
    expect(modalNombre.textContent).toContain('Tu nombre de pescador');
    modalNombre.querySelector('ion-input').value = 'Maialen';
    // El modal tiene su propio boton de cerrar (icono) en la cabecera antes
    // del contenido -- hay que localizar el boton "Guardar" por texto, no
    // el primer <ion-button> del modal.
    [...modalNombre.querySelectorAll('ion-button')].find(b => b.textContent.includes('Guardar')).click();

    // Tras guardar el nombre continua directamente al formulario de crear.
    const modalCrear = document.getElementById('pp-modal');
    expect(modalCrear.textContent).toContain('Nueva competición');
    expect(liga.perfil().nombre).toBe('Maialen');
  });
});
