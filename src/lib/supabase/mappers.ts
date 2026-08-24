/**
 * Confine fra database e dominio: snake_case ↔ camelCase (CLAUDE.md).
 *
 * E' l'unico posto in cui i due mondi si toccano. Qui vengono anche ristrette le
 * colonne `text` libere (`metric_type`, `workout_type`) alle union del dominio:
 * il database garantisce i valori con un CHECK, ma TypeScript vede `string`, e
 * un cast silenzioso avrebbe fatto entrare nel dominio dati mai validati.
 */

import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import {
  METRIC_TYPES,
  WORKOUT_TYPES,
  type BodyWeight,
  type Exercise,
  type MetricType,
  type Program,
  type ProgramDay,
  type ProgramExercise,
  type Workout,
  type WorkoutExercise,
  type WorkoutType,
} from '@/domain/types';

/** Righe nuove: id e created_at li genera il database. */
export type NewExercise = Omit<Exercise, 'id' | 'createdAt'>;
export type NewProgram = Omit<Program, 'id' | 'createdAt'>;
export type NewProgramDay = Omit<ProgramDay, 'id'>;
export type NewProgramExercise = Omit<ProgramExercise, 'id'>;
export type NewWorkout = Omit<Workout, 'id' | 'createdAt'>;
export type NewWorkoutExercise = Omit<WorkoutExercise, 'id'>;
export type NewBodyWeight = Omit<BodyWeight, 'id' | 'createdAt'>;

function parseMetricType(value: string): MetricType {
  const found = METRIC_TYPES.find((candidate) => candidate === value);
  if (!found) {
    throw new Error(`metric_type non riconosciuto dal dominio: "${value}".`);
  }
  return found;
}

function parseWorkoutType(value: string): WorkoutType {
  const found = WORKOUT_TYPES.find((candidate) => candidate === value);
  if (!found) {
    throw new Error(`workout_type non riconosciuto dal dominio: "${value}".`);
  }
  return found;
}

/**
 * Le colonne `numeric` possono tornare da PostgREST come stringa quando la
 * precisione supera quella di un double. Normalizzarle qui evita che un "5"
 * finisca dentro un Math.max e falsi un record.
 */
function toNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Valore numerico non valido dal database: "${String(value)}".`);
  }
  return parsed;
}

function toNullableNumber(value: number | string | null): number | null {
  return value === null ? null : toNumber(value);
}

// --- Database → dominio -----------------------------------------------------

export function toExercise(row: Tables<'exercises'>): Exercise {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    metricType: parseMetricType(row.metric_type),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function toProgram(row: Tables<'programs'>): Program {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toProgramDay(row: Tables<'program_days'>): ProgramDay {
  return {
    id: row.id,
    userId: row.user_id,
    programId: row.program_id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

export function toProgramExercise(row: Tables<'program_exercises'>): ProgramExercise {
  return {
    id: row.id,
    userId: row.user_id,
    programDayId: row.program_day_id,
    exerciseId: row.exercise_id,
    sortOrder: row.sort_order,
    defaultScheme: row.default_scheme,
    defaultWeightKg: toNullableNumber(row.default_weight_kg),
    supersetKey: row.superset_key,
    supersetOrder: row.superset_order,
  };
}

export function toWorkout(row: Tables<'workouts'>): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    workoutDate: row.workout_date,
    workoutType: parseWorkoutType(row.workout_type),
    programDayId: row.program_day_id,
    originalDate: row.original_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toWorkoutExercise(row: Tables<'workout_exercises'>): WorkoutExercise {
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    sortOrder: row.sort_order,
    scheme: row.scheme,
    repsPerSet: row.reps_per_set,
    metricValue: toNullableNumber(row.metric_value),
    addedWeightKg: toNullableNumber(row.added_weight_kg),
    variant: row.variant,
    notes: row.notes,
    isExcluded: row.is_excluded,
    exclusionReason: row.exclusion_reason,
    supersetKey: row.superset_key,
    supersetOrder: row.superset_order,
  };
}

export function toBodyWeight(row: Tables<'body_weights'>): BodyWeight {
  return {
    id: row.id,
    userId: row.user_id,
    measuredOn: row.measured_on,
    weightKg: toNumber(row.weight_kg),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// --- Dominio → database -----------------------------------------------------

export function fromExercise(exercise: NewExercise): TablesInsert<'exercises'> {
  return {
    user_id: exercise.userId,
    name: exercise.name,
    category: exercise.category,
    metric_type: exercise.metricType,
    is_active: exercise.isActive,
  };
}

export function fromProgram(program: NewProgram): TablesInsert<'programs'> {
  return {
    user_id: program.userId,
    name: program.name,
    start_date: program.startDate,
    end_date: program.endDate,
    notes: program.notes,
  };
}

export function fromProgramDay(day: NewProgramDay): TablesInsert<'program_days'> {
  return {
    user_id: day.userId,
    program_id: day.programId,
    name: day.name,
    sort_order: day.sortOrder,
  };
}

export function fromProgramExercise(
  entry: NewProgramExercise,
): TablesInsert<'program_exercises'> {
  return {
    user_id: entry.userId,
    program_day_id: entry.programDayId,
    exercise_id: entry.exerciseId,
    sort_order: entry.sortOrder,
    default_scheme: entry.defaultScheme,
    default_weight_kg: entry.defaultWeightKg,
    superset_key: entry.supersetKey,
    superset_order: entry.supersetOrder,
  };
}

export function fromWorkout(workout: NewWorkout): TablesInsert<'workouts'> {
  return {
    user_id: workout.userId,
    workout_date: workout.workoutDate,
    workout_type: workout.workoutType,
    program_day_id: workout.programDayId,
    original_date: workout.originalDate,
    notes: workout.notes,
  };
}

export function fromWorkoutExercise(
  entry: NewWorkoutExercise,
): TablesInsert<'workout_exercises'> {
  return {
    user_id: entry.userId,
    workout_id: entry.workoutId,
    exercise_id: entry.exerciseId,
    sort_order: entry.sortOrder,
    scheme: entry.scheme,
    reps_per_set: entry.repsPerSet,
    metric_value: entry.metricValue,
    added_weight_kg: entry.addedWeightKg,
    variant: entry.variant,
    notes: entry.notes,
    is_excluded: entry.isExcluded,
    exclusion_reason: entry.exclusionReason,
    superset_key: entry.supersetKey,
    superset_order: entry.supersetOrder,
  };
}

export function fromBodyWeight(entry: NewBodyWeight): TablesInsert<'body_weights'> {
  return {
    user_id: entry.userId,
    measured_on: entry.measuredOn,
    weight_kg: entry.weightKg,
    notes: entry.notes,
  };
}
