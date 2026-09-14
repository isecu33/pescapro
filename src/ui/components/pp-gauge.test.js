// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import './pp-gauge.js';

describe('<pp-gauge>: reemplaza gauge() de www/js/ui.js sin reconstruir el SVG entero', () => {
  it('se registra como custom element', () => {
    expect(customElements.get('pp-gauge')).toBeTruthy();
  });

  it('renderiza el numero redondeado dentro del Shadow DOM', () => {
    const el = document.createElement('pp-gauge');
    el.setAttribute('value', '72.4');
    document.body.appendChild(el);
    const num = el.shadowRoot.querySelector('.num');
    expect(num.textContent).toBe('72');
    el.remove();
  });

  it('acota el valor a [0,100] con datos fuera de rango', () => {
    const el = document.createElement('pp-gauge');
    document.body.appendChild(el);
    el.value = 150;
    expect(el.shadowRoot.querySelector('.num').textContent).toBe('100');
    el.value = -5;
    expect(el.shadowRoot.querySelector('.num').textContent).toBe('0');
    el.remove();
  });

  it('actualizar la propiedad value refleja el atributo (y viceversa)', () => {
    const el = document.createElement('pp-gauge');
    document.body.appendChild(el);
    el.value = 55;
    expect(el.getAttribute('value')).toBe('55');
    el.setAttribute('value', '10');
    expect(el.value).toBe(10);
    el.remove();
  });

  it('el color del progreso sigue el mismo esquema que util.colorIndice', async () => {
    const { util } = await import('../../domain/config.js');
    const el = document.createElement('pp-gauge');
    document.body.appendChild(el);
    el.value = 80;
    const progreso = el.shadowRoot.querySelector('.progreso');
    expect(progreso.getAttribute('stroke')).toBe(util.colorIndice(80));
    el.remove();
  });
});
