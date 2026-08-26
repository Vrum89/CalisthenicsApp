import { useState } from 'react';
import { Link2, LoaderCircle, Trophy } from 'lucide-react';
import { formatMetricValue } from '@/domain/metrics';
import { isPersonalRecord, type ExerciseStats, type HistoryPoint } from '@/domain/stats';
import type { MetricType } from '@/domain/types';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { formatCompactDate, formatDate } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Elenco delle voci in ordine cronologico inverso, con badge PR sul record
 * (spec §6).
 *
 * Le voci escluse restano visibili ma attenuate, con accanto il motivo: e' il
 * comportamento chiesto dallo spec, e serve a ricordare che quel giorno una
 * sessione c'e' stata, anche se non conta per i record.
 *
 * Toccare una voce la evidenzia sul grafico. Sono cliccabili solo le voci che
 * sul grafico ci sono davvero — quelle senza valore o escluse non lo sono, e
 * renderle premibili prometterebbe un effetto che non puo' avvenire.
 *
 * Da qui si cancella anche una registrazione sbagliata: e' l'unico posto in cui
 * la si vede, quindi e' l'unico in cui ha senso poterla togliere. Il comando non
 * sta pero' nel flusso della riga — cancellare capita una volta ogni tanto, e un
 * cestino su ogni riga toglieva spazio e ordine allo storico, che invece si
 * legge di continuo. Si scopre scorrendo la riga (o col mouse sopra), e chiede
 * conferma, perche' cancella un pezzo di storico e non si annulla.
 */
export function EntryList({
  stats,
  metricType,
  selectedEntryId,
  onSelect,
  onDelete,
}: {
  stats: ExerciseStats;
  metricType: MetricType;
  selectedEntryId: string | null;
  onSelect: (entryId: string | null) => void;
  onDelete: (point: HistoryPoint) => Promise<void>;
}) {
  const { t, language } = useTranslation();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const reversed = [...stats.points].reverse();
  const chartable = new Set(stats.comparable.map((point) => point.entry.id));

  async function handleDelete(point: HistoryPoint) {
    setError(null);
    setDeleting(point.entry.id);
    try {
      await onDelete(point);
      setConfirming(null);
    } catch (cause) {
      setError(cause);
    } finally {
      setDeleting(null);
    }
  }

  function renderBody(point: HistoryPoint, record: boolean) {
    const { entry } = point;
    return (
      <>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-slate-400 tabular-nums">
            {formatCompactDate(language, point.date)}
          </span>
          <span className="min-w-0 flex-1" />
          {record && (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-400">
              <Trophy aria-hidden className="size-3" />
              {t('dashboard.pr')}
            </span>
          )}
          <span className="shrink-0 text-base font-semibold text-slate-100 tabular-nums">
            {formatMetricValue(t, metricType, entry.metricValue)}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
          {entry.scheme && <span className="tabular-nums">{entry.scheme}</span>}
          {entry.addedWeightKg !== null && entry.addedWeightKg > 0 && (
            <span className="text-sky-400/80">
              {t('dashboard.addedWeight', { kg: entry.addedWeightKg })}
            </span>
          )}
          {point.originalDate && (
            <span>{t('dashboard.originalDate', { date: point.originalDate })}</span>
          )}
        </div>

        {/* Il superset non e' un dato confrontabile — i calcoli restano per
            esercizio — ma e' il contesto che spiega il numero: 25 trazioni
            alternate ai piegamenti non sono 25 trazioni fresche. */}
        {point.supersetWith.length > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-400/80">
            <Link2 aria-hidden className="size-3 shrink-0" />
            {t('dashboard.supersetWith', { names: point.supersetWith.join(' + ') })}
          </p>
        )}

        {entry.variant && <p className="mt-0.5 text-xs text-slate-400">{entry.variant}</p>}
        {entry.notes && <p className="mt-0.5 text-xs text-slate-500">{entry.notes}</p>}
        {entry.isExcluded && (
          <p className="mt-1 text-xs text-rose-400/80">
            {t('dashboard.excluded')}
            {entry.exclusionReason ? ` · ${entry.exclusionReason}` : ''}
          </p>
        )}
      </>
    );
  }

  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
      {reversed.map((point) => {
        const { entry } = point;
        const record = isPersonalRecord(point, stats);
        const selectable = chartable.has(entry.id);
        const selected = entry.id === selectedEntryId;

        return (
          <li key={entry.id} className={entry.isExcluded ? 'opacity-50' : ''}>
            <SwipeToDelete
              label={t('dashboard.deleteEntry')}
              onRequestDelete={() => {
                setConfirming(entry.id);
                setError(null);
              }}
            >
                {selectable ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={selected ? t('dashboard.highlighted') : t('dashboard.highlight')}
                  onClick={() => {
                    onSelect(selected ? null : entry.id);
                  }}
                  className={`w-full border-l-2 py-2.5 pr-10 pl-3 text-left transition-colors ${
                    selected
                      ? 'border-amber-400 bg-slate-800/70'
                      : 'border-transparent hover:bg-slate-900/60'
                  }`}
                >
                  {renderBody(point, record)}
                </button>
              ) : (
                <div className="border-l-2 border-transparent px-3 py-2.5">
                  {renderBody(point, record)}
                </div>
              )}
            </SwipeToDelete>

            {confirming === entry.id && (
              <div className="space-y-2 border-t border-slate-800 bg-slate-900/60 px-3 py-2">
                <p className="text-xs leading-relaxed text-slate-300">
                  {t('dashboard.deleteConfirm', { date: formatDate(language, point.date) })}
                </p>
                {error !== null && (
                  <p role="alert" className="text-xs leading-relaxed text-red-400">
                    {describeError(error, t)}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null);
                      setError(null);
                    }}
                    className="tap-target flex-1 rounded-lg border border-slate-700 px-3 text-sm text-slate-300"
                  >
                    {t('dashboard.deleteCancel')}
                  </button>
                  <button
                    type="button"
                    disabled={deleting === entry.id}
                    onClick={() => {
                      void handleDelete(point);
                    }}
                    className="tap-target flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-slate-50 disabled:opacity-50"
                  >
                    {deleting === entry.id && (
                      <LoaderCircle aria-hidden className="size-4 animate-spin" />
                    )}
                    {t('dashboard.deleteConfirmed')}
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
