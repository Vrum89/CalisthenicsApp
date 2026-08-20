import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        id: '/',
        name: 'Workout Diary',
        short_name: 'Workout',
        description: 'Diario di allenamento calisthenics: registra le sessioni e guarda i progressi.',
        lang: 'it',
        // Nessun `orientation`: il cover display del Razr 50 e' quasi quadrato,
        // bloccare l'orientamento peggiorerebbe il flusso di logging (spec §2.5).
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a', // slate-900
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // La connessione e' un requisito (spec §2.1): il service worker serve
        // l'installabilita' e l'avvio rapido, non una modalita' offline.
        navigateFallbackDenylist: [/^\/auth\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Permette di verificare manifest e installabilita' anche in `npm run dev`.
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
