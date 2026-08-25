import type { Workout, WorkoutExercise } from '@/domain/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { toWorkout, toWorkoutExercise } from '@/lib/supabase/mappers';

export interface WorkoutHistory {
  readonly workouts: Workout[];
  readonly entries: WorkoutExercise[];
}

export const EMPTY_HISTORY: WorkoutHistory = { workouts: [], entries: [] };

/**
 * Scarica tutto lo storico in una volta sola.
 *
 * Sono poche centinaia di righe — l'intero diario del 2025/26 sono 68
 * allenamenti e 202 voci — quindi una query per esercizio selezionato
 * costerebbe piu' latenza di quanta ne risparmi. Con tutto in memoria, cambiare
 * esercizio nelle dashboard e' istantaneo e non tocca la rete.
 *
 * Il filtro per utente lo fa la RLS.
 */
export async function loadWorkoutHistory(): Promise<WorkoutHistory> {
  const supabase = getSupabaseClient();

  const [workoutsResult, entriesResult] = await Promise.all([
    supabase.from('workouts').select('*').order('workout_date', { ascending: true }),
    supabase.from('workout_exercises').select('*'),
  ]);

  if (workoutsResult.error) throw toAppError(workoutsResult.error, 'error.history.load');
  if (entriesResult.error) throw toAppError(entriesResult.error, 'error.history.load');

  return {
    workouts: workoutsResult.data.map(toWorkout),
    entries: entriesResult.data.map(toWorkoutExercise),
  };
}
