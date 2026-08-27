import type { Workout } from '@/domain/types';
import type { ProgramDayWithExercises, ProgramDetail } from '@/features/programs/programsRepository';

/**
 * Quale giorno proporre oggi (spec §5.1).
 *
 * Una proposta, non una regola: si puo' sempre scegliere l'altro giorno,
 * ripescare una scheda chiusa, o registrare un allenamento libero. Serve solo a
 * risparmiare la domanda "tocca ad A o a B?" quando la risposta e' ovvia.
 */

/** Schede in corso: senza fine, o con una fine non ancora arrivata. */
export function activePrograms(programs: readonly ProgramDetail[], today: string): ProgramDetail[] {
  return programs.filter(
    ({ program }) =>
      program.startDate <= today && (program.endDate === null || program.endDate >= today),
  );
}

/**
 * Il giorno successivo a quello usato l'ultima volta, a giro (A→B→A).
 *
 * Se di quella scheda non e' ancora stato registrato niente, si parte dal primo.
 * Se il giorno usato l'ultima volta non esiste piu' — cancellato dalla scheda —
 * si riparte dal primo invece di non proporre nulla.
 */
export function suggestDay(
  program: ProgramDetail,
  workouts: readonly Workout[],
): ProgramDayWithExercises | null {
  const days = program.days;
  if (days.length === 0) return null;

  const ids = new Set(days.map((entry) => entry.day.id));
  const last = [...workouts]
    .filter(
      (workout) =>
        workout.workoutType === 'from_program' &&
        workout.programDayId !== null &&
        ids.has(workout.programDayId),
    )
    // Ordine cronologico completo: due allenamenti dello stesso giorno
    // pareggerebbero sulla sola data, e "l'ultimo" tornerebbe casuale.
    .sort((a, b) =>
      `${a.workoutDate}|${a.createdAt}`.localeCompare(`${b.workoutDate}|${b.createdAt}`),
    )
    .at(-1);

  if (!last) return days[0] ?? null;

  const index = days.findIndex((entry) => entry.day.id === last.programDayId);
  if (index === -1) return days[0] ?? null;
  return days[(index + 1) % days.length] ?? null;
}
