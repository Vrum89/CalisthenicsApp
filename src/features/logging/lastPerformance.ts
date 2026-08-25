/**
 * L'ultima performance di ogni esercizio: il riferimento da battere (spec §5,
 * regola della progressione).
 *
 * Si ricava dallo storico gia' in memoria — sono poche centinaia di righe, le
 * stesse che alimentano le dashboard — invece che con una query per esercizio.
 * Aprire l'app per allenarsi fa cosi' una richiesta sola.
 */

import { formatMetricValue } from '@/domain/metrics';
import type { MetricType, Workout, WorkoutExercise } from '@/domain/types';
import type { WorkoutHistory } from '@/features/history/historyRepository';
import type { TranslateFn } from '@/lib/i18n/types';

export interface LastPerformance {
  readonly entry: WorkoutExercise;
  readonly date: string;
}

export const NO_PERFORMANCES: ReadonlyMap<string, LastPerformance> = new Map();

/**
 * Chiave d'ordine di una voce nello storico.
 *
 * La data da sola non basta a dire quale sia "l'ultima": due allenamenti dello
 * stesso giorno pareggiano, e a parita' vinceva quello che capitava per primo
 * nell'elenco — cioe' a caso. `createdAt` scioglie il pareggio fra allenamenti,
 * `sortOrder` fra due voci dentro lo stesso allenamento.
 *
 * Confronto fra stringhe: le date sono ISO, quindi l'ordine alfabetico e' quello
 * cronologico; `sortOrder` va imbottito o "10" verrebbe prima di "2".
 */
function orderKey(workout: Workout, entry: WorkoutExercise): string {
  return `${workout.workoutDate}|${workout.createdAt}|${String(entry.sortOrder).padStart(4, '0')}`;
}

/** Scorre lo storico una volta sola, dal piu' vecchio al piu' recente. */
function scanChronologically(
  history: WorkoutHistory,
  visit: (entry: WorkoutExercise, workout: Workout) => void,
): void {
  const workoutsById = new Map(history.workouts.map((workout) => [workout.id, workout]));

  history.entries
    .flatMap((entry) => {
      const workout = workoutsById.get(entry.workoutId);
      return workout ? [{ entry, workout, key: orderKey(workout, entry) }] : [];
    })
    .sort((a, b) => a.key.localeCompare(b.key))
    .forEach(({ entry, workout }) => {
      visit(entry, workout);
    });
}

/**
 * Ultima voce per esercizio.
 *
 * Le voci escluse dai calcoli restano candidate: "escluso" vuol dire fuori da
 * record e trend (una seduta da infortunato), non che non sia successo. Come
 * punto di partenza da editare e' comunque piu' utile del nulla.
 */
export function lastPerformances(history: WorkoutHistory): Map<string, LastPerformance> {
  const latest = new Map<string, LastPerformance>();
  // Scorrendo in ordine, l'ultima scrittura per esercizio e' quella giusta.
  scanChronologically(history, (entry, workout) => {
    latest.set(entry.exerciseId, { entry, date: workout.workoutDate });
  });
  return latest;
}

/**
 * Valori di testo gia' usati per un esercizio, dal piu' recente.
 *
 * Serve due campi liberi — la condizione e lo scheme — che restano liberi: le
 * condizioni le inventa l'allenamento, e "piramide" e' una parola legittima
 * quanto "5x6". Ma riscrivere "materassino + disco 10 kg" a mano ogni volta e'
 * il modo migliore per ritrovarsi tre grafie della stessa cosa, e tre linee
 * separate nel grafico.
 */
function recentValues(
  history: WorkoutHistory,
  pick: (entry: WorkoutExercise) => string | null,
): Map<string, string[]> {
  const seen = new Map<string, string[]>();

  scanChronologically(history, (entry) => {
    const value = pick(entry)?.trim();
    if (value === undefined || value === '') return;

    // Il piu' recente in testa: si riscrive la voce anche se c'era gia'.
    const values = (seen.get(entry.exerciseId) ?? []).filter((other) => other !== value);
    seen.set(entry.exerciseId, [value, ...values]);
  });

  return seen;
}

export function knownVariants(history: WorkoutHistory): Map<string, string[]> {
  return recentValues(history, (entry) => entry.variant);
}

export function knownSchemes(history: WorkoutHistory): Map<string, string[]> {
  return recentValues(history, (entry) => entry.scheme);
}

export interface ExerciseUsage {
  readonly count: number;
  /** Data dell'ultimo allenamento in cui compare. */
  readonly lastDate: string;
}

/**
 * Quante volte un esercizio e' stato registrato, e quando l'ultima.
 *
 * Serve a decidere se si puo' eliminare dal catalogo: un esercizio mai usato e'
 * solo una voce sbagliata da togliere, uno usato e' la chiave di un pezzo di
 * storico. Chi non compare qui non e' mai stato usato.
 */
export function exerciseUsage(history: WorkoutHistory): Map<string, ExerciseUsage> {
  const usage = new Map<string, ExerciseUsage>();
  scanChronologically(history, (entry, workout) => {
    const current = usage.get(entry.exerciseId);
    usage.set(entry.exerciseId, {
      count: (current?.count ?? 0) + 1,
      lastDate: workout.workoutDate,
    });
  });
  return usage;
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
