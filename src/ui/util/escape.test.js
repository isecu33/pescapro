import { describe, it, expect } from 'vitest';
import { esc } from './escape.js';

describe('esc(): escapado de HTML centralizado (generaliza el de trofeos.js)', () => {
  it('neutraliza los 5 caracteres peligrosos: < > & " \'', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(esc('& " \'')).toBe('&amp; &quot; &#39;');
  });

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(esc('Lubina de 54 cm')).toBe('Lubina de 54 cm');
  });

  it('trata null/undefined como cadena vacia', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('convierte numeros y otros tipos a string antes de escapar', () => {
    expect(esc(42)).toBe('42');
  });
});
