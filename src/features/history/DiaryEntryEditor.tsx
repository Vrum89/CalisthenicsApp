import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { entryValue, type DraftEntry } from '@/features/logging/draft';
import { ExerciseCard } from '@/features/logging/ExerciseCard';
import { changesFromDraft, type WorkoutEntryChanges } from '@/features/logging/workoutRepository';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Correcting one entry of a logged workout, with the widgets used to log it.
 *
 * The same `ExerciseCard` as the logging screen: ticking a set, the stepper,
 * the stopwatch, added weight and condition behave exactly as they do while
 * training. A correction is rare enough that a second way of typing the same
 * numbers would be learnt once and forgotten by the next time.
 *
 * The rest timer stays out: nobody is resting while fixing last Tuesday.
 */
export function DiaryEntryEditor({
  draft,
  caption,
  variants,
  schemes,
  onSave,
  onCancel,
}: {
  draft: DraftEntry;
  /** The day being corrected: it replaces the card's "last time" line. */
  caption: string;
  variants: readonly string[];
  schemes: readonly string[];
  onSave: (changes: WorkoutEntryChanges) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [edited, setEdited] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Nothing done and nothing written is not a correction, it is a deletion —
  // and deleting has its own gesture, with its own confirmation.
  const empty = entryValue(edited) === null && edited.notes.trim().length === 0;

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await onSave(changesFromDraft(edited));
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 py-2">
      <ExerciseCard
        entry={edited}
        last={null}
        caption={caption}
        variants={variants}
        schemes={schemes}
        onChange={(change) => {
          setEdited(change);
        }}
        onSetCompleted={() => {
          // No rest timer here: this is a correction, not a session.
        }}
        onStartWindow={() => {
          // Same reason: the countdown belongs to the workout being done.
        }}
      />

      {error !== null && (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {describeError(error, t)}
        </p>
      )}

      {empty && <p className="text-xs text-slate-500">{t('log.nothingDone')}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-200 disabled:opacity-40"
        >
          {t('diary.editCancel')}
        </button>
        <button
          type="button"
          disabled={saving || empty}
          onClick={() => {
            void handleSave();
          }}
          className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {t('diary.editSave')}
        </button>
      </div>
    </div>
  );
}
