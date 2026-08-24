import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;

/**
 * Client Supabase singleton, creato pigramente al primo uso.
 *
 * "Pigramente" e' voluto: main.tsx valida le env prima di montare l'app, quindi
 * se la configurazione manca questa funzione non viene mai chiamata e l'utente
 * vede la schermata di configurazione invece di un crash.
 *
 * Tipizzato su `Database` (src/lib/supabase/database.types.ts), cosi' tabelle e
 * colonne sono controllate dal compilatore (spec §2.3).
 */
export function getSupabaseClient(): AppSupabaseClient {
  if (client) return client;

  const result = readEnv();
  if (!result.ok) {
    throw new Error(
      `Configurazione Supabase mancante: ${result.missing.join(', ')}. Vedi .env.example.`,
    );
  }

  client = createClient<Database>(result.env.supabaseUrl, result.env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Legge i token dal frammento dell'URL al ritorno dal magic link.
      detectSessionInUrl: true,
      // Flow `implicit` invece di `pkce`: PKCE tiene il code verifier nel
      // localStorage del browser che ha CHIESTO il link, quindi si rompe quando
      // il link viene aperto dall'app di posta in un browser diverso — che e'
      // esattamente il caso d'uso qui (magic link letto dal telefono).
      flowType: 'implicit',
    },
  });

  return client;
}
