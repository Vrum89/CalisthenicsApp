import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
/**
 * Versione e data di build, iniettate a compilazione.
 *
 * In una PWA il service worker puo' servire una copia vecchia dell'app: senza
 * un modo di leggere quale versione si ha in mano, "l'ho aggiornata?" non ha
 * risposta. La data di build serve piu' del numero — dice se cio' che gira e'
 * quello appena pubblicato.
 */
const pkg: { version: string } = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  version: string;
};
const buildTime = new Date().toISOString();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
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
        description: 'Calisthenics workout diary: log your sessions and track your progress.',
        // Il manifest ha una lingua sola, e chi lo legge (prompt di
        // installazione, launcher) non sa che lingua parla l'utente: vale la
        // stessa scelta del fallback dell'app.
        lang: 'en',
        // Nessun `orientation`: il cover display del Razr 50 e' quasi quadrato,
        // bloccare l'orientamento peggiorerebbe il flusso di logging (spec §2.5).
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a', // slate-900
        theme_color: '#0f172a',
        // Su Android chiede al sistema di aprire i link dell'app dentro l'app
        // installata invece che nel browser: e' cio' che serve al ritorno dal
        // magic link. Il primo salto resta sul dominio Supabase, quindi parte
        // comunque dal browser, ma l'atterraggio finale torna nella PWA.
        handle_links: 'preferred',
        // Riusa la finestra gia' aperta invece di aprirne una seconda.
        launch_handler: { client_mode: 'navigate-existing' },
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
