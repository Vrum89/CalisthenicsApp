/**
 * The diary: logged workouts, by date.
 *
 * This is the other way of reading the same history. The dashboards (spec §6)
 * slice by exercise and answer "how are my pull-ups going"; here the slice is
 * by session and the question is "what did I do on Tuesday". Neither replaces
 * the other, and neither needs extra data: the whole history is already in
 * memory (a few hundred rows).
 *
 * Nothing is computed here — no records, no trends: those live in `stats.ts`
 * and are per exercise. This module groups and orders, that is all.
 */

import { groupBySuperset } from '@/domain/superset';
import type { Exercise, MetricType, Workout, WorkoutExercise } from '@/domain/types';

/** One logged exercise, with name and metric already resolved from the catalogue. */
export interface DiaryItem {
  readonly entry: WorkoutExercise;
  readonly name: string;
  readonly metricType: MetricType;
}

/** A lone exercise, or a superset: same shape as during logging. */
export interface DiaryGroup {
  readonly supersetKey: string | null;
  readonly items: readonly DiaryItem[];
}

export interface DiarySession {
  readonly workout: Workout;
  readonly groups: readonly DiaryGroup[];
}

/**
 * Full chronological key for a session.
 *
 * The date alone would tie two workouts on the same day — which happens:
 * morning and evening — and the order would turn arbitrary. `createdAt` breaks
 * the tie, the same way "last performance" resolves it.
 */
function sessionKey(workout: Workout): string {
  return `${workout.workoutDate}|${workout.createdAt}`;
}

/**
 * Workouts from the most recent to the oldest, each holding its entries in the
 * order they were performed.
 *
 * Orphan entries — belonging to a workout that is not there — are left out
 * rather than collected under a "no date" heading: they would be broken data
 * shown as if it were a workout.
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
            // An exercise deleted from the catalogue still leaves its rows in
            // the history: an id reads better than a hole in the diary.
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

/** Empty workouts are not shown: nothing happened there. */
export function nonEmptySessions(sessions: readonly DiarySession[]): DiarySession[] {
  return sessions.filter((session) => session.groups.length > 0);
}

/**
 * The session to show when jumping to a date: the one logged that day, or the
 * closest one before it.
 *
 * "Or the closest one before" because the calendar lets you pick any day, and
 * on most days you don't train: landing on the nearest workout beats answering
 * "nothing here".
 */
export function sessionNearest(
  sessions: readonly DiarySession[],
  iso: string,
): DiarySession | null {
  return sessions.find((session) => session.workout.workoutDate <= iso) ?? sessions.at(-1) ?? null;
}
