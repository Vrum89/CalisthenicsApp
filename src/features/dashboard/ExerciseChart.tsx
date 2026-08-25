import {
  Bar,
  CartesianGrid,
  Cell,
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
import { NO_VARIANT, variantLabel, type VariantGroup } from '@/domain/variants';
import { formatAxisDate, formatDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  MAX_COLOURED_VARIANTS,
  SINGLE_SERIES_COLOR,
  variantColor,
} from '@/features/dashboard/variantPalette';

const SKY = '#38bdf8';
const GRID = '#334155';
const AXIS_TEXT = '#94a3b8';
const SURFACE = '#0f172a';

interface ChartPoint {
  entryId: string;
  label: string;
  full: string;
  value: number;
  /** Colore gia' risolto, ripiegamento incluso: il tooltip non ricalcola. */
  variantColorHex: string;
  variant: string | null;
  weight: number | null;
  display: string;
  scheme: string | null;
  notes: string | null;
  /** Una serie per variante: solo quella della voce è valorizzata. */
  [seriesKey: `series${number}`]: number | null;
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
  // Con una serie per variante, la prima voce del payload può essere quella
  // vuota: si prende la prima che porta davvero un punto.
  const point = payload?.find((item) => item.payload !== undefined)?.payload;
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
      {point.variant !== null && point.variant !== NO_VARIANT && (
        <div className="flex items-center gap-1.5 text-slate-300">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: point.variantColorHex }}
          />
          {point.variant}
        </div>
      )}
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
 *
 * Quando l'esercizio ha piu' condizioni e non ne e' filtrata una, ogni
 * condizione prende un colore e una linea sua: unire con un'unica linea
 * sessioni fatte con assistenza diversa disegnerebbe una progressione che non
 * e' mai esistita.
 */
export function ExerciseChart({
  points,
  metricType,
  selectedEntryId,
  variants,
  selectedVariant,
}: {
  points: readonly HistoryPoint[];
  metricType: MetricType;
  selectedEntryId: string | null;
  /** Tutte le condizioni dell'esercizio, in ordine stabile. */
  variants: readonly VariantGroup[];
  /** `null` = nessun filtro. */
  selectedVariant: string | null;
}) {
  const { t, language } = useTranslation();
  const { chartKind } = metricConfig(metricType);
  const withWeight = chartKind === 'bars-plus-weight-line';

  const indexOfVariant = new Map(variants.map((group, index) => [group.variant, index]));

  /**
   * Oltre il limite di colori distinguibili le varianti confluiscono in una
   * serie sola, grigia. Dare a due condizioni lo stesso colore ma linee diverse
   * direbbe che sono distinte mostrandole identiche: meglio dichiararle "altre"
   * e lasciare che siano i chip a isolarle una per una.
   */
  const seriesIndex = (variantIndex: number): number =>
    Math.min(variantIndex, MAX_COLOURED_VARIANTS);
  const seriesCount = Math.min(variants.length, MAX_COLOURED_VARIANTS + 1);
  const overflowCount = variants.length - MAX_COLOURED_VARIANTS;
  // Colori solo quando c'e' davvero piu' di una condizione e nessuna e' scelta:
  // con una serie sola una legenda non aggiungerebbe niente.
  const coloured = variants.length > 1 && selectedVariant === null;

  const seriesColor = (variantIndex: number): string =>
    variants.length > 1 ? variantColor(seriesIndex(variantIndex)) : SINGLE_SERIES_COLOR;

  const data: ChartPoint[] = points.map((point) => {
    const variant = point.entry.variant ?? NO_VARIANT;
    const variantIndex = indexOfVariant.get(variant) ?? 0;
    const value = point.entry.metricValue ?? 0;

    const perVariant: Record<string, number | null> = {};
    if (coloured) {
      const series = seriesIndex(variantIndex);
      for (let i = 0; i < seriesCount; i += 1) {
        perVariant[`series${String(i)}`] = i === series ? value : null;
      }
    }

    return {
      entryId: point.entry.id,
      label: formatAxisDate(language, point.date),
      full:
        formatDate(language, point.date) +
        (point.originalDate
          ? ` (${t('dashboard.originalDate', { date: point.originalDate })})`
          : ''),
      value,
      variantColorHex: seriesColor(variantIndex),
      variant: point.entry.variant,
      weight: point.entry.addedWeightKg,
      display: formatMetricValue(t, metricType, point.entry.metricValue),
      scheme: point.entry.scheme,
      notes: point.entry.notes,
      ...perVariant,
    };
  });

  const labelById = new Map(data.map((point) => [point.entryId, point.label]));
  const selected = data.find((point) => point.entryId === selectedEntryId) ?? null;
  const singleColor = seriesColor(
    selectedVariant === null ? 0 : (indexOfVariant.get(selectedVariant) ?? 0),
  );

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
            <Bar yAxisId="value" dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={18}>
              {data.map((point) => (
                <Cell key={point.entryId} fill={point.variantColorHex} />
              ))}
            </Bar>
          ) : coloured ? (
            Array.from({ length: seriesCount }, (_, index) => (
              <Line
                key={index}
                yAxisId="value"
                dataKey={`series${String(index)}`}
                stroke={variantColor(index)}
                strokeWidth={2}
                connectNulls
                dot={{ r: 4, fill: variantColor(index), stroke: SURFACE, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))
          ) : (
            <Line
              yAxisId="value"
              dataKey="value"
              stroke={singleColor}
              strokeWidth={2}
              dot={{ r: 4, fill: singleColor, stroke: SURFACE, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
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
              stroke={selected.variantColorHex}
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {coloured && (
        <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {variants.slice(0, MAX_COLOURED_VARIANTS).map((group, index) => (
            <li key={group.variant} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: variantColor(index) }}
              />
              {variantLabel(t, group.variant)}
            </li>
          ))}
          {overflowCount > 0 && (
            <li className="flex items-center gap-1.5 text-xs text-slate-300">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: variantColor(MAX_COLOURED_VARIANTS) }}
              />
              {t('dashboard.variantOther', { count: overflowCount })}
            </li>
          )}
        </ul>
      )}

      <p className="mt-2 text-center text-xs text-slate-500">{metricCaption(t, metricType)}</p>
    </div>
  );
}
