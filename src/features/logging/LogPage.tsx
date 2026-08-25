import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  Save,
  TriangleAlert,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { AppError, describeError } from '@/lib/errors';
import { todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { WorkoutType } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { createExercise } from '@/features/exercises/exercisesRepository';
import { useExercises } from '@/features/exercises/useExercises';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import { draftEntryFor, filledEntries } from '@/features/logging/draft';
import { ExerciseCard } from '@/features/logging/ExerciseCard';
import { ExercisePicker } from '@/features/logging/ExercisePicker';
import { knownVariants, lastPerformances } from '@/features/logging/lastPerformance';
import type { NewExerciseDraft } from '@/features/logging/NewExerciseForm';
import { RestTimerBar } from '@/features/logging/RestTimerBar';
import { WorkoutDateField } from '@/features/logging/WorkoutDateField';
import { saveWorkout } from '@/features/logging/workoutRepository';
import { REST_MODE, useRestTimer, windowMode } from '@/features/logging/useRestTimer';
import { useWorkoutDraft } from '@/features/logging/useWorkoutDraft';

/** `from_program` arriva con le schede (M7): senza schede non c'e' cosa scegliere. */
const SELECTABLE_TYPES: readonly WorkoutType[] = ['freestyle', 'test'];

const TYPE_LABEL = {
  freestyle: 'log.type.freestyle',
  test: 'log.type.test',
  from_program: 'log.type.fromProgram',
} as const;

/**
 * Registrazione di un allenamento (spec §5.2 e §5.3).
 *
 * Regola di layout, che viene prima di tutto il resto: questa schermata si usa
 * DURANTE l'allenamento, sul cover display da ~360x360 (spec §2.5). Quindi un
 * esercizio in focus alla volta, il resto raggiungibile ma non a schermo, e
 * niente che non serva mentre si e' sotto la sbarra.
 *
 * Il tipo `from_program` non e' fra le scelte perche' senza schede non ci sarebbe
 * un giorno da cui partire: arriva con la M7, e i widget saranno gli stessi.
 */
export function LogPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const exercises = useExercises();
  const history = useWorkoutHistory();
  const draftController = useWorkoutDraft();
  const timer = useRestTimer();

  const [focus, setFocus] = useState(0);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const { draft } = draftController;
  const entries = draft.entries;
  const performances = lastPerformances(history.data);
  const variantsByExercise = knownVariants(history.data);

  // L'indice si tiene dentro i bordi qui, non a ogni rimozione: cosi' non c'e'
  // un istante in cui punta a una voce che non esiste piu'.
  const index = Math.min(focus, Math.max(0, entries.length - 1));
  const current = entries[index] ?? null;
  const ready = filledEntries(draft).length > 0;

  async function handleCreateExercise(exercise: NewExerciseDraft) {
    if (!user) return;
    const created = await createExercise({ ...exercise, userId: user.id, isActive: true });
    draftController.addEntry(draftEntryFor(created, null));
    setFocus(entries.length);
    setPicking(false);
    setSaved(false);
    // Il catalogo si ricarica dopo: l'esercizio e' gia' nella bozza, e
    // aspettare la lista completa terrebbe fermo chi si sta allenando.
    exercises.reload();
  }

  async function handleSave() {
    setError(null);
    if (!user) return;

    if (draft.workoutDate > todayIso()) {
      setError(new AppError('log.futureDate', `Future workout date: ${draft.workoutDate}`));
      return;
    }

    setSaving(true);
    try {
      await saveWorkout(draft, user.id);
      timer.stop();
      draftController.reset();
      setFocus(0);
      setSaved(true);
      history.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label={t('nav.back')}
          className="tap-target -ml-2 flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>

        {/* La data e' modificabile e parte da oggi: capita di segnare la sera,
            o il giorno dopo, un allenamento gia' fatto. */}
        <WorkoutDateField
          value={draft.workoutDate}
          onChange={(date) => {
            draftController.setDate(date);
            setSaved(false);
          }}
        />

        <div role="group" aria-label={t('log.type')} className="ml-auto flex shrink-0 gap-1">
          {SELECTABLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={draft.workoutType === type}
              onClick={() => {
                draftController.setWorkoutType(type);
              }}
              className={`tap-target rounded-lg px-2 text-sm font-medium ${
                draft.workoutType === type
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t(TYPE_LABEL[type])}
            </button>
          ))}
        </div>
      </header>

      <main className={`flex-1 space-y-4 ${timer.running ? 'pb-24' : 'pb-8'}`}>
        {exercises.status === 'error' && (
          <p className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span role="alert">{describeError(exercises.error, t)}</span>
          </p>
        )}

        {current === null ? (
          <div className="space-y-4 pt-6 text-center">
            <p className="text-sm leading-relaxed text-slate-400">{t('log.empty')}</p>
            {saved && (
              <p className="text-sm text-emerald-400">
                {t('log.saved')}{' '}
                <Link to="/dashboard" className="underline">
                  {t('nav.dashboard')}
                </Link>
              </p>
            )}
          </div>
        ) : (
          <>
            <ExerciseCard
              key={current.id}
              entry={current}
              last={performances.get(current.exerciseId) ?? null}
              onChange={(change) => {
                draftController.updateEntry(current.id, change);
                setSaved(false);
              }}
              onRemove={() => {
                draftController.removeEntry(current.id);
              }}
              variants={variantsByExercise.get(current.exerciseId) ?? []}
              onSetCompleted={() => {
                timer.start(REST_MODE);
              }}
              onStartWindow={(seconds) => {
                timer.start(windowMode(seconds));
              }}
            />

            {entries.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label={t('log.previous')}
                  disabled={index === 0}
                  onClick={() => {
                    setFocus(index - 1);
                  }}
                  className="tap-target flex items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft aria-hidden className="size-5" />
                </button>
                <span className="text-sm text-slate-400 tabular-nums">
                  {t('log.position', { index: index + 1, total: entries.length })}
                </span>
                <button
                  type="button"
                  aria-label={t('log.next')}
                  disabled={index === entries.length - 1}
                  onClick={() => {
                    setFocus(index + 1);
                  }}
                  className="tap-target flex items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 disabled:opacity-30"
                >
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setPicking(true);
          }}
          disabled={exercises.status !== 'ready'}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 text-base font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-50"
        >
          {exercises.status === 'loading' ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
          ) : (
            <Plus aria-hidden className="size-5" />
          )}
          {t('log.addExercise')}
        </button>

        {entries.length > 0 && (
          <>
            <details>
              <summary className="tap-target flex cursor-pointer list-none items-center text-xs tracking-wider text-slate-500 uppercase">
                {t('log.workoutNotes')}
              </summary>
              <textarea
                rows={2}
                aria-label={t('log.workoutNotes')}
                value={draft.notes}
                placeholder={t('log.notesPlaceholder')}
                onChange={(event) => {
                  draftController.setNotes(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600"
              />
            </details>

            {error !== null && (
              <p role="alert" className="text-sm leading-relaxed text-red-400">
                {describeError(error, t)}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={saving || !ready}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle aria-hidden className="size-5 animate-spin" />
              ) : (
                <Save aria-hidden className="size-5" />
              )}
              {saving ? t('log.saving') : t('log.save')}
            </button>

            {!ready && <p className="text-center text-xs text-slate-500">{t('log.nothingDone')}</p>}
          </>
        )}
      </main>

      <RestTimerBar timer={timer} />

      {picking && (
        <ExercisePicker
          exercises={exercises.data}
          performances={performances}
          onPick={(exercise) => {
            draftController.addEntry(
              draftEntryFor(exercise, performances.get(exercise.id)?.entry ?? null),
            );
            setFocus(entries.length);
            setPicking(false);
            setSaved(false);
          }}
          onCreate={handleCreateExercise}
          onClose={() => {
            setPicking(false);
          }}
        />
      )}
    </AppShell>
  );
}
