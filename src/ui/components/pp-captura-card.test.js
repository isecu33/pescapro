// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import './pp-captura-card.js';

function capturaBase(extra) {
  return Object.assign({
    id: 'c1', especie: 'lubina', talla: 42, peso: 1.2,
    fecha: new Date('2026-03-01T10:00:00').toISOString(),
    spot: { nombre: 'Zarautz' }, senuelo: 'jerkbait',
    condiciones: { faseMarea: 'subiendo', luna: 'llena', viento: 12, indice: 68 },
    notas: null, fotoId: null
  }, extra || {});
}

describe('<pp-captura-card>: resuelve el CRITICAL de XSS de renderCuaderno/modalFoto', () => {
  it('se registra como custom element', () => {
    expect(customElements.get('pp-captura-card')).toBeTruthy();
  });

  it('FIX CRITICAL: unas notas con markup malicioso se muestran como texto plano, nunca se ejecutan', () => {
    const el = document.createElement('pp-captura-card');
    document.body.appendChild(el);
    const payload = '<img src=x onerror=window.__xss=true>';
    el.captura = capturaBase({ notas: payload });

    // El payload NO debe convertirse en un elemento <img> real dentro del Shadow DOM.
    expect(el.shadowRoot.querySelector('img[src="x"]')).toBeNull();
    expect(window.__xss).toBeUndefined();

    // El texto SI debe estar presente, literalmente, como contenido de texto.
    const notas = el.shadowRoot.querySelector('.notas');
    expect(notas.textContent).toBe(payload);
    // Verificacion adicional: el HTML serializado escapa los angulos (prueba
    // que se uso textContent y no innerHTML con el payload).
    expect(notas.innerHTML).not.toContain('<img');
    el.remove();
  });

  it('FIX CRITICAL: spot.nombre y senuelo maliciosos tambien quedan como texto plano', () => {
    const el = document.createElement('pp-captura-card');
    document.body.appendChild(el);
    el.captura = capturaBase({
      spot: { nombre: '<svg onload=window.__xss2=true>' },
      senuelo: '<script>window.__xss3=true</script>'
    });
    expect(el.shadowRoot.querySelector('svg')).toBeNull();
    expect(el.shadowRoot.querySelector('script')).toBeNull();
    expect(window.__xss2).toBeUndefined();
    expect(window.__xss3).toBeUndefined();
    expect(el.shadowRoot.querySelector('.sub').textContent).toContain('<svg onload=window.__xss2=true>');
    el.remove();
  });

  it('renderiza especie, talla y peso en la cabecera', () => {
    const el = document.createElement('pp-captura-card');
    document.body.appendChild(el);
    el.captura = capturaBase();
    const cab = el.shadowRoot.querySelector('.cab b');
    expect(cab.textContent).toContain('Lubina');
    expect(el.shadowRoot.querySelector('.cab').textContent).toContain('42 cm');
    expect(el.shadowRoot.querySelector('.cab').textContent).toContain('1.2 kg');
    el.remove();
  });

  it('emite pp-borrar al pulsar el boton de borrar, con la captura en el detail', () => {
    const el = document.createElement('pp-captura-card');
    document.body.appendChild(el);
    el.captura = capturaBase();
    const spy = vi.fn();
    el.addEventListener('pp-borrar', spy);
    el.shadowRoot.querySelector('.borrar').click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.captura.id).toBe('c1');
    el.remove();
  });

  it('emite pp-abrir-foto al pulsar la miniatura, solo si hay fotoId', () => {
    const el = document.createElement('pp-captura-card');
    document.body.appendChild(el);
    el.captura = capturaBase({ fotoId: 'foto1' });
    const spy = vi.fn();
    el.addEventListener('pp-abrir-foto', spy);
    el.shadowRoot.querySelector('.thumb').click();
    expect(spy).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('no muestra miniatura si no hay fotoId', () => {
    const el = document.createElement('pp-captura-card');
    document.body.appendChild(el);
    el.captura = capturaBase({ fotoId: null });
    expect(el.shadowRoot.querySelector('.thumb')).toBeNull();
    el.remove();
  });
});
