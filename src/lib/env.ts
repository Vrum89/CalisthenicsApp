/**
 * Lettura e validazione delle variabili d'ambiente.
 *
 * Sono controllate una volta sola all'avvio (main.tsx): se mancano, l'app
 * mostra una schermata di configurazione con l'elenco delle variabili assenti,
 * invece di fallire piu' tardi con un errore oscuro dentro supabase-js.
 */

export interface AppEnv {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

export type EnvResult =
  | { readonly ok: true; readonly env: AppEnv }
  | { readonly ok: false; readonly missing: readonly string[] };

/** Vuoto o solo spazi conta come mancante: un `.env` compilato a meta' e' un errore. */
function present(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function readEnv(): EnvResult {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!present(url)) missing.push('VITE_SUPABASE_URL');
  if (!present(anonKey)) missing.push('VITE_SUPABASE_ANON_KEY');

  if (!present(url) || !present(anonKey)) {
    return { ok: false, missing };
  }

  return { ok: true, env: { supabaseUrl: url.trim(), supabaseAnonKey: anonKey.trim() } };
}
