/**
 * Migrazione dei dati storici (spec §8) — generatore.
 *
 * Legge l'array `ROWS` del vecchio prototipo e il seed di luglio/agosto, e
 * produce `supabase/migration-history.sql`.
 *
 * Perche' genera SQL invece di scrivere su Supabase via REST, come dice §8:
 *
 *   1. Scrivere via REST avrebbe richiesto la chiave `service_role` su questa
 *      macchina. Un file SQL non porta con se' nessun segreto.
 *   2. Il file si legge prima di eseguirlo. Su 200 righe di storico normalizzate
 *      a mano, poter rileggere cosa verra' scritto vale piu' della comodita'.
 *   3. Si prova su un Postgres locale prima di toccare il database vero.
 *
 * Lo script resta quello che lo spec chiede: TypeScript, one-off, legge `ROWS`.
 * Cambia solo il modo in cui consegna il risultato.
 *
 * Uso:  npm run migrate:generate
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { deriveMetricValue } from '@/domain/metrics';
import type { MetricType, WorkoutType } from '@/domain/types';
import {
  CATALOG,
  DEFAULT_SUPERSET,
  NAME_MAP,
  SUPERSET_BY_REST,
  SUPERSET_SOURCE_NAME,
  type SupersetPlan,
} from './catalog-mapping.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PROTOTYPE = join(ROOT, 'docs/reference/diario-allenamenti.jsx');
const SEED = join(ROOT, 'seed/seed-workouts-jul-aug-2026.json');
const OUTPUT = join(ROOT, 'supabase/migration-history.sql');

// --- lettura delle sorgenti -------------------------------------------------

interface ProtoRow {
  d: string;
  ex: string;
  sc?: string;
  v?: number | null;
  kg?: number;
  va?: string;
  no?: string;
  fl?: number;
  od?: string;
}

/**
 * `ROWS` e' un letterale JavaScript, non JSON: chiavi senza virgolette e
 * virgole finali. Invece di scrivere un parser fragile, si valuta il letterale.
 * La sorgente e' un file versionato in questo repo, non un input esterno.
 */
function readPrototypeRows(): ProtoRow[] {
  const source = readFileSync(PROTOTYPE, 'utf8');
  const start = source.indexOf('const ROWS = [');
  const end = source.indexOf('];', start);
  if (start === -1 || end === -1) {
    throw new Error('Array ROWS non trovato nel prototipo.');
  }
  const literal = source.slice(start + 'const ROWS = '.length, end + 1);
  return JSON.parse(
    JSON.stringify(new Function(`return ${literal};`)() as ProtoRow[]),
  ) as ProtoRow[];
}

interface SeedExercise {
  exerciseName: string;
  scheme?: string;
  repsPerSet?: number[];
  metricValue?: number;
  addedWeightKg?: number;
  variant?: string;
  notes?: string;
  supersetKey?: string;
  supersetOrder?: number;
}

interface SeedWorkout {
  date: string;
  type: WorkoutType;
  exercises: SeedExercise[];
}

function readSeed(): SeedWorkout[] {
  const parsed = JSON.parse(readFileSync(SEED, 'utf8')) as { workouts: SeedWorkout[] };
  return parsed.workouts;
}

// --- identificatori deterministici ------------------------------------------

/**
 * UUID v5 su un namespace fisso: lo stesso allenamento produce sempre lo stesso
 * id. E' cio' che rende il file rieseguibile — `on conflict (id) do nothing`
 * riconosce le righe gia' inserite invece di duplicarle.
 */
const NAMESPACE = 'a4f1c0de-7b3e-5a2d-9c81-6e0f4b2a1d37';

function uuidV5(name: string): string {
  const hex = NAMESPACE.replace(/-/g, '');
  const namespaceBytes = Buffer.from(hex, 'hex');
  const hash = createHash('sha1').update(namespaceBytes).update(Buffer.from(name, 'utf8')).digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50; // versione 5
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante RFC 4122

  const out = bytes.toString('hex');
  return [
    out.slice(0, 8),
    out.slice(8, 12),
    out.slice(12, 16),
    out.slice(16, 20),
    out.slice(20, 32),
  ].join('-');
}

// --- modello intermedio ------------------------------------------------------

interface Entry {
  id: string;
  exerciseName: string;
  sortOrder: number;
  scheme: string | null;
  repsPerSet: number[] | null;
  metricValue: number | null;
  addedWeightKg: number | null;
  variant: string | null;
  notes: string | null;
  supersetKey: string | null;
  supersetOrder: number | null;
}

interface WorkoutDraft {
  id: string;
  date: string;
  workoutType: WorkoutType;
  originalDate: string | null;
  notes: string | null;
  entries: Entry[];
}

const warnings: string[] = [];
const metricByName = new Map<string, MetricType>(
  CATALOG.map((entry) => [entry.name, entry.metricType]),
);

function canonical(rawName: string): { name: string; variant: string | null } {
  const mapping = NAME_MAP[rawName];
  if (mapping) {
    if (!metricByName.has(mapping.to)) {
      throw new Error(`Il catalogo non contiene "${mapping.to}" (da "${rawName}").`);
    }
    return { name: mapping.to, variant: mapping.variant ?? null };
  }

  // Il seed di luglio/agosto usa gia' i nomi canonici: non serve mapparli.
  if (metricByName.has(rawName)) return { name: rawName, variant: null };

  throw new Error(`Nome senza corrispondenza nel catalogo: "${rawName}".`);
}

/** "5x6" → [6,6,6,6,6]. Qualsiasi altra forma non e' derivabile (spec §5.6). */
function repsFromScheme(scheme: string | undefined): number[] | null {
  if (!scheme) return null;
  const match = /^(\d+)\s*x\s*(\d+)$/i.exec(scheme.trim());
  if (!match) return null;
  const sets = Number(match[1]);
  const reps = Number(match[2]);
  return Array.from({ length: sets }, () => reps);
}

interface ResolvedSuperset {
  readonly plan: SupersetPlan;
  /** Come si e' arrivati a questa composizione, da scrivere nelle note. */
  readonly source: 'declared' | 'rest' | 'default';
  readonly rest: string | null;
}

/**
 * Composizione del superset: se il diario nomina gli esercizi si usano quelli,
 * altrimenti la si deduce dal riposo annotato (vedi catalog-mapping.ts).
 */
function resolveSuperset(note: string | null): ResolvedSuperset {
  const rest = note ? (/riposo\s+(\d+:\d{2})/i.exec(note)?.[1] ?? null) : null;
  const plan = rest === null ? undefined : SUPERSET_BY_REST[rest];

  const declared =
    note !== null && /\bdip\b/i.test(note)
      ? SUPERSET_BY_REST['1:30']
      : note !== null && /piegamenti/i.test(note)
        ? SUPERSET_BY_REST['2:00']
        : undefined;

  if (declared) return { plan: declared, source: 'declared', rest };
  if (plan) return { plan, source: 'rest', rest };
  return { plan: DEFAULT_SUPERSET, source: 'default', rest };
}

// --- costruzione degli allenamenti storici ----------------------------------

function buildFromPrototype(rows: readonly ProtoRow[]): WorkoutDraft[] {
  const byDate = new Map<string, ProtoRow[]>();
  for (const row of rows) {
    const bucket = byDate.get(row.d);
    if (bucket) bucket.push(row);
    else byDate.set(row.d, [row]);
  }

  const drafts: WorkoutDraft[] = [];

  for (const [date, dayRows] of byDate) {
    // Inferenza del tipo (spec §8): una data con massimali e' un test.
    const workoutType: WorkoutType = dayRows.some((row) => row.ex.startsWith('Massimale:'))
      ? 'test'
      : 'freestyle';

    const originalDate = dayRows.find((row) => row.od !== undefined)?.od ?? null;
    const workoutId = uuidV5(`workout:${date}`);
    const entries: Entry[] = [];

    for (const row of dayRows) {
      const noteParts: string[] = [];
      if (row.no) noteParts.push(row.no);
      if (row.fl === 1 && !row.no) {
        noteParts.push('Voce segnalata come anomala nel diario originale.');
      }
      const notes = noteParts.length > 0 ? noteParts.join(' · ') : null;

      if (row.ex === SUPERSET_SOURCE_NAME) {
        // Espansione del superset in due esercizi distinti (spec §8).
        const { plan, source, rest } = resolveSuperset(notes);
        const supersetKey = uuidV5(`superset:${date}`);

        if (source === 'default') {
          warnings.push(
            `${date}: superset senza esercizi ne' riposo annotati, usato il default ` +
              `(${plan.members.map((m) => m.name).join(' + ')}).`,
          );
        }

        const provenance =
          source === 'rest'
            ? `Esercizi non dichiarati nel diario: dedotti dal riposo di ${rest ?? ''}.`
            : source === 'default'
              ? 'Esercizi non dichiarati nel diario: usata la composizione abituale.'
              : null;

        const supersetNote = [notes, provenance]
          .filter((part): part is string => part !== null)
          .join(' · ');

        plan.members.forEach((member, index) => {
          const repsPerSet = Array.from({ length: plan.rounds }, () => member.repsPerRound);
          entries.push({
            id: uuidV5(`we:${date}:${String(entries.length)}`),
            exerciseName: member.name,
            sortOrder: entries.length,
            scheme: `${String(plan.rounds)}x${String(member.repsPerRound)}`,
            repsPerSet,
            metricValue: deriveMetricValue('sets', repsPerSet),
            addedWeightKg: null,
            variant: null,
            notes: supersetNote.length > 0 ? supersetNote : null,
            supersetKey,
            supersetOrder: index,
          });
        });
        continue;
      }

      const { name, variant } = canonical(row.ex);
      const metricType = metricByName.get(name);
      if (!metricType) throw new Error(`Metrica mancante per "${name}".`);

      const repsPerSet = metricType === 'sets' ? repsFromScheme(row.sc) : null;
      const value = row.v ?? null;

      if (repsPerSet && value !== null) {
        const derived = deriveMetricValue('sets', repsPerSet);
        if (derived !== value) {
          // Spec §8: dove il totale storico differisce dallo scheme pieno,
          // vince il dato originale. Le serie restano come riferimento.
          warnings.push(
            `${date} · ${name}: scheme "${row.sc ?? ''}" darebbe ${String(derived)}, ` +
              `il diario dice ${String(value)}. Tenuto ${String(value)}.`,
          );
        }
      }
      if (metricType === 'sets' && row.sc && !repsPerSet) {
        warnings.push(
          `${date} · ${name}: scheme "${row.sc}" non e' nella forma NxM, serie non ricostruite.`,
        );
      }

      entries.push({
        id: uuidV5(`we:${date}:${String(entries.length)}`),
        exerciseName: name,
        sortOrder: entries.length,
        scheme: row.sc ?? null,
        repsPerSet,
        metricValue: value,
        addedWeightKg: row.kg ?? null,
        variant: row.va ?? variant,
        notes,
        supersetKey: null,
        supersetOrder: null,
      });
    }

    drafts.push({ id: workoutId, date, workoutType, originalDate, notes: null, entries });
  }

  return drafts;
}

// --- costruzione degli allenamenti dal seed ---------------------------------

function buildFromSeed(workouts: readonly SeedWorkout[]): WorkoutDraft[] {
  return workouts.map((workout) => {
    const workoutId = uuidV5(`workout:${workout.date}`);
    const entries = workout.exercises.map((exercise, index): Entry => {
      const { name, variant } = canonical(exercise.exerciseName);
      return {
        id: uuidV5(`we:${workout.date}:${String(index)}`),
        exerciseName: name,
        sortOrder: index,
        scheme: exercise.scheme ?? null,
        repsPerSet: exercise.repsPerSet ?? null,
        metricValue: exercise.metricValue ?? null,
        addedWeightKg: exercise.addedWeightKg ?? null,
        variant: exercise.variant ?? variant,
        notes: exercise.notes ?? null,
        // Le chiavi del seed sono stringhe locali ("ss-20260724"): vanno
        // trasformate in uuid stabili, uno per superset.
        supersetKey: exercise.supersetKey ? uuidV5(`superset:${exercise.supersetKey}`) : null,
        supersetOrder: exercise.supersetOrder ?? null,
      };
    });

    return {
      id: workoutId,
      date: workout.date,
      workoutType: workout.type,
      originalDate: null,
      notes: null,
      entries,
    };
  });
}

// --- generazione SQL ---------------------------------------------------------

function quote(value: string | null): string {
  if (value === null) return 'null';
  return `'${value.replace(/'/g, "''")}'`;
}

function numeric(value: number | null): string {
  return value === null ? 'null' : String(value);
}

function intArray(values: number[] | null): string {
  return values === null ? 'null' : `'{${values.join(',')}}'`;
}

function buildSql(drafts: readonly WorkoutDraft[]): string {
  const catalogValues = CATALOG.map(
    (entry) =>
      `    (target_user, ${quote(entry.name)}, ${quote(entry.category)}, ${quote(entry.metricType)})`,
  ).join(',\n');

  const workoutValues = drafts
    .map(
      (draft) =>
        `    (${quote(draft.id)}, target_user, ${quote(draft.date)}, ${quote(draft.workoutType)}, ` +
        `${quote(draft.originalDate)}, ${quote(draft.notes)})`,
    )
    .join(',\n');

  const entryValues = drafts
    .flatMap((draft) =>
      draft.entries.map(
        (entry) =>
          `    (${quote(entry.id)}::uuid, ${quote(draft.id)}::uuid, ${quote(entry.exerciseName)}, ` +
          `${String(entry.sortOrder)}, ${quote(entry.scheme)}, ${intArray(entry.repsPerSet)}::int[], ` +
          `${numeric(entry.metricValue)}::numeric, ${numeric(entry.addedWeightKg)}::numeric, ` +
          `${quote(entry.variant)}, ${quote(entry.notes)}, ` +
          `${entry.supersetKey === null ? 'null' : quote(entry.supersetKey)}::uuid, ` +
          `${entry.supersetOrder === null ? 'null' : String(entry.supersetOrder)}::int)`,
      ),
    )
    .join(',\n');

  const totalEntries = drafts.reduce((sum, draft) => sum + draft.entries.length, 0);

  return `-- =============================================================================
-- Workout Diary — migrazione dei dati storici (spec §8)
--
-- GENERATO da scripts/generate-migration.ts — non modificare a mano:
-- rigenera con \`npm run migrate:generate\`.
--
-- Sorgenti: docs/reference/diario-allenamenti.jsx (array ROWS)
--           seed/seed-workouts-jul-aug-2026.json
--
-- Contiene ${String(drafts.length)} allenamenti e ${String(totalEntries)} voci.
--
-- Da eseguire UNA VOLTA nella dashboard Supabase, dopo supabase/schema.sql:
-- SQL Editor -> New query -> incolla tutto -> Run.
--
-- Rieseguirlo non duplica nulla: ogni riga ha un id deterministico e
-- l'inserimento e' \`on conflict do nothing\`. Non aggiorna pero' le righe gia'
-- presenti: per riapplicare una correzione, cancella prima gli allenamenti
-- interessati.
-- =============================================================================

do $$
declare
  target_user uuid;
begin
  -- Fallisce in modo esplicito se gli utenti non sono esattamente uno.
  -- Con piu' di un utente, sostituire con l'id desiderato.
  select id into strict target_user from auth.users;

  -- ---------------------------------------------------------------------------
  -- 1. Catalogo esercizi (upsert per nome)
  -- ---------------------------------------------------------------------------
  insert into exercises (user_id, name, category, metric_type) values
${catalogValues}
  on conflict (user_id, name) do nothing;

  -- ---------------------------------------------------------------------------
  -- 2. Allenamenti
  -- ---------------------------------------------------------------------------
  insert into workouts (id, user_id, workout_date, workout_type, original_date, notes) values
${workoutValues}
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- 3. Voci degli allenamenti
  --
  -- Gli esercizi si risolvono per nome: gli id li genera il database, quindi
  -- non possono essere scritti qui.
  -- ---------------------------------------------------------------------------
  insert into workout_exercises (
    id, user_id, workout_id, exercise_id, sort_order, scheme, reps_per_set,
    metric_value, added_weight_kg, variant, notes, superset_key, superset_order
  )
  select
    v.id, target_user, v.workout_id, e.id, v.sort_order, v.scheme, v.reps_per_set,
    v.metric_value, v.added_weight_kg, v.variant, v.notes, v.superset_key, v.superset_order
  from (values
${entryValues}
  ) as v(
    id, workout_id, exercise_name, sort_order, scheme, reps_per_set,
    metric_value, added_weight_kg, variant, notes, superset_key, superset_order
  )
  join exercises e on e.user_id = target_user and e.name = v.exercise_name
  on conflict (id) do nothing;
end $$;
`;
}

// --- esecuzione --------------------------------------------------------------

const protoDrafts = buildFromPrototype(readPrototypeRows());
const seedDrafts = buildFromSeed(readSeed());
const drafts = [...protoDrafts, ...seedDrafts].sort((a, b) => a.date.localeCompare(b.date));

const duplicateDates = drafts
  .map((draft) => draft.date)
  .filter((date, index, all) => all.indexOf(date) !== index);
if (duplicateDates.length > 0) {
  throw new Error(`Due allenamenti nella stessa data: ${duplicateDates.join(', ')}.`);
}

writeFileSync(OUTPUT, buildSql(drafts), 'utf8');

// --- rapporto ----------------------------------------------------------------

const entries = drafts.flatMap((draft) => draft.entries);
const byType = new Map<WorkoutType, number>();
for (const draft of drafts) byType.set(draft.workoutType, (byType.get(draft.workoutType) ?? 0) + 1);

const usedNames = new Set(entries.map((entry) => entry.exerciseName));

console.log(`Allenamenti:        ${String(drafts.length)}`);
for (const [type, count] of byType) console.log(`  ${type.padEnd(16)}  ${String(count)}`);
console.log(`Voci:               ${String(entries.length)}`);
console.log(`  senza valore      ${String(entries.filter((e) => e.metricValue === null).length)}`);
console.log(`  con serie         ${String(entries.filter((e) => e.repsPerSet !== null).length)}`);
console.log(`  in superset       ${String(entries.filter((e) => e.supersetKey !== null).length)}`);
console.log(`  con zavorra       ${String(entries.filter((e) => (e.addedWeightKg ?? 0) > 0).length)}`);
console.log(`Esercizi a catalogo: ${String(CATALOG.length)} (${String(usedNames.size)} usati)`);
console.log(`Periodo:            ${drafts[0]?.date ?? '—'} → ${drafts.at(-1)?.date ?? '—'}`);

const unused = CATALOG.filter((entry) => !usedNames.has(entry.name)).map((entry) => entry.name);
if (unused.length > 0) console.log(`Mai usati:          ${unused.join(', ')}`);

if (warnings.length > 0) {
  console.log(`\nDa guardare (${String(warnings.length)}):`);
  for (const warning of warnings) console.log(`  - ${warning}`);
}

console.log(`\nScritto ${OUTPUT}`);
