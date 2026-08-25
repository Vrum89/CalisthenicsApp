import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  EXERCISE_CATEGORIES,
  categoryLabel,
  defaultMetricFor,
  isKnownCategory,
  type ExerciseCategory,
} from '@/domain/categories';
import { metricConfig, metricInputHint, metricLabel } from '@/domain/metrics';
import { METRIC_TYPES, type MetricType } from '@/domain/types';
import { NumberStepper } from '@/features/logging/NumberStepper';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface NewExerciseDraft {
  readonly name: string;
  readonly category: string;
  readonly metricType: MetricType;
  /** `null` = la durata di default della metrica. */
  readonly windowSeconds: number | null;
}

/**
 * Creazione di un esercizio dal picker (spec §5.2).
 *
 * Il catalogo e' seminato, non chiuso: un esercizio nuovo lo si inventa mentre
 * ci si allena, e mandare l'utente altrove per aggiungerlo significa
 * interrompere l'allenamento.
 *
 * Poche scelte oltre al nome. La categoria serve a ritrovarlo; la metrica decide
 * come si registra e come si legge il numero, quindi sotto la scelta si mostra
 * che aspetto avra' l'input — e' l'unica decisione che poi non si cambia, perche'
 * cambiarla reinterpreterebbe tutto lo storico dell'esercizio. La durata della
 * finestra compare solo per le metriche che ne hanno una.
 */
export function NewExerciseForm({
  initial,
  onCreate,
  onCancel,
}: {
  /**
   * Valori di partenza. Il nome arriva dalla ricerca; il resto e' valorizzato
   * solo quando si duplica un esercizio esistente.
   */
  initial: Partial<NewExerciseDraft> & { name: string };
  onCreate: (draft: NewExerciseDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<ExerciseCategory>(
    isKnownCategory(initial.category ?? '') ? (initial.category as ExerciseCategory) : 'strength_sets',
  );
  // Finche' non la si tocca, la metrica segue la categoria: sono correlate quasi
  // sempre, e chi crea un esercizio di corsa non deve anche ricordarsi "tempo".
  const [metricType, setMetricType] = useState<MetricType | null>(initial.metricType ?? null);
  const [windowMinutes, setWindowMinutes] = useState<number | null>(
    initial.windowSeconds === undefined || initial.windowSeconds === null
      ? null
      : initial.windowSeconds / 60,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const metric = metricType ?? defaultMetricFor(category);
  const defaultWindow = metricConfig(metric).countdownSeconds;
  // I dieci minuti erano un'assunzione del registro: restano il default, ma un
  // "max ripetizioni" da otto minuti e' comunque un "max ripetizioni".
  const minutes = windowMinutes ?? (defaultWindow === undefined ? null : defaultWindow / 60);
  const trimmed = name.trim();

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      await onCreate({
        name: trimmed,
        category,
        metricType: metric,
        windowSeconds: minutes === null ? null : Math.round(minutes * 60),
      });
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

      {defaultWindow !== undefined && (
        <div className="space-y-1">
          <span className="block text-xs text-slate-500">{t('log.create.window')}</span>
          <NumberStepper
            value={minutes}
            label={t('log.create.window')}
            unit={t('metric.unit.minutes')}
            min={1}
            max={120}
            onChange={setWindowMinutes}
          />
          <p className="text-xs leading-relaxed text-slate-500">{t('log.create.windowHint')}</p>
        </div>
      )}

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
