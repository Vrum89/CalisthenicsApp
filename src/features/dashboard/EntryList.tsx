import { Trophy } from 'lucide-react';
import { formatMetricValue } from '@/domain/metrics';
import { isPersonalRecord, type ExerciseStats, type HistoryPoint } from '@/domain/stats';
import type { MetricType } from '@/domain/types';
import { formatDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Elenco delle voci in ordine cronologico inverso, con badge PR sul record
 * (spec §6).
 *
 * Le voci escluse restano visibili ma attenuate, con accanto il motivo: e' il
 * comportamento chiesto dallo spec, e serve a ricordare che quel giorno una
 * sessione c'e' stata, anche se non conta per i record.
 */
export function EntryList({
  stats,
  metricType,
}: {
  stats: ExerciseStats;
  metricType: MetricType;
}) {
  const { t, language } = useTranslation();
  const reversed = [...stats.points].reverse();

  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
      {reversed.map((point: HistoryPoint) => {
        const { entry } = point;
        const record = isPersonalRecord(point, stats);

        return (
          <li
            key={entry.id}
            className={`px-3 py-2.5 ${entry.isExcluded ? 'opacity-50' : ''}`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-slate-400 tabular-nums">
                {formatDate(language, point.date)}
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

            {entry.variant && <p className="mt-0.5 text-xs text-slate-400">{entry.variant}</p>}
            {entry.notes && <p className="mt-0.5 text-xs text-slate-500">{entry.notes}</p>}
            {entry.isExcluded && (
              <p className="mt-1 text-xs text-rose-400/80">
                {t('dashboard.excluded')}
                {entry.exclusionReason ? ` · ${entry.exclusionReason}` : ''}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
