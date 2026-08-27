import type { Program, ProgramDay, ProgramExercise } from '@/domain/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import {
  fromProgram,
  fromProgramDay,
  fromProgramExercise,
  toProgram,
  toProgramDay,
  toProgramExercise,
  type NewProgram,
  type NewProgramDay,
  type NewProgramExercise,
} from '@/lib/supabase/mappers';

/**
 * Le schede (spec §3.1: `program`).
 *
 * Una scheda e' un TEMPLATE, non un allenamento: dice cosa si prevede di fare,
 * e resta ferma mentre gli allenamenti che ne nascono la superano. E' la
 * distinzione centrale del progetto (CLAUDE.md: "Program = template, Workout =
 * istanza") ed e' il motivo per cui modificare una scheda non tocca nulla di
 * cio' che si e' gia' registrato.
 */

export interface ProgramDayWithExercises {
  readonly day: ProgramDay;
  readonly exercises: readonly ProgramExercise[];
}

export interface ProgramDetail {
  readonly program: Program;
  readonly days: readonly ProgramDayWithExercises[];
}

export const EMPTY_PROGRAMS: ProgramDetail[] = [];

/**
 * Tutte le schede con giorni ed esercizi, in una lettura sola.
 *
 * Tre query invece di una join perche' PostgREST restituirebbe righe duplicate
 * da appiattire a mano; qui i volumi sono minuscoli — una manciata di schede —
 * e comporre in memoria costa meno del codice per disfare la join.
 */
export async function loadPrograms(): Promise<ProgramDetail[]> {
  const supabase = getSupabaseClient();

  const [programs, days, exercises] = await Promise.all([
    supabase.from('programs').select('*').order('start_date', { ascending: false }),
    supabase.from('program_days').select('*').order('sort_order', { ascending: true }),
    supabase.from('program_exercises').select('*').order('sort_order', { ascending: true }),
  ]);

  if (programs.error) throw toAppError(programs.error, 'error.programs.load');
  if (days.error) throw toAppError(days.error, 'error.programs.load');
  if (exercises.error) throw toAppError(exercises.error, 'error.programs.load');

  const slotsByDay = new Map<string, ProgramExercise[]>();
  for (const row of exercises.data.map(toProgramExercise)) {
    slotsByDay.set(row.programDayId, [...(slotsByDay.get(row.programDayId) ?? []), row]);
  }

  const daysByProgram = new Map<string, ProgramDayWithExercises[]>();
  for (const day of days.data.map(toProgramDay)) {
    const entry = { day, exercises: slotsByDay.get(day.id) ?? [] };
    daysByProgram.set(day.programId, [...(daysByProgram.get(day.programId) ?? []), entry]);
  }

  return programs.data.map(toProgram).map((program) => ({
    program,
    days: daysByProgram.get(program.id) ?? [],
  }));
}

export async function createProgram(program: NewProgram): Promise<Program> {
  const { data, error } = await getSupabaseClient()
    .from('programs')
    .insert(fromProgram(program))
    .select()
    .single();

  if (error) throw toAppError(error, 'error.programs.save');
  return toProgram(data);
}

export async function updateProgram(
  id: string,
  changes: { name?: string; startDate?: string; endDate?: string | null },
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('programs')
    .update({
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.startDate === undefined ? {} : { start_date: changes.startDate }),
      ...(changes.endDate === undefined ? {} : { end_date: changes.endDate }),
    })
    .eq('id', id);

  if (error) throw toAppError(error, 'error.programs.save');
}

/**
 * Elimina una scheda. Il database la blocca se qualche allenamento punta a un
 * suo giorno (spec §3.3: `workouts.program_day_id` senza cascade) — ed e'
 * giusto: cancellare una scheda usata vorrebbe dire perdere il collegamento
 * degli allenamenti che ne sono nati. Una scheda finita si CHIUDE (`endDate`),
 * non si cancella.
 */
export async function deleteProgram(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('programs').delete().eq('id', id);
  if (error) throw toAppError(error, 'error.programs.delete');
}

export async function createDay(day: NewProgramDay): Promise<ProgramDay> {
  const { data, error } = await getSupabaseClient()
    .from('program_days')
    .insert(fromProgramDay(day))
    .select()
    .single();

  if (error) throw toAppError(error, 'error.programs.save');
  return toProgramDay(data);
}

export async function renameDay(id: string, name: string): Promise<void> {
  const { error } = await getSupabaseClient().from('program_days').update({ name }).eq('id', id);
  if (error) throw toAppError(error, 'error.programs.save');
}

export async function deleteDay(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('program_days').delete().eq('id', id);
  if (error) throw toAppError(error, 'error.programs.delete');
}

export async function addProgramExercise(slot: NewProgramExercise): Promise<ProgramExercise> {
  const { data, error } = await getSupabaseClient()
    .from('program_exercises')
    .insert(fromProgramExercise(slot))
    .select()
    .single();

  if (error) throw toAppError(error, 'error.programs.save');
  return toProgramExercise(data);
}

export async function updateProgramExercise(
  id: string,
  changes: {
    defaultScheme?: string | null;
    defaultWeightKg?: number | null;
    sortOrder?: number;
    supersetKey?: string | null;
    supersetOrder?: number | null;
  },
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('program_exercises')
    .update({
      ...(changes.defaultScheme === undefined ? {} : { default_scheme: changes.defaultScheme }),
      ...(changes.defaultWeightKg === undefined
        ? {}
        : { default_weight_kg: changes.defaultWeightKg }),
      ...(changes.sortOrder === undefined ? {} : { sort_order: changes.sortOrder }),
      ...(changes.supersetKey === undefined ? {} : { superset_key: changes.supersetKey }),
      ...(changes.supersetOrder === undefined ? {} : { superset_order: changes.supersetOrder }),
    })
    .eq('id', id);

  if (error) throw toAppError(error, 'error.programs.save');
}

export async function deleteProgramExercise(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('program_exercises').delete().eq('id', id);
  if (error) throw toAppError(error, 'error.programs.delete');
}
