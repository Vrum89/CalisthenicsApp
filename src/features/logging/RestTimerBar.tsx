import { X } from 'lucide-react';
import { formatMetricValue } from '@/domain/metrics';
import { REST_PRESETS, type RestTimer } from '@/features/logging/useRestTimer';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Barra del rest timer (spec §5.5).
 *
 * Sta in fondo allo schermo e compare solo mentre il riposo scorre: sul cover
 * display ~360x360 ogni riga permanente e' spazio tolto all'esercizio in focus.
 *
 * Non blocca niente. Si puo' spuntare la serie successiva prima o dopo lo zero;
 * superato lo zero il conteggio prosegue in su, con il segno `+`, per dire
 * quanto si e' riposato in piu' senza trasformarlo in un rimprovero.
 */
export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const { t } = useTranslation();
  if (!timer.running) return null;

  const overtime = timer.remaining <= 0;
  const display = formatMetricValue(t, 'time', Math.abs(timer.remaining));

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-slate-700 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2">
        <div className="min-w-0">
          <p className="text-xs tracking-wider text-slate-500 uppercase">
            {overtime ? t('log.rest.overtime') : t('log.rest.title')}
          </p>
          <p
            role="timer"
            aria-live="off"
            className={`text-2xl font-semibold tabular-nums ${
              overtime ? 'text-emerald-400' : 'text-slate-100'
            }`}
          >
            {overtime ? '+' : ''}
            {display}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 gap-1">
          {REST_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={timer.duration === preset}
              onClick={() => {
                timer.setDuration(preset);
              }}
              className={`tap-target rounded-lg px-2 text-sm font-medium tabular-nums ${
                timer.duration === preset
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {formatMetricValue(t, 'time', preset)}
            </button>
          ))}
          <button
            type="button"
            aria-label={t('log.rest.skip')}
            onClick={timer.stop}
            className="tap-target flex items-center justify-center rounded-lg px-2 text-slate-400 hover:text-slate-200"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
