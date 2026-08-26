/**
 * Statistiche per esercizio (spec §6).
 *
 * Riusa la logica del prototipo, ma senza riscriverne la semantica: min/max,
 * direzione del trend e formattazione arrivano tutte dal registro metriche
 * (`metrics.ts`). Qui c'è solo l'aggregazione.
 */

import { bestValue, isBetter, isComparable, trendOf, type Trend } from '@/domain/metrics';
import type { MetricType, Workout, WorkoutExercise } from '@/domain/types';

export interface HistoryPoint {
  /** Data dell'allenamento, non della riga: la riga non ce l'ha. */
  readonly date: string;
  readonly originalDate: string | null;
  readonly entry: WorkoutExercise;
  /**
   * Gli altri esercizi eseguiti insieme a questo nello stesso superset, in
   * ordine di esecuzione (spec §5.6). Vuoto se la voce non era in un superset.
   *
   * E' contesto, non un dato confrontabile: dice PERCHE' quel giorno le
   * ripetizioni sono quelle — 25 trazioni alternate ai piegamenti non sono 25
   * trazioni fresche — senza entrare nei calcoli, che restano per esercizio.
   */
  readonly supersetWith: readonly string[];
}

export interface ExerciseStats {
  /** Tutte le voci in ordine cronologico, comprese escluse e senza valore. */
  readonly points: readonly HistoryPoint[];
  /**
   * Le voci che entrano nei calcoli: con un valore e non escluse (spec §6).
   * Una voce esclusa resta visibile in elenco ma non muove best, trend o PR.
   */
  readonly comparable: readonly HistoryPoint[];
  readonly first: HistoryPoint | null;
  readonly best: HistoryPoint | null;
  readonly last: HistoryPoint | null;
  readonly bestValue: number | null;
  /**
   * Confronto prima → ultima, come nel prototipo: dice se in tutto il periodo
   * sei migliorato, non se l'ultima sessione è andata meglio della penultima.
   */
  readonly trend: {
    readonly direction: Trend;
    /** Differenza grezza ultima − prima. Il segno è del numero, non del merito:
     *  per `time` un rawDelta negativo è un miglioramento. */
    readonly rawDelta: number | null;
  };
}

function pointValue(point: HistoryPoint): number | null {
  return point.entry.metricValue;
}

export function buildHistory(
  entries: readonly WorkoutExercise[],
  workoutsById: ReadonlyMap<string, Workout>,
  exerciseId: string,
  /** Nomi del catalogo: servono a dire con CHI era in superset, non con quale id. */
  exerciseNames: ReadonlyMap<string, string> = new Map(),
): HistoryPoint[] {
  /** Compagni di superset di una voce, per chiave e in ordine di esecuzione. */
  const companions = (entry: WorkoutExercise): string[] => {
    if (entry.supersetKey === null) return [];
    return entries
      .filter(
        (other) =>
          other.supersetKey === entry.supersetKey &&
          other.workoutId === entry.workoutId &&
          other.id !== entry.id,
      )
      .sort((a, b) => (a.supersetOrder ?? 0) - (b.supersetOrder ?? 0))
      .map((other) => exerciseNames.get(other.exerciseId) ?? '')
      .filter((name) => name !== '');
  };

  return entries
    .filter((entry) => entry.exerciseId === exerciseId)
    .flatMap((entry) => {
      const workout = workoutsById.get(entry.workoutId);
      if (!workout) return [];
      return [
        {
          date: workout.workoutDate,
          originalDate: workout.originalDate,
          entry,
          supersetWith: companions(entry),
        },
      ] satisfies HistoryPoint[];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computeStats(points: readonly HistoryPoint[], metricType: MetricType): ExerciseStats {
  const comparable = points.filter(
    (point) => pointValue(point) !== null && !point.entry.isExcluded,
  );
  const values = comparable.map((point) => pointValue(point) ?? 0);

  const best = bestValue(metricType, values);
  const bestPoint = best === null ? null : (comparable.find((p) => pointValue(p) === best) ?? null);
  const first = comparable[0] ?? null;
  const last = comparable.at(-1) ?? null;

  let direction: Trend = 'unchanged';
  let rawDelta: number | null = null;
  if (comparable.length >= 2 && first && last && isComparable(metricType)) {
    const firstValue = pointValue(first) ?? 0;
    const lastValue = pointValue(last) ?? 0;
    rawDelta = lastValue - firstValue;
    direction = trendOf(metricType, lastValue, firstValue);
  }

  return {
    points,
    comparable,
    first,
    best: bestPoint,
    last,
    bestValue: best,
    trend: { direction, rawDelta },
  };
}

/**
 * Badge PR sul record (spec §6). Con una sola sessione non c'è record da
 * celebrare: sarebbe soltanto l'unico dato disponibile.
 */
export function isPersonalRecord(point: HistoryPoint, stats: ExerciseStats): boolean {
  if (stats.comparable.length < 2 || stats.bestValue === null) return false;
  if (point.entry.isExcluded) return false;
  return pointValue(point) === stats.bestValue;
}

/** True se questa voce ha battuto tutte quelle che la precedono. */
export function isNewRecordAt(
  point: HistoryPoint,
  stats: ExerciseStats,
  metricType: MetricType,
): boolean {
  const value = pointValue(point);
  if (value === null || point.entry.isExcluded) return false;

  const previous = stats.comparable.filter((other) => other.date < point.date);
  if (previous.length === 0) return false;

  const previousBest = bestValue(
    metricType,
    previous.map((other) => pointValue(other) ?? 0),
  );
  return previousBest !== null && isBetter(metricType, value, previousBest);
}
