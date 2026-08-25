/**
 * Corrispondenza fra i nomi del vecchio diario e il catalogo canonico (spec §8).
 *
 * Sta in un file a parte perche' e' la parte della migrazione che va LETTA e
 * approvata da una persona, non il codice che la esegue. Se un nome qui e'
 * sbagliato, 200 righe di storico finiscono sotto l'esercizio sbagliato.
 *
 * Convenzione dei nomi canonici (dal seed scritto a mano):
 *   - nome semplice per gli esercizi a serie          → "Chin up"
 *   - qualificatore fra parentesi se cambia metrica   → "Dip (10 min)"
 *   - il "come" e' una variante, non un nome diverso  → "(manicotti)" → variant
 */

import type { ExerciseCategory } from '@/domain/categories';
import type { MetricType } from '@/domain/types';

export interface CatalogEntry {
  readonly name: string;
  readonly category: ExerciseCategory;
  readonly metricType: MetricType;
}

/** Catalogo canonico completo: e' cio' che finira' nella tabella `exercises`. */
export const CATALOG: readonly CatalogEntry[] = [
  { name: 'Chin up', category: 'strength_sets', metricType: 'sets' },
  { name: 'Pull up', category: 'strength_sets', metricType: 'sets' },
  { name: 'Dip', category: 'strength_sets', metricType: 'sets' },
  { name: 'Piegamenti', category: 'strength_sets', metricType: 'sets' },
  { name: 'Chin up EMOM', category: 'strength_sets', metricType: 'minutes' },

  { name: 'Pull up (10 min)', category: 'max_reps_10min', metricType: 'reps' },
  { name: 'Dip (10 min)', category: 'max_reps_10min', metricType: 'reps' },
  { name: 'Dip anelli (10 min)', category: 'max_reps_10min', metricType: 'reps' },
  { name: 'Hand stand push up (10 min)', category: 'max_reps_10min', metricType: 'reps' },
  { name: 'V push up (10 min)', category: 'max_reps_10min', metricType: 'reps' },

  { name: 'Circuito: 25 chin up', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 25 chin up + 50 push up', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 25 chin up + 50 dip', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 35 chin up + 50 push up strette', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 20 chin up (2s) + 50 bar dip', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 35 dip in buca (2s) + 30 pull up', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 60 push up + 30 chin up', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 60 bar dip (larga) + 30 pull up', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 40 bar dip + 25 chin up', category: 'time_circuits', metricType: 'time' },
  { name: 'Circuito: 20 chin up + 20 dip @5kg', category: 'time_circuits', metricType: 'time' },

  { name: 'Massimale: Pull up', category: 'max_effort', metricType: 'reps' },
  { name: 'Massimale: Chin up', category: 'max_effort', metricType: 'reps' },
  { name: 'Massimale: Dip', category: 'max_effort', metricType: 'reps' },
  { name: 'Massimale: Hand stand push up', category: 'max_effort', metricType: 'reps' },
  { name: 'Massimale: Piegamenti', category: 'max_effort', metricType: 'reps' },

  { name: 'Corsa 1 km', category: 'running', metricType: 'time' },
  { name: 'Nota libera', category: 'other', metricType: 'note' },
];

export interface NameMapping {
  /** Nome canonico nel catalogo. */
  readonly to: string;
  /**
   * Variante implicita nel vecchio nome. "(manicotti)" descriveva COME veniva
   * eseguito il circuito, non un circuito diverso: tenerlo nel nome avrebbe
   * spezzato lo storico in due linee separate nelle dashboard.
   */
  readonly variant?: string;
}

/** Vecchio nome (prototipo o seed) → catalogo canonico. */
export const NAME_MAP: Readonly<Record<string, NameMapping>> = {
  // --- prototipo: forza a serie ---
  'Chin up – serie': { to: 'Chin up' },
  'Pull up – serie': { to: 'Pull up' },
  'Dip – serie': { to: 'Dip' },
  'Chin up EMOM 3 rip @5kg': { to: 'Chin up EMOM' },

  // --- prototipo: max ripetizioni in 10 minuti ---
  'Pull up – 10 min': { to: 'Pull up (10 min)' },
  'Dip – 10 min': { to: 'Dip (10 min)' },
  'Dip anelli – 10 min': { to: 'Dip anelli (10 min)' },
  'HSPU – 10 min': { to: 'Hand stand push up (10 min)' },
  'V push up – 10 min': { to: 'V push up (10 min)' },

  // --- prototipo: circuiti a tempo ---
  'Circuito: 25 chin up': { to: 'Circuito: 25 chin up' },
  'Circuito: 25 chin up + 50 push up (manicotti)': {
    to: 'Circuito: 25 chin up + 50 push up',
    variant: 'manicotti',
  },
  'Circuito: 25 chin up + 50 dip': { to: 'Circuito: 25 chin up + 50 dip' },
  'Circuito: 35 chin up + 50 push up strette': { to: 'Circuito: 35 chin up + 50 push up strette' },
  'Circuito: 20 chin up (2s) + 50 bar dip': { to: 'Circuito: 20 chin up (2s) + 50 bar dip' },
  'Circuito: 35 dip in buca (2s) + 30 pull up': { to: 'Circuito: 35 dip in buca (2s) + 30 pull up' },
  'Circuito: 60 push up + 30 chin up': { to: 'Circuito: 60 push up + 30 chin up' },
  'Circuito: 60 bar dip (larga) + 30 pull up': { to: 'Circuito: 60 bar dip (larga) + 30 pull up' },
  'Circuito: 40 bar dip + 25 chin up': { to: 'Circuito: 40 bar dip + 25 chin up' },
  'Circuito: 20 chin up + 20 dip @5kg': { to: 'Circuito: 20 chin up + 20 dip @5kg' },

  // --- prototipo: massimali ---
  'Massimale: Pull up': { to: 'Massimale: Pull up' },
  'Massimale: Chin up': { to: 'Massimale: Chin up' },
  'Massimale: Dip': { to: 'Massimale: Dip' },
  'Massimale: HSPU': { to: 'Massimale: Hand stand push up' },
  'Massimale: Push up': { to: 'Massimale: Piegamenti' },

  // --- prototipo: resto ---
  'Corsa 1 km': { to: 'Corsa 1 km' },
  'Altro / note': { to: 'Nota libera' },

  // --- seed di luglio/agosto: stesso circuito del prototipo, scritto senza
  //     i due punti. Unificarlo evita due linee separate in dashboard. ---
  'Circuito 25 chin up + 50 push up': { to: 'Circuito: 25 chin up + 50 push up' },
};

/**
 * I superset storici non sono un esercizio: sono due esercizi legati (spec §8).
 * La riga "Superset 5 trazioni + 10 spinte x5" va quindi espansa in due.
 *
 * Il diario dice quali esercizi solo due volte su cinque ("dip" il 31/03,
 * "piegamenti" il 14/05). Le altre tre riportano solo il riposo. Il default e'
 * pull up + piegamenti perche' e' cio' che dicono sia la voce del 14/05 sia
 * tutti i superset del seed di luglio/agosto, che appartengono allo stesso
 * periodo di allenamento.
 */
export const SUPERSET_SOURCE_NAME = 'Superset 5 trazioni + 10 spinte x5';

export interface SupersetPlan {
  readonly rounds: number;
  readonly members: readonly { readonly name: string; readonly repsPerRound: number }[];
}

export const DEFAULT_SUPERSET: SupersetPlan = {
  rounds: 5,
  members: [
    { name: 'Pull up', repsPerRound: 5 },
    { name: 'Piegamenti', repsPerRound: 10 },
  ],
};

/** Date in cui il diario dichiara esplicitamente esercizi diversi dal default. */
export const SUPERSET_OVERRIDES: Readonly<Record<string, SupersetPlan>> = {
  '2026-03-31': {
    rounds: 5,
    members: [
      { name: 'Pull up', repsPerRound: 5 },
      { name: 'Dip', repsPerRound: 10 },
    ],
  },
};
