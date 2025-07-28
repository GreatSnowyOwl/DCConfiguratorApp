import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react({
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'clsx',
      'tailwind-merge'
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Enable production optimizations
    minify: 'esbuild', // Use esbuild instead of terser for faster builds
    cssMinify: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-checkbox', '@radix-ui/react-label', '@radix-ui/react-slot'],
          animation: ['framer-motion'],
          pdf: ['jspdf', 'pdf-lib', '@pdf-lib/fontkit', 'fontkit'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          icons: ['lucide-react'],
        },
        // Optimize asset naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Configure chunk size limits
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (disable in production)
    sourcemap: false,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096,
    // Target modern browsers for better optimization
    target: 'esnext',
  },
  // Enable esbuild optimizations
  esbuild: {
    // Remove console and debugger in production
    drop: ['console', 'debugger'],
    // Enable tree shaking
    treeShaking: true,
    // Optimize for speed
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
  server: {
    port: 5175,
    host: true,
    allowedHosts: ['all', '9f29-212-58-102-97.ngrok-free.app', 'afaa6a989104.ngrok-free.app', '976990ca5409.ngrok-free.app'],
    proxy: {
      '/wp-json': {
        target: 'https://iteaq.su',
        changeOrigin: true,
      },
    },
  },
});