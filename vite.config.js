import { defineConfig } from 'vite';
import tvPlugin from './src/server/tvPlugin.js';

export default defineConfig({
  plugins: [tvPlugin()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy Yahoo Finance API requests through Vite dev server to avoid CORS
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      },
      // Proxy BCB SGS API to avoid CORS issues
      '/api/bcb': {
        target: 'https://api.bcb.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bcb/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
