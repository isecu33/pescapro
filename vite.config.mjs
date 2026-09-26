import { defineConfig } from 'vite';

// base:'./' es obligatorio: Capacitor sirve el WebView desde un origen local
// (https://localhost en Android), no desde la raiz de un dominio publico.
// Con rutas absolutas los assets generados no resuelven dentro del APK.
export default defineConfig({
  base: './',
  // El código referencia assets como './img/...' (strings en runtime, no
  // imports estáticos), así que Vite no los rastrea como parte del grafo de
  // módulos. publicDir los copia tal cual a dist/ en el build.
  publicDir: 'img',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    setupFiles: ['./vitest.setup.js'],
    passWithNoTests: true,
  },
});
