/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'logo-mark.svg'],
      workbox: {
        // the question bank and images are runtime-cached, never precached
        globIgnores: ['bank/**', 'img/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/bank/latest.json',
            handler: 'NetworkFirst',
            options: { cacheName: 'kairos-bank-latest', networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) => /^\/bank\/v[^/]+\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kairos-bank',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/img/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kairos-img',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Kairos',
        short_name: 'Kairos',
        description: 'The right question, at the right time.',
        theme_color: '#3A3FD9',
        background_color: '#FAFAF7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'logo-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'logo-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setup-tests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
