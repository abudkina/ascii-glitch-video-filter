import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/** Базовый путь для GitHub Pages: /ascii-glitch-video-filter/ */
const baseСборки = '/ascii-glitch-video-filter/';

export default defineConfig(({ command }) => ({
  root: '.',
  publicDir: 'public',
  // В dev оставляем '/', в production — подкаталог репозитория на Pages
  base: command === 'build' ? baseСборки : '/',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5273,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 4273,
  },
}));
