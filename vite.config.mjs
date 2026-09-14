import { defineConfig } from 'vite';

// base:'./' es obligatorio: Capacitor sirve el WebView desde un origen local
// (https://localhost en Android), no desde la raiz de un dominio publico.
// Con rutas absolutas los assets generados no resuelven dentro del APK.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    passWithNoTests: true,
  },
});
