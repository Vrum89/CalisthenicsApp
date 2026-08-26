/**
 * La bozza di allenamento: lo stato di cio' che si sta registrando, prima che
 * diventi righe nel database.
 *
 * E' un tipo separato da `Workout`/`WorkoutExercise` di proposito. Una bozza ha
 * serie ancora da spuntare, campi vuoti e un ordine che cambia mentre ci si
 * allena; il dominio salvato non ha niente di tutto questo. Tenere insieme i due
 * avrebbe voluto dire riempire il modello salvato di campi che valgono solo
 * durante l'esecuzione — lo stesso errore del prototipo, che mescolava dati e
 * presentazione.
 *
 * Tutte le funzioni qui sono pure e restituiscono una bozza nuova: React vede
 * un oggetto diverso e ridisegna, e un `undo` resta possibile in futuro.
 */

import { deriveMetricValue, metricConfig } from '@/domain/metrics';
import { describeScheme, parseScheme } from '@/domain/scheme';
import type { Exercise, MetricType, WorkoutExercise, WorkoutType } from '@/domain/types';

export interface DraftSet {
  /** Ripetizioni previste finche' la serie non e' spuntata, svolte dopo. */
  readonly reps: number;
  readonly done: boolean;
}

export interface DraftEntry {
  readonly id: string;
  readonly exerciseId: string;
  /** Copiato dal catalogo: la bozza deve restare leggibile da sola. */
  readonly name: string;
  readonly metricType: MetricType;
  /** Durata della finestra a tempo dell'esercizio; `null` = default della metrica. */
  readonly windowSeconds: number | null;
  readonly scheme: string;
  readonly sets: readonly DraftSet[];
  /** Metriche a numero singolo: `reps`, `minutes`, `time` (secondi). */
  readonly value: number | null;
  readonly addedWeightKg: number | null;
  readonly variant: string;
  readonly notes: string;
  /**
   * Voci con la stessa chiave sono un superset (spec §5.6): esercizi distinti —
   * catalogo, serie e linea in dashboard separati — legati solo dall'essere
   * eseguiti a round alternati, col riposo dopo l'ultimo del round.
   *
   * `null` = esercizio a se'. E' un raggruppamento leggero: due colonne
   * nullable, nessuna tabella nuova.
   */
  readonly supersetKey: string | null;
}

export interface WorkoutDraft {
  readonly workoutDate: string;
  readonly workoutType: WorkoutType;
  readonly notes: string;
  readonly entries: readonly DraftEntry[];
}

const DEFAULT_OPEN_REPS = 8;

export function createDraft(workoutDate: string): WorkoutDraft {
  return { workoutDate, workoutType: 'freestyle', notes: '', entries: [] };
}

/** Id locale della voce: serve solo a React finche' la bozza non e' salvata. */
function localId(): string {
  return crypto.randomUUID();
}

/**
 * Le serie che uno scheme `NxM` prescrive, tutte da fare.
 * Fuori dallo scheme fisso si parte da una serie sola e si aggiungono a mano
 * (modalita' aperta, spec §5.6).
 */
export function setsFromScheme(scheme: string, fallbackReps: number): DraftSet[] {
  const parsed = parseScheme(scheme);
  if (!parsed) return [{ reps: fallbackReps, done: false }];
  return Array.from({ length: parsed.sets }, () => ({ reps: parsed.reps, done: false }));
}

/**
 * Precompilazione "batti l'ultima" (spec §5).
 *
 * Deviazione consapevole: si precompila il *piano* (scheme, zavorra,
 * condizione), non il *risultato*. Per una metrica a numero singolo scrivere in
 * partenza il valore dell'ultima volta significherebbe che dimenticarsi di
 * toccarlo salva un risultato mai ottenuto — e per un massimale sarebbe un
 * record falso. Il valore precedente resta visibile accanto al campo come
 * riferimento, che e' quello che serve davvero per batterlo.
 */
export function draftEntryFor(exercise: Exercise, last: WorkoutExercise | null): DraftEntry {
  const scheme = last?.scheme ?? '';

  /**
   * In modalita' aperta lo scheme non dice quante serie erano: `progressive` non
   * e' un piano, e' un'etichetta. Il piano da ripetere sono le ripetizioni
   * dell'ultima volta — una piramide 1→8 ricompare come otto caselle da
   * spuntare, non come una casella da 1 che sembra un campo vuoto.
   */
  const previous = last?.repsPerSet ?? null;
  const sets: DraftSet[] =
    parseScheme(scheme) === null && previous !== null && previous.length > 0
      ? previous.map((reps) => ({ reps, done: false }))
      : setsFromScheme(scheme, previous?.[0] ?? DEFAULT_OPEN_REPS);

  return {
    id: localId(),
    exerciseId: exercise.id,
    name: exercise.name,
    metricType: exercise.metricType,
    windowSeconds: exercise.windowSeconds,
    scheme,
    sets: metricConfig(exercise.metricType).inputKind === 'set-checkboxes' ? sets : [],
    value: null,
    addedWeightKg: last?.addedWeightKg ?? null,
    variant: last?.variant ?? '',
    notes: '',
    supersetKey: null,
  };
}

// --- Superset ---------------------------------------------------------------

/**
 * Un gruppo di voci in focus: un esercizio solo, oppure un superset.
 *
 * La navigazione della schermata di logging va per gruppi, non per voci: un
 * superset si esegue alternando i suoi esercizi, quindi mostrarli uno per volta
 * costringerebbe ad andare avanti e indietro a ogni round.
 */
export interface DraftGroup {
  /** `null` per un esercizio singolo. */
  readonly supersetKey: string | null;
  readonly entries: readonly DraftEntry[];
}

/** Raggruppa mantenendo l'ordine: un gruppo sta dove sta la sua prima voce. */
export function groupEntries(entries: readonly DraftEntry[]): DraftGroup[] {
  const groups: DraftGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const entry of entries) {
    if (entry.supersetKey === null) {
      groups.push({ supersetKey: null, entries: [entry] });
      continue;
    }

    const existing = indexByKey.get(entry.supersetKey);
    if (existing === undefined) {
      indexByKey.set(entry.supersetKey, groups.length);
      groups.push({ supersetKey: entry.supersetKey, entries: [entry] });
    } else {
      const group = groups[existing];
      if (group) groups[existing] = { ...group, entries: [...group.entries, entry] };
    }
  }

  return groups;
}

/**
 * Il numero di round di un superset: quante volte si gira il giro.
 *
 * E' il massimo fra le serie dei suoi esercizi, non la somma: "5 pull + 10
 * piegamenti x5" sono 5 round da due esercizi, cioe' 10 serie in tutto.
 */
export function roundCount(group: DraftGroup): number {
  return group.entries.reduce((most, entry) => Math.max(most, entry.sets.length), 0);
}

/** Il round in corso: il primo in cui qualcosa e' ancora da fare. */
export function currentRound(group: DraftGroup): number {
  const rounds = roundCount(group);
  for (let round = 0; round < rounds; round += 1) {
    if (group.entries.some((entry) => !entry.sets[round]?.done)) return round;
  }
  return Math.max(0, rounds - 1);
}

/** True quando ogni esercizio del gruppo ha concluso questo round. */
export function roundComplete(group: DraftGroup, round: number): boolean {
  return group.entries.every((entry) => entry.sets[round]?.done === true);
}

/**
 * Porta tutte le voci del gruppo allo stesso numero di serie.
 *
 * Un superset e' fatto di round: se un esercizio ha 5 serie e l'altro 3, il
 * quarto round sarebbe mezzo vuoto. Le serie mancanti si aggiungono ricalcando
 * l'ultima, che e' quello che si sta facendo di fatto.
 */
export function alignRounds(entries: readonly DraftEntry[]): DraftEntry[] {
  const rounds = entries.reduce((most, entry) => Math.max(most, entry.sets.length), 0);

  return entries.map((entry) => {
    if (entry.sets.length >= rounds) return entry;
    const last = entry.sets.at(-1);
    return {
      ...entry,
      sets: [
        ...entry.sets,
        ...Array.from({ length: rounds - entry.sets.length }, () => ({
          reps: last?.reps ?? DEFAULT_OPEN_REPS,
          done: false,
        })),
      ],
    };
  });
}

/**
 * Il totale previsto di una voce: la somma di TUTTE le serie, fatte o no.
 *
 * Diverso da `entryValue`, che conta solo quelle spuntate perche' e' il dato che
 * finisce nel database. Questo serve al titolo del circuito, che deve dire cosa
 * si sta per fare e non cambiare a ogni casella spuntata.
 */
export function plannedTotal(entry: DraftEntry): number {
  return entry.sets.reduce((total, set) => total + set.reps, 0);
}

/** Aggiunge un round a tutti gli esercizi del gruppo, ricalcando l'ultimo. */
export function addRound(entries: readonly DraftEntry[]): DraftEntry[] {
  return entries.map((entry) => {
    const last = entry.sets.at(-1);
    return {
      ...entry,
      sets: [...entry.sets, { reps: last?.reps ?? DEFAULT_OPEN_REPS, done: false }],
    };
  });
}

/**
 * Toglie l'ultimo round a tutti gli esercizi del gruppo.
 *
 * Serve dopo un aggancio: allineare al massimo e' la scelta prudente, ma se gli
 * esercizi avevano cinque e otto serie i tre round in piu' vanno tolti a mano —
 * ed e' comunque piu' facile togliere che riscrivere uno scheme.
 */
export function removeRound(entries: readonly DraftEntry[]): DraftEntry[] {
  return entries.map((entry) =>
    entry.sets.length <= 1 ? entry : { ...entry, sets: entry.sets.slice(0, -1) },
  );
}

export function newSupersetKey(): string {
  return crypto.randomUUID();
}

// --- Modifiche alle serie ---------------------------------------------------

function withSets(entry: DraftEntry, sets: readonly DraftSet[]): DraftEntry {
  return { ...entry, sets };
}

function mapSet(
  entry: DraftEntry,
  index: number,
  change: (set: DraftSet) => DraftSet,
): DraftEntry {
  return withSets(
    entry,
    entry.sets.map((set, position) => (position === index ? change(set) : set)),
  );
}

export function toggleSet(entry: DraftEntry, index: number): DraftEntry {
  return mapSet(entry, index, (set) => ({ ...set, done: !set.done }));
}

export function setReps(entry: DraftEntry, index: number, reps: number): DraftEntry {
  return mapSet(entry, index, (set) => ({ ...set, reps: Math.max(0, reps) }));
}

/** Aggiunge una serie ricalcata sull'ultima: in piramide si parte da li'. */
export function addSet(entry: DraftEntry): DraftEntry {
  const last = entry.sets.at(-1);
  return withSets(entry, [...entry.sets, { reps: last?.reps ?? DEFAULT_OPEN_REPS, done: false }]);
}

export function removeSet(entry: DraftEntry, index: number): DraftEntry {
  return withSets(
    entry,
    entry.sets.filter((_, position) => position !== index),
  );
}

/**
 * Cambio di scheme a mano. Alzare `5x6` a `5x8` cambia le ripetizioni previste,
 * ma non tocca le serie gia' spuntate: quelle sono un fatto, non un piano.
 */
export function applyScheme(entry: DraftEntry, scheme: string): DraftEntry {
  const parsed = parseScheme(scheme);
  if (!parsed) return { ...entry, scheme };

  const kept = entry.sets.filter((set) => set.done);
  const remaining = Math.max(0, parsed.sets - kept.length);
  return {
    ...entry,
    scheme,
    sets: [
      ...kept,
      ...Array.from({ length: remaining }, () => ({ reps: parsed.reps, done: false })),
    ],
  };
}

// --- Lettura ----------------------------------------------------------------

/** Solo le serie spuntate: quelle previste e non fatte non sono un risultato. */
export function doneReps(entry: DraftEntry): number[] {
  return entry.sets.filter((set) => set.done).map((set) => set.reps);
}

/**
 * Il valore della metrica, come lo leggeranno le dashboard. Per `sets` lo deriva
 * il registro metriche (somma), non un `reduce` scritto qui.
 */
export function entryValue(entry: DraftEntry): number | null {
  if (metricConfig(entry.metricType).inputKind !== 'set-checkboxes') return entry.value;
  const reps = doneReps(entry);
  return reps.length === 0 ? null : deriveMetricValue(entry.metricType, reps);
}

/**
 * Lo scheme da salvare.
 *
 * Quello scritto a mano vince sempre, `5x6` o `piramide` che sia: e' una parola
 * dell'utente sul proprio allenamento, e riscriverla in `progressive` perche'
 * non corrisponde a `NxM` sarebbe come tradurgli le note. In modalita' fissa
 * resta comunque il piano (`5x6` anche se una serie e' andata a 4: la dashboard
 * mostra il piano, `repsPerSet` il dettaglio).
 *
 * `describeScheme` interviene solo quando il campo e' vuoto: li' non c'e' niente
 * da rispettare, e leggere `3x5` da tre serie da cinque e' meglio del nulla.
 */
export function entryScheme(entry: DraftEntry): string | null {
  if (metricConfig(entry.metricType).inputKind !== 'set-checkboxes') return null;
  const written = entry.scheme.trim();
  if (written.length > 0) return written;
  return describeScheme(doneReps(entry));
}

/** Una voce senza valore e senza note non e' successa: non va salvata. */
export function isEntryFilled(entry: DraftEntry): boolean {
  return entryValue(entry) !== null || entry.notes.trim().length > 0;
}

export function filledEntries(draft: WorkoutDraft): DraftEntry[] {
  return draft.entries.filter(isEntryFilled);
}
