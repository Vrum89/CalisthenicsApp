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

/** L'ordine di questo array è l'ordine in cui le categorie appaiono nell'app. */
export const EXERCISE_CATEGORIES = [
  'strength_sets',
  'max_reps_10min',
  'time_circuits',
  'max_effort',
  'running',
  'other',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

const CATEGORY_LABEL_KEYS: Record<ExerciseCategory, TranslationKey> = {
  strength_sets: 'category.strength_sets',
  max_reps_10min: 'category.max_reps_10min',
  time_circuits: 'category.time_circuits',
  max_effort: 'category.max_effort',
  running: 'category.running',
  other: 'category.other',
};

export function isKnownCategory(value: string): value is ExerciseCategory {
  return EXERCISE_CATEGORIES.some((category) => category === value);
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
