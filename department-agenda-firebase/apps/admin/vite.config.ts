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
        }
      }
    }
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

