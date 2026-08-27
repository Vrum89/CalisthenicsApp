import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { fromWorkout, fromWorkoutExercise, toWorkout } from '@/lib/supabase/mappers';
import type { Workout } from '@/domain/types';
import {
  doneReps,
  entryScheme,
  entryValue,
  filledEntries,
  type WorkoutDraft,
} from '@/features/logging/draft';

/**
 * Salvataggio di un allenamento registrato (spec §5).
 *
 * Due insert e non uno: le voci hanno bisogno del `workout_id`, che lo genera il
 * database. Se il secondo fallisce si cancella l'allenamento appena creato,
 * perche' un allenamento senza voci comparirebbe nel diario come una seduta
 * vuota — un dato falso e' peggio di un errore visibile.
 *
 * Il filtro per utente non c'e': lo impone la RLS, e `user_id` va comunque
 * scritto perche' la policy di INSERT lo confronta con `auth.uid()`.
 */
export async function saveWorkout(draft: WorkoutDraft, userId: string): Promise<Workout> {
  const supabase = getSupabaseClient();
  const entries = filledEntries(draft);

  const { data: workoutRow, error: workoutError } = await supabase
    .from('workouts')
    .insert(
      fromWorkout({
        userId,
        workoutDate: draft.workoutDate,
        workoutType: draft.workoutType,
        // Solo un allenamento da scheda punta a un giorno: lasciarlo su una
        // registrazione libera direbbe che nasce da un template che non c'e'.
        programDayId: draft.workoutType === 'from_program' ? draft.programDayId : null,
        originalDate: null,
        notes: draft.notes.trim().length > 0 ? draft.notes.trim() : null,
      }),
    )
    .select()
    .single();

  if (workoutError) throw toAppError(workoutError, 'error.workout.save');
  const workout = toWorkout(workoutRow);

  // L'ordine dentro il superset e' quello in cui gli esercizi stanno nella
  // bozza, cioe' quello in cui li si esegue nel round.
  const supersetOrders = new Map<string, number>();

  const { error: entriesError } = await supabase.from('workout_exercises').insert(
    entries.map((entry, index) => {
      const reps = doneReps(entry);
      const key = entry.supersetKey;
      const order = key === null ? null : (supersetOrders.get(key) ?? 0);
      if (key !== null) supersetOrders.set(key, (order ?? 0) + 1);
      return fromWorkoutExercise({
        userId,
        workoutId: workout.id,
        exerciseId: entry.exerciseId,
        sortOrder: index,
        scheme: entryScheme(entry),
        repsPerSet: reps.length > 0 ? reps : null,
        metricValue: entryValue(entry),
        addedWeightKg: entry.addedWeightKg,
        variant: entry.variant.trim().length > 0 ? entry.variant.trim() : null,
        notes: entry.notes.trim().length > 0 ? entry.notes.trim() : null,
        isExcluded: false,
        exclusionReason: null,
        supersetKey: key,
        supersetOrder: order,
      });
    }),
  );

  if (entriesError) {
    await supabase.from('workouts').delete().eq('id', workout.id);
    throw toAppError(entriesError, 'error.workout.save');
  }

  return workout;
}

/**
 * Cancella una singola voce registrata.
 *
 * Serve a un errore concreto: un esercizio segnato nel giorno sbagliato, o due
 * volte. Finora l'unico rimedio era la dashboard di Supabase.
 *
 * Se era l'ultima voce, sparisce anche l'allenamento: una seduta senza esercizi
 * comparirebbe nel diario come un giorno in cui ci si e' allenati a vuoto. Il
 * `delete` sull'allenamento e' condizionato alla verifica appena fatta, quindi
 * non tocca nulla se nel frattempo sono rimaste altre voci.
 */
export async function deleteWorkoutEntry(entryId: string, workoutId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('workout_exercises').delete().eq('id', entryId);
  if (error) throw toAppError(error, 'error.workout.deleteEntry');

  const { count, error: countError } = await supabase
    .from('workout_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('workout_id', workoutId);

  if (countError) throw toAppError(countError, 'error.workout.deleteEntry');
  if (count === 0) {
    const { error: workoutError } = await supabase.from('workouts').delete().eq('id', workoutId);
    if (workoutError) throw toAppError(workoutError, 'error.workout.deleteEntry');
  }
}
