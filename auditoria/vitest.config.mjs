import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Suite de auditoria: tests escritos a partir de los SUPUESTOS del producto
// (README, comentarios de contrato en config.js, fisica de mareas/astronomia,
// modelo de amenazas de los codigos compartidos), no de los casos existentes.
// Va aparte de `npm test` a proposito: su trabajo es encontrar desviaciones,
// asi que puede fallar sin bloquear commits.
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    environment: 'node',
    include: ['auditoria/**/*.audit.test.js'],
    setupFiles: ['auditoria/setup.js'],
  },
});
