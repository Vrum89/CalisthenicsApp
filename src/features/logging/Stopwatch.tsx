import { useEffect, useState } from 'react';
import { Pause, Pencil, Play, RotateCcw } from 'lucide-react';
import { formatMetricValue } from '@/domain/metrics';
import { NumberStepper } from '@/features/logging/NumberStepper';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Cronometro del circuito (spec §5.4, metrica `time`).
 *
 * Conta in su e il suo risultato e' un dato salvato: e' l'opposto del rest timer
 * (§5.5), che conta alla rovescia e non si registra. Esiste per togliere di
 * mezzo la trascrizione a mano del tempo, che nello storico e' stata la
 * principale fonte di errori.
 *
 * Il tempo si misura fra due istanti, non sommando i tick: con lo schermo
 * spento gli intervalli rallentano e un circuito da otto minuti ne segnerebbe
 * sei.
 *
 * L'inserimento manuale resta possibile — dimenticarsi di far partire il
 * cronometro capita, e in quel caso l'alternativa sarebbe perdere la sessione.
 */
export function Stopwatch({
  seconds,
  onChange,
}: {
  seconds: number | null;
  onChange: (seconds: number | null) => void;
}) {
  const { t } = useTranslation();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [manual, setManual] = useState(false);

  const base = seconds ?? 0;
  const running = startedAt !== null;
  const elapsed = running ? base + Math.floor((now - startedAt) / 1000) : base;

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      window.clearInterval(id);
    };
  }, [startedAt]);

  function start() {
    setNow(Date.now());
    setStartedAt(Date.now());
  }

  function stop() {
    setStartedAt(null);
    onChange(elapsed);
  }

  return (
    <div className="space-y-3">
      <p
        aria-live="off"
        className="text-center text-4xl font-semibold text-amber-400 tabular-nums"
      >
        {formatMetricValue(t, 'time', elapsed)}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={running ? stop : start}
          className={`tap-target flex flex-1 items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold ${
            running
              ? 'border border-slate-600 bg-slate-800 text-slate-100'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
          }`}
        >
          {running ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
          {running ? t('log.stopwatch.stop') : t('log.stopwatch.start')}
        </button>

        <button
          type="button"
          aria-label={t('log.stopwatch.reset')}
          onClick={() => {
            setStartedAt(null);
            onChange(null);
          }}
          className="tap-target flex shrink-0 items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-400 hover:text-slate-200"
        >
          <RotateCcw aria-hidden className="size-5" />
        </button>

        <button
          type="button"
          aria-label={t('log.stopwatch.manual')}
          aria-pressed={manual}
          onClick={() => {
            setManual((open) => !open);
          }}
          className="tap-target flex shrink-0 items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-400 hover:text-slate-200"
        >
          <Pencil aria-hidden className="size-5" />
        </button>
      </div>

      {manual && (
        <div className="flex gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <div className="min-w-0 flex-1">
            <NumberStepper
              value={Math.floor(elapsed / 60)}
              label={t('log.minutesLabel')}
              unit={t('metric.unit.minutes')}
              max={600}
              onChange={(minutes) => {
                setStartedAt(null);
                onChange((minutes ?? 0) * 60 + (elapsed % 60));
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <NumberStepper
              value={elapsed % 60}
              label={t('log.secondsLabel')}
              unit={t('metric.unit.seconds')}
              step={5}
              max={59}
              onChange={(value) => {
                setStartedAt(null);
                onChange(Math.floor(elapsed / 60) * 60 + (value ?? 0));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
