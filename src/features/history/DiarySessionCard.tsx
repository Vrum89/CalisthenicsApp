import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Link2, LoaderCircle } from 'lucide-react';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import type { DiaryGroup, DiaryItem, DiarySession } from '@/domain/diary';
import { formatMetricValue } from '@/domain/metrics';
import type { WorkoutType } from '@/domain/types';
import { describePerformance } from '@/features/logging/lastPerformance';
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
 * notes, the link to the charts.
 *
 * Same choice as Progress, the other way round: there the detail is an
 * exercise's chart, here it is the story of a day.
 */
export function DiarySessionCard({
  session,
  dayName,
  open,
  onToggle,
  onDelete,
}: {
  session: DiarySession;
  /** "Autunno 2026 · A", when the workout was born from a program. */
  dayName: string | null;
  open: boolean;
  onToggle: () => void;
  onDelete: (entryId: string) => Promise<void>;
}) {
  const { t, language } = useTranslation();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const { workout, groups } = session;
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  async function handleDelete(entryId: string) {
    setError(null);
    setDeleting(entryId);
    try {
      await onDelete(entryId);
      setConfirming(null);
    } catch (cause) {
      setError(cause);
    } finally {
      setDeleting(null);
    }
  }

  function renderItem(item: DiaryItem, group: DiaryGroup) {
    const { entry } = item;
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
                <p className="text-xs text-slate-400 tabular-nums">
                  {entry.repsPerSet.join(' · ')}
                </p>
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
              <Link
                to={`/dashboard?exercise=${entry.exerciseId}`}
                className="inline-flex text-xs text-amber-400 underline underline-offset-2"
              >
                {t('diary.openProgress')}
              </Link>
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
          <span className="block text-base font-semibold text-slate-100">
            {formatDate(language, workout.workoutDate)}
          </span>
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
        <p className="border-t border-slate-800 p-3 text-xs leading-relaxed text-slate-400">
          {workout.notes}
        </p>
      )}
    </article>
  );
}
