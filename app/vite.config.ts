/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'logo-mark.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // Precache only the page shell (index.html, the entry chunk + css, icons, manifest). The question bank, images, fonts
        // and every lazy route chunk (pdf.js, analysis, admin, upload...) are cached at runtime the first time they are used,
        // so a new visitor does not download code for screens they may never open (Hosting transfer is limited on Spark).
        globPatterns: ['index.html', 'registerSW.js', 'manifest.webmanifest', 'assets/index-*.{js,css}', 'icons/*.png', '*.svg'],
        globIgnores: ['bank/**', 'img/**'],
        // SPA fallback: any navigation is answered offline with the precached index.html (the app shell), EXCEPT
        // bank / image files and Firebase's reserved /__/ paths (the Auth popup/redirect handler must hit the network).
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/bank\//, /^\/dryrun\//, /^\/img\//, /^\/__\//, /^\/robots\.txt$/, /^\/sitemap\.xml$/],
        runtimeCaching: [
          {
            // lazy route chunks (hashed, immutable): cached on first use
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && /\.(js|css|mjs)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'kairos-chunks', expiration: { maxEntries: 120, maxAgeSeconds: 90 * 24 * 60 * 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // self-hosted @fontsource files (hashed, immutable): cached on first use so text renders offline
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && /\.woff2?$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'kairos-fonts', expiration: { maxEntries: 40, maxAgeSeconds: 365 * 24 * 60 * 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
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
        description: 'A daily plan counted back from your exam date, with exam-style practice for JEE Main, NEET UG, IAT and GATE DA.',
        theme_color: '#3A3FD9',
        background_color: '#FAFAF7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/logo-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
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
