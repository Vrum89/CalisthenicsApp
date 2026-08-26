import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';

/**
 * Manutenzione delle condizioni gia' registrate.
 *
 * Una condizione non e' una riga da qualche parte: e' testo ripetuto su ogni
 * `workout_exercises` in cui compare. Quindi rinominarla vuol dire riscriverla
 * ovunque, e cancellarla vuol dire azzerarla ovunque — dentro un solo esercizio,
 * mai in tutto il diario: "materassino" sugli handstand push up e "materassino"
 * su un altro esercizio possono voler dire cose diverse.
 *
 * Rinominare in una condizione che esiste gia' le fonde, ed e' voluto: e'
 * esattamente come si ripara "materassino + disco 5" scritto una volta
 * "materassino+disco 5".
 */
export async function renameVariant(
  exerciseId: string,
  from: string,
  to: string,
): Promise<void> {
  const trimmed = to.trim();
  const { error } = await getSupabaseClient()
    .from('workout_exercises')
    // Una condizione vuota non e' una condizione: torna a "nessuna".
    .update({ variant: trimmed.length > 0 ? trimmed : null })
    .eq('exercise_id', exerciseId)
    .eq('variant', from);

  if (error) throw toAppError(error, 'error.variants.rename');
}

/** Toglie la condizione dalle voci che ce l'hanno, senza toccare altro. */
export async function clearVariant(exerciseId: string, variant: string): Promise<void> {
  await renameVariant(exerciseId, variant, '');
}
