import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readEnv } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Client Supabase singleton, creato pigramente al primo uso.
 *
 * "Pigramente" e' voluto: main.tsx valida le env prima di montare l'app, quindi
 * se la configurazione manca questa funzione non viene mai chiamata e l'utente
 * vede la schermata di configurazione invece di un crash.
 *
 * Dalla Milestone 2 il tipo generico verra' parametrizzato con i tipi generati
 * da `supabase gen types typescript` (spec §2.3).
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const result = readEnv();
  if (!result.ok) {
    throw new Error(
      `Configurazione Supabase mancante: ${result.missing.join(', ')}. Vedi .env.example.`,
    );
  }

  client = createClient(result.env.supabaseUrl, result.env.supabaseAnonKey, {
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
