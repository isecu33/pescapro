// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import './pp-liga-item.js';

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

describe('<pp-liga-item>: resuelve el bug de fmtDia() sin escapar (trofeos.js)', () => {
  let crear, setNombre;

  beforeAll(async () => {
    vi.stubGlobal('localStorage', fakeLocalStorage());
    const liga = await import('../../domain/records/liga.js');
    crear = liga.crear; setNombre = liga.setNombre;
    setNombre('Iker');
  });

  it('se registra como custom element', () => {
    expect(customElements.get('pp-liga-item')).toBeTruthy();
  });

  it('renderiza nombre, estado y participantes como texto plano', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const l = crear({ nombre: 'Liga de agosto', desde: hoy, hasta: hoy, modo: 'puntos' });
    const el = document.createElement('pp-liga-item');
    document.body.appendChild(el);
    el.liga = l;
    expect(el.shadowRoot.querySelector('.cab b').textContent).toBe('Liga de agosto');
    expect(el.shadowRoot.querySelector('.tag').textContent).toBe('activa');
    expect(el.shadowRoot.querySelector('.sub').textContent).toContain('1 participante');
    el.remove();
  });

  it('FIX: fecha invalida no se muestra cruda -- placeholder "—" en vez del string original', () => {
    const el = document.createElement('pp-liga-item');
    document.body.appendChild(el);
    // Objeto de liga "a mano" con una fecha corrupta, simulando lo que
    // habria llegado sin la validacion de records/liga.js (defensa en
    // profundidad en la capa de presentacion).
    el.liga = { id: 'x', nombre: 'Liga rara', desde: '<img src=x onerror=alert(1)>', hasta: '2026-01-01', modo: 'puntos', participantes: [] };
    const sub = el.shadowRoot.querySelector('.sub');
    expect(sub.textContent).toContain('—');
    expect(sub.innerHTML).not.toContain('<img');
    expect(el.shadowRoot.querySelector('img')).toBeNull();
    el.remove();
  });

  it('emite pp-abrir-liga al hacer click, con el id en el detail', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const l = crear({ nombre: 'Otra liga', desde: hoy, hasta: hoy, modo: 'capturas' });
    const el = document.createElement('pp-liga-item');
    document.body.appendChild(el);
    el.liga = l;
    const spy = vi.fn();
    el.addEventListener('pp-abrir-liga', spy);
    el.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.id).toBe(l.id);
    el.remove();
  });
});
