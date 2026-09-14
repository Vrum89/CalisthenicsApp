import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarSearch, ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { DatePicker } from '@/components/DatePicker';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { buildDiary, nonEmptySessions, sessionNearest, type DiarySession } from '@/domain/diary';
import type { Workout } from '@/domain/types';
import { useExercises } from '@/features/exercises/useExercises';
import { DiarySessionCard } from '@/features/history/DiarySessionCard';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import { deleteWorkoutEntry } from '@/features/logging/workoutRepository';
import { usePrograms } from '@/features/programs/usePrograms';
import { formatDate, todayIso } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Ancora DOM di una giornata: serve al salto per data. */
function sessionAnchor(workout: Workout): string {
  return `session-${workout.id}`;
}

/**
 * Il diario: gli allenamenti per data (l'altra lettura dei Progressi).
 *
 * I Progressi rispondono a "come sto andando nelle trazioni", questo a "cosa ho
 * fatto martedi'". Stessi dati, gia' in memoria: qui non c'e' nessuna query in
 * piu', solo un raggruppamento diverso (`domain/diary.ts`).
 *
 * E' consultazione, quindi vive sul display principale (spec §2.5) — ma resta a
 * colonna singola e regge i 360 px come il resto dell'app: una sessione si
 * legge anche dal cover, se capita.
 */
export function DiaryPage() {
  const { t, language } = useTranslation();
  const history = useWorkoutHistory();
  const exercises = useExercises();
  const programs = usePrograms();

  const [openId, setOpenId] = useState<string | null>(null);
  const [jumping, setJumping] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const exercisesById = new Map(exercises.data.map((exercise) => [exercise.id, exercise]));
  const sessions = nonEmptySessions(
    buildDiary(history.data.workouts, history.data.entries, exercisesById),
  );

  /** Il nome del giorno di scheda ("Autunno 2026 · A"), se l'allenamento ne aveva uno. */
  const dayNames = new Map<string, string>();
  for (const detail of programs.data) {
    for (const day of detail.days) {
      dayNames.set(day.day.id, `${detail.program.name} · ${day.day.name}`);
    }
  }

  /** Primo caricamento: dopo, i dati vecchi restano a schermo mentre si ricarica. */
  const loading =
    (history.status === 'loading' && history.data.workouts.length === 0) ||
    (exercises.status === 'loading' && exercises.data.length === 0);

  function jumpTo(iso: string) {
    setJumping(false);
    const target = sessionNearest(sessions, iso);
    if (!target) return;

    // Si apre anche il dettaglio: chi salta a una data ci va per leggerla.
    setOpenId(target.workout.id);
    const element = document.getElementById(sessionAnchor(target.workout));
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  }

  async function handleDelete(entryId: string, workoutId: string) {
    await deleteWorkoutEntry(entryId, workoutId);
    history.reload();
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
                    onDelete={async (entryId) => {
                      setError(null);
                      try {
                        await handleDelete(entryId, session.workout.id);
                      } catch (cause) {
                        setError(cause);
                      }
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
