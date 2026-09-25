// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

describe('renderPerfil: vista Perfil (tarjeta publica, destacadas, logros, clan)', () => {
  let renderPerfil, cuaderno, perfil;
  let contenedor;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '';
    vi.stubGlobal('localStorage', fakeLocalStorage());
    cuaderno = await import('../../domain/cuaderno.js');
    perfil = await import('../../domain/perfil.js');
    ({ renderPerfil } = await import('./vista-perfil.js'));
    contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
  });

  const modal = () => document.getElementById('pp-modal');

  it('perfil vacio: tarjeta con nombre por defecto y aviso para completarlo', () => {
    renderPerfil(contenedor, {});
    expect(contenedor.querySelector('.pp-perfil-nombre').textContent).toBe('Pescador local');
    expect(contenedor.querySelector('.pp-perfil-usuario').textContent).toBe('Sin nombre de usuario');
    expect(contenedor.textContent).toContain('Ponle nombre a tu perfil');
    expect(contenedor.querySelector('.pp-perfil-btn-fundar')).not.toBeNull();
  });

  it('muestra nombre, @usuario, bio, etiqueta de clan e insignias favoritas', () => {
    cuaderno.anadir({ especie: 'lubina', talla: 40, fecha: new Date().toISOString() });
    perfil.actualizar({ nombre: 'Iker', usuario: 'iker', bio: 'Spinning <script>' });
    perfil.crearClan({ nombre: 'Costa', etiqueta: 'CST' });
    perfil.setInsignias(['captura-bronce'], ['captura-bronce']);
    renderPerfil(contenedor, {});
    const tarjeta = contenedor.querySelector('.pp-perfil-tarjeta');
    expect(tarjeta.querySelector('.pp-perfil-nombre').textContent).toContain('Iker');
    expect(tarjeta.querySelector('.pp-perfil-clan-tag').textContent).toBe('[CST]');
    expect(tarjeta.querySelector('.pp-perfil-usuario').textContent).toBe('@iker');
    // bio con textContent, nunca HTML
    expect(tarjeta.querySelector('.pp-perfil-bio').textContent).toBe('Spinning <script>');
    expect(tarjeta.querySelector('script')).toBeNull();
    expect(tarjeta.querySelectorAll('.pp-perfil-insignia')).toHaveLength(1);
    expect(contenedor.querySelector('.pp-logro.favorito').dataset.id).toBe('captura-bronce');
  });

  it('editar perfil guarda los cambios y avisa al shell con pp-perfil-cambiado', () => {
    const spy = vi.fn();
    document.body.addEventListener('pp-perfil-cambiado', spy);
    renderPerfil(contenedor, {});
    contenedor.querySelector('.pp-perfil-btn-editar').click();
    const m = modal();
    m.querySelector('input[name="nombre"]').value = 'Ane';
    m.querySelector('input[name="usuario"]').value = '@ane.mar';
    m.querySelector('textarea[name="bio"]').value = 'Eging nocturno';
    m.querySelector('.pp-perfil-banner-opcion[data-banner="oceano"]').click();
    m.querySelector('.pp-perfil-btn-guardar').click();
    expect(perfil.leer()).toMatchObject({ nombre: 'Ane', usuario: 'ane.mar', bio: 'Eging nocturno', banner: 'oceano' });
    expect(spy).toHaveBeenCalled();
    expect(contenedor.querySelector('.pp-perfil-nombre').textContent).toContain('Ane');
  });

  it('editar perfil muestra el error de validacion en el modal sin guardar', () => {
    renderPerfil(contenedor, {});
    contenedor.querySelector('.pp-perfil-btn-editar').click();
    const m = modal();
    m.querySelector('input[name="nombre"]').value = 'Ane';
    m.querySelector('input[name="usuario"]').value = 'no vale';
    m.querySelector('.pp-perfil-btn-guardar').click();
    expect(m.querySelector('.pp-perfil-error').textContent).toMatch(/usuario/);
    expect(perfil.leer().nombre).toBe('');
  });

  it('elegir capturas destacadas las muestra en el perfil', () => {
    cuaderno.anadir({ especie: 'lubina', talla: 40 });
    cuaderno.anadir({ especie: 'dorada', talla: 30 });
    renderPerfil(contenedor, {});
    contenedor.querySelector('.pp-perfil-btn-destacadas').click();
    const m = modal();
    m.querySelectorAll('.pp-perfil-destacada')[0].click();
    expect(m.querySelectorAll('.pp-perfil-destacada.seleccionada')).toHaveLength(1);
    [...m.querySelectorAll('ion-button')].find(b => b.textContent === 'Listo').click();
    const destacadas = contenedor.querySelectorAll('.pp-perfil-seccion-destacadas .pp-perfil-destacada');
    expect(destacadas).toHaveLength(1);
    expect(destacadas[0].textContent).toContain('30 cm');
  });

  it('fundar clan y unirse con el codigo compartido', () => {
    renderPerfil(contenedor, {});
    contenedor.querySelector('.pp-perfil-btn-fundar').click();
    let m = modal();
    m.querySelector('input[name="clan-nombre"]').value = 'Los del Espigón';
    m.querySelector('input[name="clan-etiqueta"]').value = 'ESP';
    [...m.querySelectorAll('ion-button')].find(b => b.textContent === 'Fundar').click();
    expect(contenedor.querySelector('.pp-perfil-seccion-clan').textContent).toContain('Los del Espigón');

    contenedor.querySelector('.pp-perfil-btn-invitar').click();
    const codigo = modal().querySelector('textarea[name="clan-codigo"]').value;
    expect(codigo.startsWith('PESCAPRO-CLAN1:')).toBe(true);

    perfil.salirClan();
    renderPerfil(contenedor, {});
    contenedor.querySelector('.pp-perfil-btn-unirse').click();
    m = modal();
    m.querySelector('textarea[name="clan-codigo"]').value = 'basura';
    [...m.querySelectorAll('ion-button')].find(b => b.textContent === 'Unirme').click();
    expect(m.querySelector('.pp-perfil-error').textContent).toMatch(/código de clan/);
    m.querySelector('textarea[name="clan-codigo"]').value = codigo;
    [...m.querySelectorAll('ion-button')].find(b => b.textContent === 'Unirme').click();
    expect(perfil.leer().clan).toMatchObject({ nombre: 'Los del Espigón', fundador: false });
  });
});
