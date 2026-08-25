import type { PostgrestError } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors';
import type { TranslationKey } from '@/lib/i18n/types';

/**
 * Traduce un errore PostgREST in un AppError con la chiave giusta.
 *
 * I due in cima sono la trappola prevedibile di questo progetto: lo schema va
 * applicato a mano dalla dashboard Supabase, quindi finche' non lo si fa ogni
 * query fallisce, e il messaggio grezzo ("relation ... does not exist") non
 * suggerisce cosa fare.
 *
 * `fallbackKey` e' il messaggio specifico del contesto chiamante, usato per
 * tutto cio' che non e' riconosciuto; deve contenere un segnaposto {detail}.
 */
export function toAppError(error: PostgrestError, fallbackKey: TranslationKey): AppError {
  switch (error.code) {
    case '42P01': // undefined_table
    case 'PGRST205': // tabella assente dalla schema cache di PostgREST
      return new AppError('error.db.missingTables', `Missing tables: ${error.message}`);
    case '42501': // insufficient_privilege
      return new AppError('error.db.permissions', `Insufficient privilege: ${error.message}`);
    case 'PGRST301': // JWT scaduto o assente
      return new AppError('error.db.expiredSession', `Expired session: ${error.message}`);
    case '23503': // foreign_key_violation
      // Si cancella un esercizio che compare in almeno un allenamento.
      return new AppError('error.db.stillReferenced', `Still referenced: ${error.message}`);
    case '23505': // unique_violation
      // In pratica sempre `exercises_user_name_unique`: un esercizio con quel
      // nome c'e' gia'. Il messaggio di Postgres e' corretto e inservibile —
      // parla di chiavi e vincoli a chi sta cercando di allenarsi.
      return new AppError('error.db.duplicateName', `Duplicate: ${error.message}`);
    default:
      return new AppError(fallbackKey, error.message, { detail: error.message });
  }
}
