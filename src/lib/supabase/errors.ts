import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Errori PostgREST tradotti nei casi che l'utente puo' davvero risolvere.
 *
 * I due in cima sono la trappola prevedibile di questo progetto: lo schema va
 * applicato a mano dalla dashboard Supabase, quindi finche' non lo si fa ogni
 * query fallisce, e il messaggio grezzo ("relation ... does not exist") non
 * suggerisce cosa fare.
 */
export function toDisplayMessage(error: PostgrestError, context: string): string {
  switch (error.code) {
    case '42P01': // undefined_table
    case 'PGRST205': // tabella assente dalla schema cache di PostgREST
      return 'Le tabelle non esistono ancora nel database. Applica supabase/schema.sql dalla dashboard Supabase (SQL Editor → New query).';
    case '42501': // insufficient_privilege
      return 'Permessi mancanti sulla tabella. Controlla di aver eseguito anche la sezione GRANT di supabase/schema.sql.';
    case 'PGRST301': // JWT scaduto o assente
      return 'Sessione scaduta. Esci e rientra con un nuovo magic link.';
    default:
      return `${context}: ${error.message}`;
  }
}
