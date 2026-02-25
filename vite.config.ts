import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'url';
import { Server } from 'lucide-react';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host:true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // No rewrite needed - backend routes are already mounted at /api/v1/*
      },
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
})
