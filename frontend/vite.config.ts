import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/v1\/tasks/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-tasks',
              expiration: { maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name: 'Task Manager',
        short_name: 'Tasks',
        description: 'Manage your tasks efficiently',
        theme_color: '#6366f1',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3333,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
