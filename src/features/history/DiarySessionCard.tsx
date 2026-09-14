import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Link2, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { compareCategories } from '@/domain/categories';
import type { DiaryGroup, DiaryItem, DiarySession } from '@/domain/diary';
import { formatMetricValue } from '@/domain/metrics';
import type { Exercise, WorkoutType } from '@/domain/types';
import { DiaryEntryEditor } from '@/features/history/DiaryEntryEditor';
import {
  draftEntryFor,
  draftEntryFromSaved,
  type DraftEntry,
} from '@/features/logging/draft';
import { describePerformance, type LastPerformance } from '@/features/logging/lastPerformance';
import type { WorkoutEntryChanges } from '@/features/logging/workoutRepository';
import { formatDate } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TranslationKey } from '@/lib/i18n/types';

const TYPE_LABEL: Record<WorkoutType, TranslationKey> = {
  from_program: 'log.type.fromProgram',
  freestyle: 'log.type.freestyle',
  test: 'log.type.test',
};

/**
 * One workout in the diary: header always visible, detail on demand.
 *
 * Closed, it is a summary to scroll through: date, type, and one line per
 * exercise with what matters ("Chin up · 5x6 · 30 · +5 kg"). Open, it adds what
 * is only needed when you actually stop on that day: the sets one by one, the
 * notes, the link to the charts — and the commands to correct it.
 *
 * Corrections live inside the open detail on purpose (spec §6.1). The diary is
 * made for reading: a pencil on every row, always there, would turn a list you
 * scroll into a form you can hit by accident.
 */
export function DiarySessionCard({
  session,
  dayName,
  open,
  onToggle,
  catalog,
  exercises,
  performances,
  variantsByExercise,
  schemesByExercise,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
  onDeleteWorkout,
}: {
  session: DiarySession;
  /** "Autunno 2026 · A", when the workout was born from a program. */
  dayName: string | null;
  open: boolean;
  onToggle: () => void;
  /** The catalogue by id: the editor needs metric and window of the exercise. */
  catalog: ReadonlyMap<string, Exercise>;
  /** The catalogue as a list, for the "add an exercise" dropdown. */
  exercises: readonly Exercise[];
  performances: ReadonlyMap<string, LastPerformance>;
  variantsByExercise: ReadonlyMap<string, readonly string[]>;
  schemesByExercise: ReadonlyMap<string, readonly string[]>;
  onUpdateEntry: (entryId: string, changes: WorkoutEntryChanges) => Promise<void>;
  onAddEntry: (exercise: Exercise, changes: WorkoutEntryChanges) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onDeleteWorkout: () => Promise<void>;
}) {
  const { t, language } = useTranslation();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ draft: DraftEntry; exercise: Exercise } | null>(null);
  const [closingWorkout, setClosingWorkout] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const { workout, groups } = session;
  const total = groups.reduce((count, group) => count + group.items.length, 0);
  const day = formatDate(language, workout.workoutDate);

  const addable = [...exercises]
    .filter((exercise) => exercise.isActive)
    .sort((a, b) => compareCategories(t, a.category, b.category) || a.name.localeCompare(b.name));

  async function handleDelete(entryId: string) {
    setError(null);
    setDeleting(entryId);
    try {
      await onDeleteEntry(entryId);
      setConfirming(null);
    } catch (cause) {
      setError(cause);
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteWorkout() {
    setError(null);
    setDeleting(workout.id);
    try {
      await onDeleteWorkout();
    } catch (cause) {
      setError(cause);
      setDeleting(null);
    }
  }

  function renderItem(item: DiaryItem, group: DiaryGroup) {
    const { entry } = item;
    const exercise = catalog.get(entry.exerciseId) ?? null;

    if (editingId === entry.id && exercise) {
      return (
        <DiaryEntryEditor
          draft={draftEntryFromSaved(entry, exercise)}
          caption={day}
          variants={variantsByExercise.get(entry.exerciseId) ?? []}
          schemes={schemesByExercise.get(entry.exerciseId) ?? []}
          onSave={async (changes) => {
            await onUpdateEntry(entry.id, changes);
            setEditingId(null);
          }}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      );
    }

    const summary = describePerformance(t, item.metricType, entry);
    const companions = group.items
      .filter((other) => other.entry.id !== entry.id)
      .map((other) => other.name);

    if (confirming === entry.id) {
      return (
        <div className="space-y-2 rounded-lg border border-red-900/60 bg-red-950/30 p-3">
          <p className="text-sm leading-relaxed text-red-200">
            {t('diary.deleteConfirm', { name: item.name })}
          </p>
          {error !== null && (
            <p role="alert" className="text-xs text-red-300">
              {describeError(error, t)}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={deleting !== null}
              onClick={() => {
                setConfirming(null);
                setError(null);
              }}
              className="tap-target flex-1 rounded-lg border border-slate-700 px-3 text-sm text-slate-200 disabled:opacity-40"
            >
              {t('dashboard.deleteCancel')}
            </button>
            <button
              type="button"
              disabled={deleting !== null}
              onClick={() => {
                void handleDelete(entry.id);
              }}
              className="tap-target flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {deleting === entry.id && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {t('dashboard.deleteConfirmed')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <SwipeToDelete
        label={t('dashboard.deleteEntry')}
        onRequestDelete={() => {
          setConfirming(entry.id);
        }}
      >
        <div className={`space-y-1 py-2 ${entry.isExcluded ? 'opacity-50' : ''}`}>
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
              {item.name}
            </span>
            <span className="shrink-0 text-sm text-slate-300 tabular-nums">
              {summary.length > 0 ? summary : formatMetricValue(t, item.metricType, null)}
            </span>
          </div>

          {companions.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-amber-400/80">
              <Link2 aria-hidden className="size-3 shrink-0" />
              {t('dashboard.supersetWith', { names: companions.join(' + ') })}
            </p>
          )}

          {open && (
            <>
              {entry.repsPerSet !== null && entry.repsPerSet.length > 0 && (
                <p className="text-xs text-slate-400 tabular-nums">{entry.repsPerSet.join(' · ')}</p>
              )}
              {entry.notes !== null && entry.notes.length > 0 && (
                <p className="text-xs leading-relaxed text-slate-400">{entry.notes}</p>
              )}
              {entry.isExcluded && (
                <p className="text-xs text-slate-500">
                  {t('dashboard.excluded')}
                  {entry.exclusionReason !== null && ` — ${entry.exclusionReason}`}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {exercise && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(null);
                      setEditingId(entry.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-amber-400 underline underline-offset-2"
                  >
                    <Pencil aria-hidden className="size-3" />
                    {t('diary.edit')}
                  </button>
                )}
                <Link
                  to={`/dashboard?exercise=${entry.exerciseId}`}
                  className="inline-flex text-xs text-amber-400 underline underline-offset-2"
                >
                  {t('diary.openProgress')}
                </Link>
              </div>
            </>
          )}
        </div>
      </SwipeToDelete>
    );
  }

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-800/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-slate-100">{day}</span>
          <span className="block truncate text-xs text-slate-500">
            {dayName ?? t(TYPE_LABEL[workout.workoutType])}
            {' · '}
            {t(total === 1 ? 'diary.exercise' : 'diary.exercises', { count: total })}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div className="divide-y divide-slate-800 border-t border-slate-800 px-3">
        {groups.map((group, index) => (
          <div key={group.supersetKey ?? `single-${String(index)}`}>
            {group.items.map((item) => (
              <div key={item.entry.id}>{renderItem(item, group)}</div>
            ))}
          </div>
        ))}
      </div>

      {open && workout.notes !== null && workout.notes.length > 0 && (
        <p className="border-t border-slate-800 px-3 py-2 text-xs leading-relaxed text-slate-400">
          {workout.notes}
        </p>
      )}

      {open && adding !== null && (
        <div className="border-t border-slate-800 px-3">
          <DiaryEntryEditor
            draft={adding.draft}
            caption={day}
            variants={variantsByExercise.get(adding.exercise.id) ?? []}
            schemes={schemesByExercise.get(adding.exercise.id) ?? []}
            onSave={async (changes) => {
              await onAddEntry(adding.exercise, changes);
              setAdding(null);
            }}
            onCancel={() => {
              setAdding(null);
            }}
          />
        </div>
      )}

      {open && (
        <div className="space-y-2 border-t border-slate-800 p-3">
          {error !== null && confirming === null && (
            <p role="alert" className="text-sm leading-relaxed text-red-400">
              {describeError(error, t)}
            </p>
          )}

          {/* Forgotten on the day: it is attached to this workout instead of
              creating a second card on the same date. A dropdown and not the
              full-screen picker, as in the programs editor: correcting is done
              sitting still, not under the bar. */}
          <label className="flex items-center gap-2">
            <Plus aria-hidden className="size-4 shrink-0 text-slate-500" />
            <span className="sr-only">{t('diary.addExercise')}</span>
            <select
              aria-label={t('diary.addExercise')}
              value=""
              onChange={(event) => {
                const exercise = addable.find((item) => item.id === event.target.value);
                if (!exercise) return;
                setEditingId(null);
                setAdding({
                  exercise,
                  draft: draftEntryFor(exercise, performances.get(exercise.id)?.entry ?? null),
                });
              }}
              className="tap-target min-w-0 flex-1 rounded-lg border border-dashed border-slate-600 bg-slate-900 px-2 text-sm text-slate-300"
            >
              <option value="">{t('diary.addExercise')}</option>
              {addable.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>

          {closingWorkout ? (
            <div className="space-y-2 rounded-lg border border-red-900/60 bg-red-950/30 p-3">
              <p className="text-sm leading-relaxed text-red-200">
                {t(total === 1 ? 'diary.deleteWorkoutOne' : 'diary.deleteWorkoutConfirm', {
                  date: day,
                  count: total,
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting !== null}
                  onClick={() => {
                    setClosingWorkout(false);
                  }}
                  className="tap-target flex-1 rounded-lg border border-slate-700 px-3 text-sm text-slate-200 disabled:opacity-40"
                >
                  {t('dashboard.deleteCancel')}
                </button>
                <button
                  type="button"
                  disabled={deleting !== null}
                  onClick={() => {
                    void handleDeleteWorkout();
                  }}
                  className="tap-target flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {deleting === workout.id && (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  )}
                  {t('dashboard.deleteConfirmed')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setClosingWorkout(true);
              }}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-medium text-red-400 hover:bg-slate-900"
            >
              <Trash2 aria-hidden className="size-4" />
              {t('diary.deleteWorkout')}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
