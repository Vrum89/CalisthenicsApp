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
        programDayId: null,
        originalDate: null,
        notes: draft.notes.trim().length > 0 ? draft.notes.trim() : null,
      }),
    )
    .select()
    .single();

  if (workoutError) throw toAppError(workoutError, 'error.workout.save');
  const workout = toWorkout(workoutRow);

  const { error: entriesError } = await supabase.from('workout_exercises').insert(
    entries.map((entry, index) => {
      const reps = doneReps(entry);
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
        supersetKey: null,
        supersetOrder: null,
      });
    }),
  );

  if (entriesError) {
    await supabase.from('workouts').delete().eq('id', workout.id);
    throw toAppError(entriesError, 'error.workout.save');
  }

  return workout;
}
