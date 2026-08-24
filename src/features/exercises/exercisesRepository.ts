import type { Exercise } from '@/domain/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { toExercise } from '@/lib/supabase/mappers';

/**
 * Catalogo esercizi dell'utente.
 *
 * Nessun filtro su `user_id`: la RLS lo applica gia' lato database, e
 * duplicarlo qui darebbe la falsa impressione che la sicurezza dipenda dal
 * client (CLAUDE.md — "ogni accesso e' gia' scoperto per utente").
 */
export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await getSupabaseClient()
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    // Solo il nome: l'ordine delle categorie non è alfabetico ma quello
    // dichiarato in `src/domain/categories.ts`, e il database non lo conosce.
    .order('name', { ascending: true });

  if (error) throw toAppError(error, 'error.exercises.load');

  return data.map(toExercise);
}
