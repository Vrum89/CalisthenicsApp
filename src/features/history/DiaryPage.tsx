import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarSearch, ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { DatePicker } from '@/components/DatePicker';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { buildDiary, nonEmptySessions, sessionNearest, type DiarySession } from '@/domain/diary';
import type { Workout } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { useExercises } from '@/features/exercises/useExercises';
import { DiarySessionCard } from '@/features/history/DiarySessionCard';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import { knownSchemes, knownVariants, lastPerformances } from '@/features/logging/lastPerformance';
import {
  addWorkoutEntry,
  deleteWorkout,
  deleteWorkoutEntry,
  updateWorkoutEntry,
} from '@/features/logging/workoutRepository';
import { usePrograms } from '@/features/programs/usePrograms';
import { formatDate, todayIso } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** DOM anchor for a day: used by the jump-to-date. */
function sessionAnchor(workout: Workout): string {
  return `session-${workout.id}`;
}

/**
 * The diary: workouts by date (the other way of reading Progress).
 *
 * Progress answers "how are my pull-ups going", this one "what did I do on
 * Tuesday". Same data, already in memory: there is no extra query here, only a
 * different grouping (`domain/diary.ts`).
 *
 * It is for reading, so it belongs on the main display (spec §2.5) — but it
 * stays single-column and holds up at 360 px like the rest of the app: a
 * session can be read from the cover too, if it comes to that.
 */
export function DiaryPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const history = useWorkoutHistory();
  const exercises = useExercises();
  const programs = usePrograms();

  const [openId, setOpenId] = useState<string | null>(null);
  const [jumping, setJumping] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const exercisesById = new Map(exercises.data.map((exercise) => [exercise.id, exercise]));
  // The same suggestions offered while logging: a correction typed here must be
  // able to reuse a condition or a scheme already in the history, or it would
  // quietly create a second spelling of the same thing.
  const performances = lastPerformances(history.data);
  const variantsByExercise = knownVariants(history.data);
  const schemesByExercise = knownSchemes(history.data);
  const sessions = nonEmptySessions(
    buildDiary(history.data.workouts, history.data.entries, exercisesById),
  );

  /** The program day name ("Autunno 2026 · A"), when the workout came from one. */
  const dayNames = new Map<string, string>();
  for (const detail of programs.data) {
    for (const day of detail.days) {
      dayNames.set(day.day.id, `${detail.program.name} · ${day.day.name}`);
    }
  }

  /** First load only: afterwards the old data stays on screen while reloading. */
  const loading =
    (history.status === 'loading' && history.data.workouts.length === 0) ||
    (exercises.status === 'loading' && exercises.data.length === 0);

  function jumpTo(iso: string) {
    setJumping(false);
    const target = sessionNearest(sessions, iso);
    if (!target) return;

    // The detail opens too: whoever jumps to a date goes there to read it.
    setOpenId(target.workout.id);
    const element = document.getElementById(sessionAnchor(target.workout));
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  }

  /**
   * Every write reloads the history: the diary, the charts and the "last
   * performance" of the logging screen read the same rows, and a correction
   * that stays only on screen would be a lie the next time they are opened.
   */
  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      history.reload();
    } catch (cause) {
      setError(cause);
      throw cause;
    }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-2 py-4">
        <Link
          to="/"
          aria-label={t('nav.back')}
          className="tap-target -ml-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {t('diary.title')}
        </h1>
        {sessions.length > 0 && (
          <button
            type="button"
            aria-label={t('diary.jump')}
            aria-haspopup="dialog"
            onClick={() => {
              setJumping(true);
            }}
            className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
          >
            <CalendarSearch aria-hidden className="size-5" />
          </button>
        )}
        <LanguageSwitcher />
      </header>

      <main className="flex-1 space-y-4 pb-8">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            {t('dashboard.loading')}
          </p>
        )}

        {history.status === 'error' && (
          <p className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span role="alert">{describeError(history.error, t)}</span>
          </p>
        )}

        {error !== null && (
          <p
            role="alert"
            className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm leading-relaxed text-red-300"
          >
            {describeError(error, t)}
          </p>
        )}

        {!loading && history.status !== 'error' && sessions.length === 0 && (
          <p className="text-sm leading-relaxed text-slate-400">{t('diary.empty')}</p>
        )}

        {sessions.length > 0 && (
          <>
            <p className="text-xs text-slate-500">
              {t(sessions.length === 1 ? 'diary.count' : 'diary.counts', {
                count: sessions.length,
                from: formatDate(language, sessions.at(-1)?.workout.workoutDate ?? todayIso()),
              })}
            </p>

            <ul className="space-y-3">
              {sessions.map((session: DiarySession) => (
                <li key={session.workout.id} id={sessionAnchor(session.workout)}>
                  <DiarySessionCard
                    session={session}
                    dayName={
                      session.workout.programDayId === null
                        ? null
                        : (dayNames.get(session.workout.programDayId) ?? null)
                    }
                    open={openId === session.workout.id}
                    onToggle={() => {
                      setOpenId(openId === session.workout.id ? null : session.workout.id);
                    }}
                    catalog={exercisesById}
                    exercises={exercises.data}
                    performances={performances}
                    variantsByExercise={variantsByExercise}
                    schemesByExercise={schemesByExercise}
                    onUpdateEntry={async (entryId, changes) => {
                      await run(() => updateWorkoutEntry(entryId, changes));
                    }}
                    onAddEntry={async (exercise, changes) => {
                      if (!user) return;
                      await run(() =>
                        addWorkoutEntry({
                          ...changes,
                          userId: user.id,
                          workoutId: session.workout.id,
                          exerciseId: exercise.id,
                          // Last in the order of execution: something remembered
                          // afterwards was, at best, done at the end.
                          sortOrder: session.groups.reduce(
                            (count, group) => count + group.items.length,
                            0,
                          ),
                          isExcluded: false,
                          exclusionReason: null,
                          supersetKey: null,
                          supersetOrder: null,
                        }),
                      );
                    }}
                    onDeleteEntry={async (entryId) => {
                      await run(() => deleteWorkoutEntry(entryId, session.workout.id));
                    }}
                    onDeleteWorkout={async () => {
                      await run(() => deleteWorkout(session.workout.id));
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {jumping && (
          <DatePicker
            value={sessions[0]?.workout.workoutDate ?? todayIso()}
            max={todayIso()}
            onPick={jumpTo}
            onClose={() => {
              setJumping(false);
            }}
          />
        )}
      </main>
    </AppShell>
  );
}
