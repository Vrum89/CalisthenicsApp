/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Iniettate da `define` in vite.config.ts. */
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
