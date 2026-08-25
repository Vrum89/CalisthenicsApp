import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppError, describeError } from '@/lib/errors';
import { formatAxisDate, formatCompactDate, formatDate, todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/features/auth/useAuth';
import { addBodyWeight } from '@/features/bodyWeight/bodyWeightRepository';
import { useBodyWeights } from '@/features/bodyWeight/useBodyWeights';

const AMBER = '#fbbf24';
const MIN_KG = 20;
const MAX_KG = 400;

interface WeightPoint {
  label: string;
  full: string;
  weight: number;
  notes: string | null;
}

function WeightTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: WeightPoint }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="max-w-56 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
      <div className="text-slate-400">{point.full}</div>
      <div className="font-semibold text-amber-400 tabular-nums">{point.weight} kg</div>
      {point.notes && <div className="mt-0.5 text-slate-500">{point.notes}</div>}
    </div>
  );
}

/**
 * Registro pesate (spec §5.7): input minimo e indipendente dagli allenamenti,
 * piu' il grafico di andamento (§6).
 *
 * Il nudge a inizio programma previsto dallo spec arrivera' con la creazione
 * delle schede (M7): prima non c'e' un momento a cui agganciarlo.
 */
export function BodyWeightPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const query = useBodyWeights();

  const [weight, setWeight] = useState('');
  const [measuredOn, setMeasuredOn] = useState(todayIso);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = Number(weight.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < MIN_KG || parsed > MAX_KG) {
      setError(new AppError('bodyWeight.invalid', `Weight out of range: ${weight}`));
      return;
    }
    if (measuredOn > todayIso()) {
      setError(new AppError('bodyWeight.futureDate', `Future date: ${measuredOn}`));
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await addBodyWeight({
        userId: user.id,
        measuredOn,
        weightKg: parsed,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      setWeight('');
      setNotes('');
      setSaved(true);
      query.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  }

  const entries = query.data;
  const chartData: WeightPoint[] = entries.map((entry) => ({
    label: formatAxisDate(language, entry.measuredOn),
    full: formatDate(language, entry.measuredOn),
    weight: entry.weightKg,
    notes: entry.notes,
  }));

  return (
    <AppShell>
      <header className="flex items-center gap-2 py-4">
        <Link
          to="/"
          aria-label={t('nav.back')}
          className="tap-target -ml-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {t('bodyWeight.title')}
        </h1>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 space-y-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label
                htmlFor="weight"
                className="block text-xs tracking-wider text-slate-500 uppercase"
              >
                {t('bodyWeight.weight')}
              </label>
              <div className="flex items-center gap-2">
                {/* `text` e non `number`: la tastiera italiana propone la
                    virgola, e un campo numerico la rifiuterebbe invece di
                    convertirla. `inputMode="decimal"` tiene comunque il
                    tastierino numerico sul telefono, e il controllo di
                    intervallo lo fa handleSubmit con un messaggio tradotto. */}
                <input
                  id="weight"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={weight}
                  onChange={(event) => {
                    setWeight(event.target.value);
                  }}
                  className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
                />
                <span className="shrink-0 text-sm text-slate-500">kg</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <label
                htmlFor="measuredOn"
                className="block text-xs tracking-wider text-slate-500 uppercase"
              >
                {t('bodyWeight.date')}
              </label>
              <input
                id="measuredOn"
                type="date"
                required
                max={todayIso()}
                value={measuredOn}
                onChange={(event) => {
                  setMeasuredOn(event.target.value);
                }}
                className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="block text-xs tracking-wider text-slate-500 uppercase">
              {t('bodyWeight.note')}
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              placeholder={t('bodyWeight.notePlaceholder')}
              onChange={(event) => {
                setNotes(event.target.value);
              }}
              className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-600"
            />
          </div>

          {error !== null && (
            <p role="alert" className="text-sm leading-relaxed text-red-400">
              {describeError(error, t)}
            </p>
          )}
          {saved && <p className="text-sm text-emerald-400">{t('bodyWeight.saved')}</p>}

          <button
            type="submit"
            disabled={saving || weight.trim().length === 0}
            className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            {saving ? t('bodyWeight.saving') : t('bodyWeight.save')}
          </button>
        </form>

        {query.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            {t('bodyWeight.loading')}
          </p>
        )}

        {query.status === 'error' && (
          <p className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span role="alert">{describeError(query.error, t)}</span>
          </p>
        )}

        {query.status === 'ready' && entries.length === 0 && (
          <p className="text-sm leading-relaxed text-slate-400">{t('bodyWeight.empty')}</p>
        )}

        {entries.length >= 2 && (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  // Il peso corporeo si muove di pochi chili: partire da zero
                  // schiaccerebbe la linea fino a renderla piatta.
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<WeightTooltip />} />
                <Line
                  dataKey="weight"
                  stroke={AMBER}
                  strokeWidth={2}
                  dot={{ r: 3, fill: AMBER, stroke: '#0f172a', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-center text-xs text-slate-500">
              {t('bodyWeight.chartCaption')}
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">{t('bodyWeight.history')}</h2>
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
              {[...entries].reverse().map((entry) => (
                <li key={entry.id} className="flex items-baseline gap-3 px-3 py-2.5">
                  <span className="text-sm text-slate-400 tabular-nums">
                    {formatCompactDate(language, entry.measuredOn)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                    {entry.notes}
                  </span>
                  <span className="shrink-0 text-base font-semibold text-slate-100 tabular-nums">
                    {entry.weightKg} kg
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
