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
/**
 * Cambia il nome di un esercizio.
 *
 * Il nome e' l'unica cosa che si puo' correggere: categoria e metrica no —
 * la seconda perche' reinterpreterebbe lo storico, la prima perche' non ne vale
 * la complessita' finche' serve solo a raggruppare.
 */
export async function renameExercise(id: string, name: string): Promise<Exercise> {
  const { data, error } = await getSupabaseClient()
    .from('exercises')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw toAppError(error, 'error.exercises.rename');
  return toExercise(data);
}

/**
 * Fonde `source` dentro `target`: le registrazioni passano al secondo e il primo
 * sparisce. Restituisce quante voci sono state spostate.
 *
 * E' una funzione del database e non tre chiamate da qui perche' spostare le
 * righe e cancellare l'esercizio devono riuscire o fallire insieme: a meta'
 * strada resterebbe un esercizio vuoto, o righe orfane.
 */
export async function mergeExercises(sourceId: string, targetId: string): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc('merge_exercises', {
    source: sourceId,
    target: targetId,
  });

  if (error) throw toAppError(error, 'error.exercises.merge');
  return data;
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('exercises').delete().eq('id', id);
  if (error) throw toAppError(error, 'error.exercises.delete');
}
