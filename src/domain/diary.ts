/**
 * Il diario: gli allenamenti registrati, per data.
 *
 * E' l'altra lettura dello stesso storico. Le dashboard (§6) tagliano i dati
 * per esercizio e rispondono a "come sto andando nelle trazioni"; qui il taglio
 * e' per sessione e la domanda e' "cosa ho fatto martedi'". Nessuna delle due
 * sostituisce l'altra, e nessuna delle due ha bisogno di dati in piu': lo
 * storico e' gia' tutto in memoria (poche centinaia di righe).
 *
 * Qui dentro non si calcola niente — niente record, niente trend: quelli stanno
 * in `stats.ts` e valgono per esercizio. Questo modulo raggruppa e ordina.
 */

import { groupBySuperset } from '@/domain/superset';
import type { Exercise, MetricType, Workout, WorkoutExercise } from '@/domain/types';

/** Una voce dell'allenamento, col nome e la metrica gia' risolti dal catalogo. */
export interface DiaryItem {
  readonly entry: WorkoutExercise;
  readonly name: string;
  readonly metricType: MetricType;
}

/** Un esercizio da solo, oppure un superset: stessa forma, come nel logging. */
export interface DiaryGroup {
  readonly supersetKey: string | null;
  readonly items: readonly DiaryItem[];
}

export interface DiarySession {
  readonly workout: Workout;
  readonly groups: readonly DiaryGroup[];
}

/**
 * Ordine cronologico completo di una sessione.
 *
 * La sola data pareggerebbe due allenamenti dello stesso giorno — capita: la
 * mattina e la sera — e l'ordine tornerebbe casuale. `createdAt` scioglie il
 * pareggio, ed e' lo stesso criterio usato per "l'ultima performance".
 */
function sessionKey(workout: Workout): string {
  return `${workout.workoutDate}|${workout.createdAt}`;
}

/**
 * Gli allenamenti dal piu' recente al piu' vecchio, con dentro le loro voci
 * nell'ordine in cui sono state eseguite.
 *
 * Le voci orfane — di un allenamento che non c'e' — vengono lasciate fuori
 * invece di finire in un gruppo "senza data": sarebbero un dato rotto mostrato
 * come se fosse un allenamento.
 */
export function buildDiary(
  workouts: readonly Workout[],
  entries: readonly WorkoutExercise[],
  exercisesById: ReadonlyMap<string, Exercise>,
): DiarySession[] {
  const byWorkout = new Map<string, WorkoutExercise[]>();
  for (const entry of entries) {
    byWorkout.set(entry.workoutId, [...(byWorkout.get(entry.workoutId) ?? []), entry]);
  }

  return [...workouts]
    .sort((a, b) => sessionKey(b).localeCompare(sessionKey(a)))
    .map((workout) => {
      const items = [...(byWorkout.get(workout.id) ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => {
          const exercise = exercisesById.get(entry.exerciseId);
          return {
            entry,
            // Un esercizio cancellato dal catalogo lascia comunque la sua
            // riga nello storico: meglio un id di un buco nel diario.
            name: exercise?.name ?? entry.exerciseId,
            metricType: exercise?.metricType ?? 'note',
          };
        });

      return {
        workout,
        groups: groupBySuperset(items, (item) => item.entry).map(({ supersetKey, members }) => ({
          supersetKey,
          items: members,
        })),
      };
    });
}

/** Le sessioni di un allenamento vuoto non si mostrano: non e' successo niente. */
export function nonEmptySessions(sessions: readonly DiarySession[]): DiarySession[] {
  return sessions.filter((session) => session.groups.length > 0);
}

/**
 * La sessione da mostrare saltando a una data: quella del giorno scelto, o la
 * prima precedente.
 *
 * "O la prima precedente" perche' il calendario lascia scegliere qualunque
 * giorno, e nella maggior parte dei giorni non ci si allena: atterrare
 * sull'allenamento piu' vicino e' meglio che rispondere "non c'e' niente".
 */
export function sessionNearest(
  sessions: readonly DiarySession[],
  iso: string,
): DiarySession | null {
  return sessions.find((session) => session.workout.workoutDate <= iso) ?? sessions.at(-1) ?? null;
}
