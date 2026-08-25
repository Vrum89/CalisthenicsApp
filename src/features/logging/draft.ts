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
  readonly scheme: string;
  readonly sets: readonly DraftSet[];
  /** Metriche a numero singolo: `reps`, `minutes`, `time` (secondi). */
  readonly value: number | null;
  readonly addedWeightKg: number | null;
  readonly variant: string;
  readonly notes: string;
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
  const lastReps = last?.repsPerSet?.[0] ?? DEFAULT_OPEN_REPS;

  return {
    id: localId(),
    exerciseId: exercise.id,
    name: exercise.name,
    metricType: exercise.metricType,
    scheme,
    sets:
      metricConfig(exercise.metricType).inputKind === 'set-checkboxes'
        ? setsFromScheme(scheme, lastReps)
        : [],
    value: null,
    addedWeightKg: last?.addedWeightKg ?? null,
    variant: last?.variant ?? '',
    notes: '',
  };
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
 * Lo scheme da salvare. In modalita' fissa e' il piano (`5x6` resta `5x6` anche
 * se una serie e' andata a 4: la dashboard mostra il piano, `repsPerSet` il
 * dettaglio); in modalita' aperta lo si descrive da cio' che si e' fatto.
 */
export function entryScheme(entry: DraftEntry): string | null {
  if (metricConfig(entry.metricType).inputKind !== 'set-checkboxes') return null;
  if (parseScheme(entry.scheme)) return entry.scheme;
  return describeScheme(doneReps(entry));
}

/** Una voce senza valore e senza note non e' successa: non va salvata. */
export function isEntryFilled(entry: DraftEntry): boolean {
  return entryValue(entry) !== null || entry.notes.trim().length > 0;
}

export function filledEntries(draft: WorkoutDraft): DraftEntry[] {
  return draft.entries.filter(isEntryFilled);
}
