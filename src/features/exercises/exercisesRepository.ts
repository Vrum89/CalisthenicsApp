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

/**
 * Elimina un esercizio dal catalogo.
 *
 * Vale solo per gli esercizi mai usati: la chiave esterna da `workout_exercises`
 * blocca gli altri, e fa bene — cancellare un esercizio usato vorrebbe dire
 * cancellare gli allenamenti in cui compare. L'app lo sa gia' dallo storico e
 * non offre nemmeno il comando; questo e' il caso in cui lo storico in memoria
 * fosse indietro rispetto al database, e allora decide il database.
 */
export async function deleteExercise(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('exercises').delete().eq('id', id);
  if (error) throw toAppError(error, 'error.exercises.delete');
}
