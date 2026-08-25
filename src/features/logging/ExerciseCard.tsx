import { Trash2 } from 'lucide-react';
import { metricConfig, metricLabel, metricUnit } from '@/domain/metrics';
import type { DraftEntry } from '@/features/logging/draft';
import { describePerformance, type LastPerformance } from '@/features/logging/lastPerformance';
import { NumberStepper } from '@/features/logging/NumberStepper';
import { SetCheckboxes } from '@/features/logging/SetCheckboxes';
import { Stopwatch } from '@/features/logging/Stopwatch';
import { formatCompactDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * L'esercizio in focus (spec §2.5): uno solo per volta, a schermo pieno.
 *
 * Quale widget mostrare lo decide `inputKind` del registro metriche, non uno
 * switch scritto qui: aggiungere una metrica nuova non deve voler dire
 * ritrovare tutti i posti in cui si era ragionato sul suo tipo.
 *
 * Zavorra, condizione e note stanno in un blocco richiudibile. Non perche'
 * contino poco, ma perche' durante l'allenamento si toccano una volta e poi si
 * spuntano serie per venti minuti: tenerli aperti costerebbe, sul cover display,
 * lo spazio delle caselle.
 */
export function ExerciseCard({
  entry,
  last,
  onChange,
  onRemove,
  onSetCompleted,
}: {
  entry: DraftEntry;
  last: LastPerformance | null;
  onChange: (change: (entry: DraftEntry) => DraftEntry) => void;
  onRemove: () => void;
  onSetCompleted: () => void;
}) {
  const { t, language } = useTranslation();
  const { inputKind } = metricConfig(entry.metricType);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-3">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-tight font-semibold text-slate-100">
            {entry.name}
          </h2>
          <p className="truncate text-xs text-slate-500">
            {last
              ? t('log.last', {
                  summary: describePerformance(t, entry.metricType, last.entry),
                  date: formatCompactDate(language, last.date),
                })
              : t('log.noLast')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('log.remove')}
          onClick={onRemove}
          className="tap-target -mt-1 -mr-1 flex shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-red-400"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </header>

      {inputKind === 'set-checkboxes' && (
        <SetCheckboxes entry={entry} onChange={onChange} onSetCompleted={onSetCompleted} />
      )}

      {inputKind === 'number' && (
        <NumberStepper
          value={entry.value}
          label={metricLabel(t, entry.metricType)}
          unit={metricUnit(t, entry.metricType)}
          placeholder="0"
          onChange={(value) => {
            onChange((current) => ({ ...current, value }));
          }}
        />
      )}

      {inputKind === 'stopwatch' && (
        <Stopwatch
          seconds={entry.value}
          onChange={(value) => {
            onChange((current) => ({ ...current, value }));
          }}
        />
      )}

      {/* Per la metrica `note` il testo E' il dato: sta in chiaro, non dentro
          il blocco richiudibile, altrimenti l'esercizio non avrebbe input — e
          zavorra e condizione non hanno senso per una voce di diario. */}
      {inputKind === 'text' ? (
        <div className="space-y-1">
          <label htmlFor={`text-${entry.id}`} className="block text-xs text-slate-500">
            {metricLabel(t, entry.metricType)}
          </label>
          <textarea
            id={`text-${entry.id}`}
            rows={3}
            value={entry.notes}
            placeholder={t('log.notesPlaceholder')}
            onChange={(event) => {
              const notes = event.target.value;
              onChange((current) => ({ ...current, notes }));
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600"
          />
        </div>
      ) : (
        <details>
          <summary className="tap-target flex cursor-pointer list-none items-center text-xs tracking-wider text-slate-500 uppercase">
            {t('log.details')}
          </summary>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <span className="block text-xs text-slate-500">{t('log.addedWeight')}</span>
              <NumberStepper
                value={entry.addedWeightKg}
                label={t('log.addedWeight')}
                unit="kg"
                step={2.5}
                max={200}
                placeholder="0"
                onChange={(addedWeightKg) => {
                  onChange((current) => ({ ...current, addedWeightKg }));
                }}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`variant-${entry.id}`} className="block text-xs text-slate-500">
                {t('log.variant')}
              </label>
              <input
                id={`variant-${entry.id}`}
                type="text"
                autoComplete="off"
                value={entry.variant}
                placeholder={t('log.variantPlaceholder')}
                onChange={(event) => {
                  const variant = event.target.value;
                  onChange((current) => ({ ...current, variant }));
                }}
                className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`notes-${entry.id}`} className="block text-xs text-slate-500">
                {t('log.notes')}
              </label>
              <textarea
                id={`notes-${entry.id}`}
                rows={2}
                value={entry.notes}
                placeholder={t('log.notesPlaceholder')}
                onChange={(event) => {
                  const notes = event.target.value;
                  onChange((current) => ({ ...current, notes }));
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>
        </details>
      )}
    </section>
  );
}
