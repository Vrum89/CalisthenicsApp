import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMetricTick, formatMetricValue, metricCaption, metricConfig } from '@/domain/metrics';
import type { HistoryPoint } from '@/domain/stats';
import type { MetricType } from '@/domain/types';
import { formatAxisDate, formatDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

const AMBER = '#fbbf24';
const SKY = '#38bdf8';
const GRID = '#334155';
const AXIS_TEXT = '#94a3b8';

interface ChartPoint {
  entryId: string;
  label: string;
  full: string;
  value: number;
  weight: number | null;
  display: string;
  scheme: string | null;
  variant: string | null;
  notes: string | null;
}

interface TooltipItem {
  payload?: ChartPoint;
}

function ChartTooltip({
  active,
  payload,
  showWeight,
}: {
  active?: boolean;
  payload?: readonly TooltipItem[];
  showWeight: boolean;
}) {
  const { t } = useTranslation();
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="max-w-56 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
      <div className="text-slate-400">{point.full}</div>
      <div className="font-semibold text-amber-400 tabular-nums">
        {point.display}
        {point.scheme ? ` · ${point.scheme}` : ''}
      </div>
      {showWeight && point.weight !== null && (
        <div className="text-sky-400">{t('dashboard.addedWeight', { kg: point.weight })}</div>
      )}
      {point.variant && <div className="text-slate-300">{point.variant}</div>}
      {point.notes && <div className="mt-0.5 text-slate-500">{point.notes}</div>}
    </div>
  );
}

/**
 * Grafico per esercizio (spec §6). Che forma abbia lo decide il registro
 * metriche via `chartKind`, non un controllo sul tipo fatto qui.
 *
 * Riceve solo i punti confrontabili: una voce esclusa e' fuori dai calcoli, e
 * un grafico e' un calcolo. Resta visibile nell'elenco sotto, attenuata.
 */
export function ExerciseChart({
  points,
  metricType,
  selectedEntryId,
}: {
  points: readonly HistoryPoint[];
  metricType: MetricType;
  /** Voce scelta nello storico: viene marcata sul grafico. */
  selectedEntryId: string | null;
}) {
  const { t, language } = useTranslation();
  const { chartKind } = metricConfig(metricType);

  const data: ChartPoint[] = points.map((point) => ({
    entryId: point.entry.id,
    label: formatAxisDate(language, point.date),
    full:
      formatDate(language, point.date) +
      (point.originalDate
        ? ` (${t('dashboard.originalDate', { date: point.originalDate })})`
        : ''),
    value: point.entry.metricValue ?? 0,
    weight: point.entry.addedWeightKg,
    display: formatMetricValue(t, metricType, point.entry.metricValue),
    scheme: point.entry.scheme,
    variant: point.entry.variant,
    notes: point.entry.notes,
  }));

  const withWeight = chartKind === 'bars-plus-weight-line';
  const labelById = new Map(data.map((point) => [point.entryId, point.label]));
  const selected = data.find((point) => point.entryId === selectedEntryId) ?? null;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          {/* L'asse X e' indicizzato sull'id della voce, non sulla data
              formattata: "13/10" si ripete di anno in anno, e due punti con la
              stessa etichetta si sovrapporrebbero. L'etichetta la mette il
              tickFormatter, e cosi' anche l'evidenziazione ha un bersaglio
              univoco su cui puntare. */}
          <XAxis
            dataKey="entryId"
            tick={{ fill: AXIS_TEXT, fontSize: 10 }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
            tickFormatter={(entryId: string) => labelById.get(entryId) ?? ''}
          />
          <YAxis
            yAxisId="value"
            tick={{ fill: AXIS_TEXT, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) => formatMetricTick(metricType, value)}
            // Per un tempo lo zero non dice niente: si guarda l'intervallo reale.
            domain={metricConfig(metricType).higherIsBetter ? [0, 'auto'] : ['auto', 'auto']}
          />
          {withWeight && (
            <YAxis
              yAxisId="weight"
              orientation="right"
              width={28}
              tick={{ fill: SKY, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
          )}
          <Tooltip
            content={<ChartTooltip showWeight={withWeight} />}
            cursor={{ fill: '#33415555' }}
          />
          {withWeight ? (
            <Bar yAxisId="value" dataKey="value" fill={AMBER} radius={[3, 3, 0, 0]} maxBarSize={18} />
          ) : (
            <Line
              yAxisId="value"
              dataKey="value"
              stroke={AMBER}
              strokeWidth={2}
              dot={{ r: 3, fill: AMBER, stroke: '#0f172a', strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          )}
          {withWeight && (
            <Line
              yAxisId="weight"
              dataKey="weight"
              stroke={SKY}
              strokeWidth={2}
              connectNulls
              dot={{ r: 2.5, fill: SKY }}
            />
          )}
          {selected && (
            <ReferenceLine
              yAxisId="value"
              x={selected.entryId}
              stroke={AXIS_TEXT}
              strokeDasharray="3 3"
            />
          )}
          {selected && (
            <ReferenceDot
              yAxisId="value"
              x={selected.entryId}
              y={selected.value}
              r={6}
              fill="#f8fafc"
              stroke={AMBER}
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-slate-500">{metricCaption(t, metricType)}</p>
    </div>
  );
}
