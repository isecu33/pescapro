/* SUPUESTOS de empaquetado: todo recurso que la app referencia existe en
   el build (vite.config.mjs: publicDir = 'img', se copia tal cual a dist/),
   y los comandos documentados apuntan a ficheros reales. */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ESPECIES } from '../src/domain/especies.js';
import { MODOS, WMO } from '../src/domain/config.js';
import { LISTA } from '../src/domain/records/logros.js';

const RAIZ = new URL('..', import.meta.url);
const enPublic = (ruta) => new URL('img/' + ruta.replace(/^\.\//, ''), RAIZ);

describe('Supuesto: cada imagen referenciada existe en img/ (publicDir)', () => {
  const refs = [
    ...ESPECIES.flatMap(e => [['especie ' + e.id + ' imagen', e.imagen], ['especie ' + e.id + ' foto', e.foto]]),
    ...Object.values(MODOS).map(m => ['modo ' + m.id, m.icono]),
    ...LISTA.map(l => ['logro ' + l.id, l.img]),
  ].filter(([, r]) => r);
  for (const [que, ruta] of refs) {
    it(`${que}: ${ruta}`, () => expect(existsSync(enPublic(ruta)), `falta img/${ruta.replace(/^\.\//, '')}`).toBe(true));
  }
});

describe('Supuesto: textos visibles sin caracteres corruptos', () => {
  const MOJIBAKE = /Ã.|â€|�/;
  it('logros, modalidades y tabla WMO', () => {
    const textos = [
      ...LISTA.flatMap(l => [l.nombre, l.desc]),
      ...Object.values(MODOS).flatMap(m => [m.nombre, m.desc]),
      ...Object.values(WMO).map(w => w[0]),
    ];
    for (const t of textos) expect(t).not.toMatch(MOJIBAKE);
  });
});

describe('Supuesto: los scripts de package.json apuntan a ficheros existentes', () => {
  const pkg = JSON.parse(readFileSync(new URL('package.json', RAIZ), 'utf8'));
  for (const [nombre, cmd] of Object.entries(pkg.scripts)) {
    const ficheros = [...cmd.matchAll(/node\s+(\S+\.js)/g)].map(m => m[1]);
    for (const f of ficheros) {
      it(`${nombre}: ${f}`, () => expect(existsSync(new URL(f, RAIZ))).toBe(true));
    }
  }
});
