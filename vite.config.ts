import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    host: true,
    allowedHosts: ['all', '9f29-212-58-102-97.ngrok-free.app'],
    proxy: {
      '/wp-json': {
        target: 'https://iteaq.su',
        changeOrigin: true,
      },
    },
  },
});