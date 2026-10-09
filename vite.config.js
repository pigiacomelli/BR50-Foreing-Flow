import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { b3Plugin } from './server/b3.js';

export default defineConfig({
  plugins: [b3Plugin(fileURLToPath(new URL('.', import.meta.url)))],
  server: { host: '127.0.0.1', port: 3000 },
  preview: { host: '127.0.0.1', port: 3000 },
  build: { outDir: 'dist' },
});
