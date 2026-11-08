/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'logo-mark.svg'],
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
