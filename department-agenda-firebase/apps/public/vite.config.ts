import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules/exceljs') || id.includes('reports/xlsxGenerator') || id.includes('migration/')) {
            return 'exceljs-vendor';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@department-agenda/shared': path.resolve(__dirname, '../../shared/src'),
      'firebase': path.resolve(__dirname, '../../node_modules/firebase')
    },
    dedupe: ['firebase', 'firebase/app', 'firebase/firestore', 'firebase/auth']
  },
  server: {
    port: 3000
  }
});
