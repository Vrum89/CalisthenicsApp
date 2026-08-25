import { Minus, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Numero con due bottoni grandi e un campo scrivibile.
 *
 * I bottoni servono al caso vero: mani sudate, schermo da 360 px, si aggiusta di
 * uno. Il campo al centro resta editabile perche' passare da 0 a 42 a colpi di
 * `+` sarebbe una punizione — ma non e' un `type="number"`: la tastiera italiana
 * propone la virgola e un campo numerico la scarterebbe invece di convertirla
 * (stessa ragione del campo peso in §5.7).
 */
export function NumberStepper({
  value,
  onChange,
  label,
  unit,
  step = 1,
  min = 0,
  max = 9999,
  placeholder,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Etichetta accessibile: il campo non ne ha una visibile accanto. */
  label: string;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const { t } = useTranslation();

  const clamp = (next: number): number => Math.min(max, Math.max(min, next));
  const nudge = (delta: number) => {
    onChange(clamp(Number(((value ?? 0) + delta).toFixed(2))));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={t('log.decrease', { label })}
        onClick={() => {
          nudge(-step);
        }}
        disabled={(value ?? 0) <= min}
        className="tap-target flex shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
      >
        <Minus aria-hidden className="size-5" />
      </button>

      {/* `gap-2` e non meno: l'anello di focus del campo esce di 4 px e con uno
          spazio piu' stretto ci finirebbe sopra all'unita'. */}
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={label}
          placeholder={placeholder}
          value={value === null ? '' : String(value)}
          onChange={(event) => {
            const raw = event.target.value.replace(',', '.').trim();
            if (raw === '') {
              onChange(null);
              return;
            }
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) onChange(clamp(parsed));
          }}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-center text-xl font-semibold text-slate-100 tabular-nums placeholder:text-slate-600"
        />
        {unit !== undefined && unit !== '' && (
          <span className="shrink-0 text-sm text-slate-500">{unit}</span>
        )}
      </div>

      <button
        type="button"
        aria-label={t('log.increase', { label })}
        onClick={() => {
          nudge(step);
        }}
        disabled={(value ?? 0) >= max}
        className="tap-target flex shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
      >
        <Plus aria-hidden className="size-5" />
      </button>
    </div>
  );
}
