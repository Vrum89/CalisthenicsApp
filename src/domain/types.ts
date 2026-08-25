/**
 * Modello di dominio (spec §3.4).
 *
 * Tutto camelCase. Le colonne del database sono snake_case: la traduzione
 * avviene una volta sola, nei mapper del data-access layer
 * (`src/lib/supabase/mappers.ts`). Fuori da lì il snake_case non esiste.
 */

export type MetricType = 'sets' | 'reps' | 'minutes' | 'time' | 'note';
export type WorkoutType = 'from_program' | 'freestyle' | 'test';

export const METRIC_TYPES: readonly MetricType[] = ['sets', 'reps', 'minutes', 'time', 'note'];
export const WORKOUT_TYPES: readonly WorkoutType[] = ['from_program', 'freestyle', 'test'];

export interface Exercise {
  id: string;
  userId: string;
  name: string;
  category: string;
  metricType: MetricType;
  isActive: boolean;
  /**
   * Durata della finestra a tempo, in secondi. `null` = quella di default della
   * metrica (registro metriche): un "max ripetizioni" e' su 10 minuti finche'
   * non si dice altro.
   */
  windowSeconds: number | null;
  createdAt: string; // ISO timestamp
}

export interface Program {
  id: string;
  userId: string;
  name: string;
  startDate: string; // ISO date
  endDate: string | null; // null = attiva
  notes: string | null;
  createdAt: string;
}

export interface ProgramDay {
  id: string;
  userId: string;
  programId: string;
  name: string; // es. "A", "B"
  sortOrder: number;
}

export interface ProgramExercise {
  id: string;
  userId: string;
  programDayId: string;
  exerciseId: string;
  sortOrder: number;
  defaultScheme: string | null; // es. "5x6"
  defaultWeightKg: number | null;
  supersetKey: string | null; // esercizi con la stessa chiave = un superset
  supersetOrder: number | null; // ordine dentro il superset
}

export interface Workout {
  id: string;
  userId: string;
  workoutDate: string; // ISO date
  workoutType: WorkoutType;
  programDayId: string | null;
  originalDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WorkoutExercise {
  id: string;
  userId: string;
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  scheme: string | null; // es. "5x8"
  repsPerSet: number[] | null; // es. [6, 6, 6, 6, 4]
  metricValue: number | null; // unificato; per 'sets' = sum(repsPerSet)
  addedWeightKg: number | null;
  variant: string | null;
  notes: string | null;
  isExcluded: boolean;
  exclusionReason: string | null;
  supersetKey: string | null;
  supersetOrder: number | null;
}

export interface BodyWeight {
  id: string;
  userId: string;
  measuredOn: string; // ISO date
  weightKg: number;
  notes: string | null;
  createdAt: string;
}
