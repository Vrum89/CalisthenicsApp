/**
 * Lo scheme (`5x6`) e le due modalità del widget a serie (spec §5.6).
 *
 * Lo scheme è descrittivo, non prescrittivo: è un punto di partenza editabile.
 * Da qui discende una sola decisione, ma importante: se ha la forma `NxM` le
 * serie si pre-generano (modalità fissa), altrimenti si aggiungono una alla
 * volta senza limite (modalità aperta, per le piramidi a sfinimento).
 */

export interface ParsedScheme {
  readonly sets: number;
  readonly reps: number;
}

/** `"5x6"` → 5 serie da 6. Qualunque altra forma non è uno scheme fisso. */
export function parseScheme(scheme: string | null): ParsedScheme | null {
  if (scheme === null) return null;
  const match = /^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i.exec(scheme);
  if (!match) return null;

  const sets = Number(match[1]);
  const reps = Number(match[2]);
  if (sets < 1 || reps < 1) return null;
  return { sets, reps };
}

export function isOpenScheme(scheme: string | null): boolean {
  return parseScheme(scheme) === null;
}

/** Scrive lo scheme corrispondente a una serie di ripetizioni già svolte. */
export function describeScheme(repsPerSet: readonly number[]): string | null {
  if (repsPerSet.length === 0) return null;
  const first = repsPerSet[0] ?? 0;
  const uniform = repsPerSet.every((reps) => reps === first);
  return uniform ? `${String(repsPerSet.length)}x${String(first)}` : 'progressive';
}
