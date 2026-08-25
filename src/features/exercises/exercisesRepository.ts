import type { Exercise } from '@/domain/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { fromExercise, toExercise, type NewExercise } from '@/lib/supabase/mappers';

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

/**
 * Aggiunge un esercizio al catalogo.
 *
 * Il catalogo nasce da un seed, ma non e' una lista chiusa: un esercizio nuovo
 * si inventa mentre ci si allena, e doverlo aggiungere da un'altra schermata
 * (o peggio, dalla dashboard di Supabase) vorrebbe dire interrompere
 * l'allenamento. Per questo si crea da dentro il picker, dove serve.
 *
 * `metricType` non e' modificabile dopo: decide come si legge il numero, e
 * cambiarlo reinterpreterebbe tutto lo storico di quell'esercizio.
 */
export async function createExercise(exercise: NewExercise): Promise<Exercise> {
  const { data, error } = await getSupabaseClient()
    .from('exercises')
    .insert(fromExercise(exercise))
    .select()
    .single();

  if (error) throw toAppError(error, 'error.exercises.create');
  return toExercise(data);
}
