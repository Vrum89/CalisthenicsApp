/**
 * Raggruppamento per variante.
 *
 * `variant` registra le CONDIZIONI in cui è stato prodotto un numero: la
 * zavorra no (quella ha un campo suo), ma il tempo di esecuzione, l'attrezzo,
 * e soprattutto l'assistenza — il materassino sotto la testa negli handstand
 * push up accorcia la discesa e cambia completamente cosa significhi "30".
 *
 * Numeri prodotti in condizioni diverse non sono confrontabili fra loro. Da qui
 * il filtro nelle dashboard: dentro una condizione il confronto torna onesto.
 */

import type { TranslateFn } from '@/lib/i18n/types';
import type { HistoryPoint } from '@/domain/stats';

/** Voci senza variante: sono un gruppo anche loro, non un buco. */
export const NO_VARIANT = '';

export interface VariantGroup {
  /** La stringa salvata nel database, oppure NO_VARIANT. */
  readonly variant: string;
  readonly count: number;
}

/**
 * Le varianti di un esercizio, in ordine di prima comparsa.
 *
 * L'ordine è cronologico e non dipende da quante ne siano visibili: filtrare
 * non deve rimescolare i colori delle superstiti.
 */
export function listVariants(points: readonly HistoryPoint[]): VariantGroup[] {
  const counts = new Map<string, number>();
  for (const point of [...points].sort((a, b) => a.date.localeCompare(b.date))) {
    const variant = point.entry.variant ?? NO_VARIANT;
    counts.set(variant, (counts.get(variant) ?? 0) + 1);
  }
  return [...counts].map(([variant, count]) => ({ variant, count }));
}

export function pointsWithVariant(
  points: readonly HistoryPoint[],
  variant: string,
): HistoryPoint[] {
  return points.filter((point) => (point.entry.variant ?? NO_VARIANT) === variant);
}

/** Etichetta da mostrare: i nomi delle varianti sono dati dell'utente. */
export function variantLabel(t: TranslateFn, variant: string): string {
  return variant === NO_VARIANT ? t('dashboard.variantNone') : variant;
}
