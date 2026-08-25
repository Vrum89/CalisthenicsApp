import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  EXERCISE_CATEGORIES,
  categoryLabel,
  defaultMetricFor,
  type ExerciseCategory,
} from '@/domain/categories';
import { metricInputHint, metricLabel } from '@/domain/metrics';
import { METRIC_TYPES, type MetricType } from '@/domain/types';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface NewExerciseDraft {
  readonly name: string;
  readonly category: string;
  readonly metricType: MetricType;
}

/**
 * Creazione di un esercizio dal picker (spec §5.2).
 *
 * Il catalogo e' seminato, non chiuso: un esercizio nuovo lo si inventa mentre
 * ci si allena, e mandare l'utente altrove per aggiungerlo significa
 * interrompere l'allenamento.
 *
 * Due sole scelte oltre al nome. La categoria serve a ritrovarlo; la metrica
 * decide come si registra e come si legge il numero, quindi sotto la scelta si
 * mostra che aspetto avra' l'input — e' l'unica decisione che poi non si cambia,
 * perche' cambiarla reinterpreterebbe tutto lo storico dell'esercizio.
 */
export function NewExerciseForm({
  initialName,
  onCreate,
  onCancel,
}: {
  initialName: string;
  onCreate: (draft: NewExerciseDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<ExerciseCategory>('strength_sets');
  // Finche' non la si tocca, la metrica segue la categoria: sono correlate quasi
  // sempre, e chi crea un esercizio di corsa non deve anche ricordarsi "tempo".
  const [metricType, setMetricType] = useState<MetricType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const metric = metricType ?? defaultMetricFor(category);
  const trimmed = name.trim();

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      await onCreate({ name: trimmed, category, metricType: metric });
    } catch (cause) {
      setError(cause);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 py-3">
      <div className="space-y-1">
        <label htmlFor="new-exercise-name" className="block text-xs text-slate-500">
          {t('log.create.name')}
        </label>
        <input
          id="new-exercise-name"
          type="text"
          autoComplete="off"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="new-exercise-category" className="block text-xs text-slate-500">
          {t('log.create.category')}
        </label>
        <select
          id="new-exercise-category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as ExerciseCategory);
            setMetricType(null);
          }}
          className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
        >
          {EXERCISE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {categoryLabel(t, value)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="new-exercise-metric" className="block text-xs text-slate-500">
          {t('log.create.metric')}
        </label>
        <select
          id="new-exercise-metric"
          value={metric}
          onChange={(event) => {
            setMetricType(event.target.value as MetricType);
          }}
          className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
        >
          {METRIC_TYPES.map((value) => (
            <option key={value} value={value}>
              {metricLabel(t, value)}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-slate-500">{metricInputHint(t, metric)}</p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {describeError(error, t)}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-300 hover:bg-slate-900"
        >
          {t('log.create.cancel')}
        </button>
        <button
          type="button"
          disabled={saving || trimmed.length === 0}
          onClick={() => {
            void handleSubmit();
          }}
          className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {t('log.create.submit')}
        </button>
      </div>
    </div>
  );
}
