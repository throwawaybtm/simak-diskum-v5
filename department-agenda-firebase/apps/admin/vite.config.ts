import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022'
  },
  resolve: {
    alias: {
      '@department-agenda/shared': path.resolve(__dirname, '../../shared/src')
    }
  },
  server: {
    port: 3001
  }
});
