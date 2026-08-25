/**
 * L'ultima performance di ogni esercizio: il riferimento da battere (spec §5,
 * regola della progressione).
 *
 * Si ricava dallo storico gia' in memoria — sono poche centinaia di righe, le
 * stesse che alimentano le dashboard — invece che con una query per esercizio.
 * Aprire l'app per allenarsi fa cosi' una richiesta sola.
 */

import { formatMetricValue } from '@/domain/metrics';
import type { MetricType, WorkoutExercise } from '@/domain/types';
import type { WorkoutHistory } from '@/features/history/historyRepository';
import type { TranslateFn } from '@/lib/i18n/types';

export interface LastPerformance {
  readonly entry: WorkoutExercise;
  readonly date: string;
}

export const NO_PERFORMANCES: ReadonlyMap<string, LastPerformance> = new Map();

/**
 * Ultima voce per esercizio, per data dell'allenamento.
 *
 * Le voci escluse dai calcoli restano candidate: "escluso" vuol dire fuori da
 * record e trend (una seduta da infortunato), non che non sia successo. Come
 * punto di partenza da editare e' comunque piu' utile del nulla.
 */
export function lastPerformances(history: WorkoutHistory): Map<string, LastPerformance> {
  const dateByWorkout = new Map(history.workouts.map((workout) => [workout.id, workout.workoutDate]));
  const latest = new Map<string, LastPerformance>();

  for (const entry of history.entries) {
    const date = dateByWorkout.get(entry.workoutId);
    if (date === undefined) continue;

    const current = latest.get(entry.exerciseId);
    if (!current || date > current.date) latest.set(entry.exerciseId, { entry, date });
  }

  return latest;
}

/**
 * Riassunto in una riga: "5x6 · 30 rip · +5 kg · materassino".
 *
 * Lo scheme c'e' solo se il database lo aveva: nella modalita' aperta non esiste
 * un `NxM` da mostrare, e il totale dice gia' tutto.
 */
export function describePerformance(
  t: TranslateFn,
  metricType: MetricType,
  entry: WorkoutExercise,
): string {
  const parts: string[] = [];
  if (entry.scheme) parts.push(entry.scheme);
  if (entry.metricValue !== null) parts.push(formatMetricValue(t, metricType, entry.metricValue));
  if (entry.addedWeightKg !== null) parts.push(`+${String(entry.addedWeightKg)} kg`);
  if (entry.variant) parts.push(entry.variant);
  return parts.join(' · ');
}
