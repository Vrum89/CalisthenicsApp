/**
 * Categorie degli esercizi.
 *
 * Nel database `category` resta una colonna `text` (spec §3.3), ma i valori
 * canonici sono chiavi stabili e neutre rispetto alla lingua (`strength_sets`,
 * non "Forza (serie × rip)"): l'etichetta mostrata viene dall'i18n, così le
 * categorie seguono la lingua dell'interfaccia come tutto il resto.
 *
 * Nessun CHECK sul database e nessun errore sulle chiavi sconosciute: una
 * categoria non riconosciuta viene mostrata così com'è. Questo tiene aperta la
 * porta a categorie personali senza che una riga inattesa faccia esplodere una
 * schermata — a differenza di `metricType`, dove un valore ignoto cambierebbe
 * il significato del dato e quindi va rifiutato.
 */

import type { TranslateFn, TranslationKey } from '@/lib/i18n/types';
import type { MetricType } from '@/domain/types';

/** L'ordine di questo array è l'ordine in cui le categorie appaiono nell'app. */
export const EXERCISE_CATEGORIES = [
  'strength_sets',
  'max_reps_window',
  'time_circuits',
  'max_effort',
  'running',
  'other',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

const CATEGORY_LABEL_KEYS: Record<ExerciseCategory | 'max_reps_10min', TranslationKey> = {
  strength_sets: 'category.strength_sets',
  max_reps_window: 'category.max_reps_window',
  // Chiave storica: la finestra non e' sempre di dieci minuti, e il nome lo
  // diceva. Resta qui tradotta perche' finche' la migrazione non e' applicata
  // le righe vecchie devono comunque leggersi.
  max_reps_10min: 'category.max_reps_window',
  time_circuits: 'category.time_circuits',
  max_effort: 'category.max_effort',
  running: 'category.running',
  other: 'category.other',
};

/**
 * La metrica che una categoria si porta dietro quasi sempre.
 *
 * E' solo una proposta al momento di creare un esercizio: la categoria e'
 * un'etichetta per raggrupparlo, la metrica decide come si legge il numero, e
 * restano indipendenti (un massimale a tempo e' legittimo). Serve a non far
 * scegliere due volte la stessa cosa a chi sta creando un esercizio in palestra.
 */
const DEFAULT_METRIC: Record<ExerciseCategory | 'max_reps_10min', MetricType> = {
  strength_sets: 'sets',
  max_reps_window: 'reps',
  max_reps_10min: 'reps',
  time_circuits: 'time',
  max_effort: 'reps',
  running: 'time',
  other: 'note',
};

export function defaultMetricFor(category: string): MetricType {
  return isKnownCategory(category) ? DEFAULT_METRIC[category] : 'sets';
}

export function isKnownCategory(value: string): value is ExerciseCategory {
  return value in CATEGORY_LABEL_KEYS;
}

/** Chiave nota → etichetta tradotta; qualsiasi altra cosa → il valore grezzo. */
export function categoryLabel(t: TranslateFn, category: string): string {
  return isKnownCategory(category) ? t(CATEGORY_LABEL_KEYS[category]) : category;
}

/**
 * Posizione di ordinamento. Le categorie non riconosciute finiscono in fondo,
 * dopo `other`, invece di infilarsi in mezzo a quelle canoniche.
 */
export function categoryRank(category: string): number {
  const index = EXERCISE_CATEGORIES.findIndex((candidate) => candidate === category);
  return index === -1 ? EXERCISE_CATEGORIES.length : index;
}

/**
 * Confronto per l'ordinamento delle categorie: prima l'ordine canonico, poi
 * quelle sconosciute in ordine alfabetico secondo la lingua corrente.
 */
export function compareCategories(t: TranslateFn, a: string, b: string): number {
  const rankDelta = categoryRank(a) - categoryRank(b);
  if (rankDelta !== 0) return rankDelta;
  return categoryLabel(t, a).localeCompare(categoryLabel(t, b));
}
