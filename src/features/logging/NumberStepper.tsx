import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { NumberPad } from '@/components/NumberPad';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * A number with two big buttons and a tappable value.
 *
 * The buttons serve the real case: sweaty hands, a 360 px screen, one more or
 * one less. The value in the middle opens our own number pad, because going
 * from 0 to 42 one `+` at a time would be a punishment.
 *
 * It used to be a text field, and on the cover display that was a trap: with no
 * room above the keyboard, Android switches the IME to fullscreen mode and
 * hides the page behind its own text box — you type the reps without seeing the
 * exercise. The pad (`NumberPad`) keeps everything on screen and behaves the
 * same on both surfaces.
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
  const [typing, setTyping] = useState(false);

  // Halves only where the field takes them (added weight, step 2.5): on reps a
  // comma key would just be one more way to write something meaningless.
  const decimals = !Number.isInteger(step);

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
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            setTyping(true);
          }}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-center text-xl font-semibold text-slate-100 tabular-nums"
        >
          {value === null ? <span className="text-slate-600">{placeholder ?? ''}</span> : value}
        </button>
        {unit !== undefined && unit !== '' && (
          <span className="shrink-0 text-sm text-slate-500">{unit}</span>
        )}
      </div>

      {typing && (
        <NumberPad
          value={value}
          label={label}
          {...(unit === undefined ? {} : { unit })}
          min={min}
          max={max}
          decimals={decimals}
          onConfirm={(next) => {
            onChange(next);
            setTyping(false);
          }}
          onClose={() => {
            setTyping(false);
          }}
        />
      )}

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
