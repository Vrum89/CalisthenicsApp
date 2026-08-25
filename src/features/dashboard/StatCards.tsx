import { formatMetricValue } from '@/domain/metrics';
import type { ExerciseStats } from '@/domain/stats';
import type { MetricType } from '@/domain/types';
import { formatDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

const EMPTY = '—';

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5">
      <div className="text-xs tracking-wider text-slate-500 uppercase">{label}</div>
      <div className={`mt-0.5 text-lg font-bold tabular-nums ${accent ?? 'text-slate-100'}`}>
        {value}
      </div>
      <div className="truncate text-xs text-slate-500">{sub ?? ' '}</div>
    </div>
  );
}

/**
 * Prima / Migliore / Ultima / Trend (spec §6).
 *
 * Il trend confronta la prima con l'ultima, come nel prototipo: dice se in
 * tutto il periodo sei migliorato. Il segno mostrato e' quello del numero
 * (per un tempo, "−0:41" significa quarantun secondi in meno), mentre il colore
 * viene da `direction`, che il registro metriche calcola sapendo che per `time`
 * scendere e' un miglioramento. Numero e giudizio restano cosi' indipendenti.
 */
export function StatCards({ stats, metricType }: { stats: ExerciseStats; metricType: MetricType }) {
  const { t, language } = useTranslation();

  const { first, best, last, trend } = stats;

  const trendText =
    trend.rawDelta === null
      ? EMPTY
      : trend.rawDelta === 0
        ? '±0'
        : `${trend.rawDelta > 0 ? '+' : '−'}${formatMetricValue(t, metricType, Math.abs(trend.rawDelta))}`;

  const trendAccent =
    trend.direction === 'improved'
      ? 'text-emerald-400'
      : trend.direction === 'worsened'
        ? 'text-rose-400'
        : 'text-slate-100';

  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat
        label={t('stat.first')}
        value={first ? formatMetricValue(t, metricType, first.entry.metricValue) : EMPTY}
        {...(first ? { sub: formatDate(language, first.date) } : {})}
      />
      <Stat
        label={t('stat.best')}
        value={formatMetricValue(t, metricType, stats.bestValue)}
        accent="text-amber-400"
        {...(best ? { sub: formatDate(language, best.date) } : {})}
      />
      <Stat
        label={t('stat.last')}
        value={last ? formatMetricValue(t, metricType, last.entry.metricValue) : EMPTY}
        {...(last ? { sub: formatDate(language, last.date) } : {})}
      />
      <Stat
        label={t('stat.trend')}
        value={trendText}
        sub={t('stat.trendSub')}
        accent={trendAccent}
      />
    </div>
  );
}
