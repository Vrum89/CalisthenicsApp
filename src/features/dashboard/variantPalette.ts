/**
 * Colori per distinguere le varianti sul grafico.
 *
 * Sono i primi slot della palette categorica di riferimento, nella versione per
 * fondo scuro e nell'ordine documentato: l'ordine non si rimescola e i colori
 * non si riciclano.
 *
 * Verificati con lo script del metodo sul fondo reale del grafico (#0f172a):
 *
 *   4 slot, coppie adiacenti (barre e linee)  → tutti i controlli passano
 *                                               (peggior coppia ΔE 8,4 CVD / 19,8 a colori pieni)
 *   3 slot, tutte le coppie (punti sparsi)    → tutti i controlli passano
 *   4 slot, tutte le coppie                   → FALLISCE (giallo e arancio
 *                                               indistinguibili, ΔE 4,8 CVD)
 *
 * Da qui le due regole sotto: al massimo quattro varianti colorate, e quando i
 * punti non sono uniti da una linea per variante si resta a tre. Oltre, si
 * ripiega su un grigio neutro invece di inventare un nono colore.
 */

/** Slot 1-4 della palette categorica, versione per fondo scuro. */
const SLOTS = ['#3987e5', '#d95926', '#199e70', '#c98500'] as const;

/** Colore delle varianti oltre il limite: neutro, mai un colore nuovo. */
export const OVERFLOW_COLOR = '#94a3b8';

/** Colore unico quando l'esercizio ha una sola condizione: il tema dell'app. */
export const SINGLE_SERIES_COLOR = '#fbbf24';

export const MAX_COLOURED_VARIANTS = SLOTS.length;

/**
 * Colore per posizione nell'elenco delle varianti.
 *
 * L'indice è la posizione stabile della variante, non il suo rango fra quelle
 * visibili: filtrando, una variante conserva il proprio colore.
 */
export function variantColor(index: number): string {
  return SLOTS[index] ?? OVERFLOW_COLOR;
}
