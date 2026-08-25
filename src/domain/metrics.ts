/**
 * Registro delle metriche (spec §4).
 *
 * UNICA fonte della semantica di una metrica. Nel prototipo lo stesso concetto
 * era codificato in cinque punti diversi (META, CAPTION, la logica del trend, il
 * calcolo di `best`, fmtVal) e andavano tenuti allineati a mano: era il difetto
 * centrale da correggere.
 *
 * Regola: nessun altro file deve contenere un `Math.max` su valori di metrica,
 * un `mm:ss`, o un `if (metricType === ...)` che decida come va letto un numero.
 * Se serve un comportamento nuovo per metrica, si aggiunge un campo qui.
 *
 * Aggiungere una metrica = aggiungere una entry a METRIC_CONFIG, e basta.
 *
 * Deviazione dallo spec: `label`, `unit` e `caption` sono chiavi di traduzione,
 * non stringhe. L'app e' bilingue (IT/EN) e una stringa italiana incastonata qui
 * avrebbe reso il registro l'unico punto non traducibile. `formatValue` riceve
 * l'unita' gia' risolta, cosi' resta una funzione pura del numero.
 */

import type { TranslateFn, TranslationKey } from '@/lib/i18n/types';
import type { MetricType } from '@/domain/types';

export interface MetricConfig {
  labelKey: TranslationKey; // etichetta UI
  unitKey: TranslationKey; // es. "rip", "min", "s"
  inputKind: 'set-checkboxes' | 'number' | 'stopwatch' | 'text';
  higherIsBetter: boolean; // true → best = max; false → best = min (time)
  formatValue: (value: number, unit: string) => string; // es. mm:ss per 'time'
  deriveValue?: (repsPerSet: number[]) => number; // per 'sets': somma
  captionKey: TranslationKey;
  chartKind: 'bars-plus-weight-line' | 'line' | 'none';
}

/** Formattazione mm:ss, ereditata dal prototipo (`mmss`). */
function formatSeconds(value: number): string {
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

function plainNumber(value: number): string {
  return String(value);
}

function numberWithUnit(value: number, unit: string): string {
  return `${String(value)} ${unit}`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export const METRIC_CONFIG: Record<MetricType, MetricConfig> = {
  sets: {
    labelKey: 'metric.sets.label',
    unitKey: 'metric.unit.reps',
    inputKind: 'set-checkboxes',
    higherIsBetter: true,
    formatValue: plainNumber,
    deriveValue: sum,
    captionKey: 'metric.sets.caption',
    chartKind: 'bars-plus-weight-line',
  },
  reps: {
    labelKey: 'metric.reps.label',
    unitKey: 'metric.unit.reps',
    inputKind: 'number',
    higherIsBetter: true,
    formatValue: plainNumber,
    captionKey: 'metric.reps.caption',
    chartKind: 'line',
  },
  minutes: {
    labelKey: 'metric.minutes.label',
    unitKey: 'metric.unit.minutes',
    inputKind: 'number',
    higherIsBetter: true,
    formatValue: numberWithUnit,
    captionKey: 'metric.minutes.caption',
    chartKind: 'line',
  },
  time: {
    labelKey: 'metric.time.label',
    unitKey: 'metric.unit.seconds',
    inputKind: 'stopwatch',
    higherIsBetter: false,
    formatValue: formatSeconds,
    captionKey: 'metric.time.caption',
    chartKind: 'line',
  },
  note: {
    // `higherIsBetter` non ha significato per una nota: non c'è niente da
    // ordinare. Il valore qui non viene mai letto, perché `isComparable` è false
    // per chartKind 'none' e blocca best/trend a monte.
    labelKey: 'metric.note.label',
    unitKey: 'metric.unit.none',
    inputKind: 'text',
    higherIsBetter: true,
    formatValue: plainNumber,
    captionKey: 'metric.note.caption',
    chartKind: 'none',
  },
};

export function metricConfig(metricType: MetricType): MetricConfig {
  return METRIC_CONFIG[metricType];
}

/** Placeholder unico per "nessun valore", allineato al prototipo. */
export const EMPTY_VALUE = '—';

export function metricLabel(t: TranslateFn, metricType: MetricType): string {
  return t(metricConfig(metricType).labelKey);
}

export function metricUnit(t: TranslateFn, metricType: MetricType): string {
  return t(metricConfig(metricType).unitKey);
}

export function metricCaption(t: TranslateFn, metricType: MetricType): string {
  return t(metricConfig(metricType).captionKey);
}

export function formatMetricValue(
  t: TranslateFn,
  metricType: MetricType,
  value: number | null,
): string {
  if (value === null) return EMPTY_VALUE;
  const config = metricConfig(metricType);
  return config.formatValue(value, t(config.unitKey));
}

/**
 * Come `formatMetricValue`, ma senza unità: serve ai tick degli assi, dove
 * l'unità è già detta dalla didascalia e ripeterla su ogni tacca è rumore.
 * Resta qui e non nel grafico perché è pur sempre "come si scrive un valore".
 */
export function formatMetricTick(metricType: MetricType, value: number): string {
  return metricConfig(metricType).formatValue(value, '').trim();
}

/**
 * Calcola `metricValue` dalle serie registrate. Per 'sets' è la somma di
 * repsPerSet; per le altre metriche il valore non è derivabile e va inserito.
 */
export function deriveMetricValue(
  metricType: MetricType,
  repsPerSet: readonly number[] | null,
): number | null {
  const { deriveValue } = metricConfig(metricType);
  if (!deriveValue || repsPerSet === null) return null;
  return deriveValue([...repsPerSet]);
}

/** Una metrica è confrontabile se ha un grafico, cioè se ha un ordinamento. */
export function isComparable(metricType: MetricType): boolean {
  return metricConfig(metricType).chartKind !== 'none';
}

/**
 * Il record fra più valori: max o min a seconda di `higherIsBetter`.
 * Chi chiama deve già aver escluso le voci con `isExcluded` (spec §6).
 */
export function bestValue(metricType: MetricType, values: readonly number[]): number | null {
  if (!isComparable(metricType) || values.length === 0) return null;
  const { higherIsBetter } = metricConfig(metricType);
  return values.reduce((best, value) =>
    higherIsBetter ? Math.max(best, value) : Math.min(best, value),
  );
}

/** True se `candidate` è un risultato migliore di `reference` per questa metrica. */
export function isBetter(metricType: MetricType, candidate: number, reference: number): boolean {
  if (!isComparable(metricType)) return false;
  return metricConfig(metricType).higherIsBetter ? candidate > reference : candidate < reference;
}

/**
 * Direzione del trend in termini di risultato, non di segno numerico: per 'time'
 * un valore che scende è un miglioramento. Da qui discende il colore (verde =
 * `improved`), così nessuna vista deve ragionare su min/max per conto suo.
 */
export type Trend = 'improved' | 'worsened' | 'unchanged';

export function trendOf(metricType: MetricType, current: number, previous: number): Trend {
  if (!isComparable(metricType) || current === previous) return 'unchanged';
  return isBetter(metricType, current, previous) ? 'improved' : 'worsened';
}
