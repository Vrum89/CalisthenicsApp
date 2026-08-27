/**
 * Il superset come concetto di dominio (spec §5.6).
 *
 * Un superset non e' un'entita': e' due colonne nullable — `superset_key` e
 * `superset_order` — su righe che restano esercizi distinti. Vive in due posti,
 * la scheda (`program_exercises`) e l'allenamento registrato
 * (`workout_exercises`), e la chiave e' la stessa cosa in entrambi: per questo
 * sta qui e non dentro la bozza di logging.
 */

/** Righe raggruppabili: basta che sappiano dire a quale superset appartengono. */
export interface SupersetMember {
  readonly supersetKey: string | null;
}

export function newSupersetKey(): string {
  return crypto.randomUUID();
}

/**
 * Il blocco contiguo di righe che formano il superset di `index`.
 *
 * Contiguo di proposito: in una lista ordinata — gli slot di un giorno di
 * scheda — un superset e' un tratto, non un insieme sparso. Cosi' "aggancia al
 * precedente" e "stacca" restano operazioni locali, leggibili guardando la
 * riga sopra, senza dover cercare in fondo all'elenco chi altro condivide la
 * chiave. Una riga senza chiave e' un blocco di uno.
 */
export function supersetRun<T extends SupersetMember>(
  members: readonly T[],
  index: number,
): readonly T[] {
  const member = members[index];
  if (!member) return [];
  if (member.supersetKey === null) return [member];

  let start = index;
  while (start > 0 && members[start - 1]?.supersetKey === member.supersetKey) start -= 1;

  let end = index;
  while (end < members.length - 1 && members[end + 1]?.supersetKey === member.supersetKey) end += 1;

  return members.slice(start, end + 1);
}

export interface SupersetAssignment {
  readonly supersetKey: string | null;
  readonly supersetOrder: number | null;
}

/**
 * Rimette in ordine le chiavi di una lista dopo un aggancio, uno sgancio, uno
 * spostamento o una cancellazione.
 *
 * Due regole sole, applicate tratto per tratto:
 * - un superset di uno non e' un superset, la chiave si toglie;
 * - una chiave che ricompare piu' avanti, staccata dal suo tratto, e' un altro
 *   superset e prende una chiave nuova. Succede spostando un esercizio in mezzo
 *   a una coppia agganciata: senza questa regola resterebbero legati "a
 *   distanza", visibili come superset nel logging ma non nella scheda.
 *
 * Normalizzare tutto dopo ogni modifica costa qualche `update` in piu' e toglie
 * di mezzo una classe intera di stati incoerenti.
 */
export function normalizeSupersets<T extends SupersetMember>(
  members: readonly T[],
): SupersetAssignment[] {
  const detached: SupersetAssignment = {
    supersetKey: null,
    supersetOrder: null,
  };
  const assignments: SupersetAssignment[] = [];
  const seen = new Set<string>();

  let index = 0;
  while (index < members.length) {
    const key = members[index]?.supersetKey ?? null;
    if (key === null) {
      assignments.push(detached);
      index += 1;
      continue;
    }

    let end = index;
    while (end + 1 < members.length && members[end + 1]?.supersetKey === key) end += 1;
    const length = end - index + 1;

    const effective = length < 2 ? null : seen.has(key) ? newSupersetKey() : key;
    if (effective !== null) seen.add(effective);

    for (let offset = 0; offset < length; offset += 1) {
      assignments.push(
        effective === null ? detached : { supersetKey: effective, supersetOrder: offset },
      );
    }
    index = end + 1;
  }

  return assignments;
}
