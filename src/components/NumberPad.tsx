import { useEffect, useState } from 'react';
import { Delete, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * The app's own number pad, in place of the system keyboard.
 *
 * Why: on the Razr cover display (~360x360) there is no room left above the
 * keyboard, so Android switches the IME to fullscreen (`extract`) mode — it
 * takes the whole screen and draws its own replacement text field. The exercise
 * being logged disappears and you type blind, on the very surface where logging
 * happens (spec §2.5). That mode is chosen by the system and cannot be turned
 * off from the web: `flagNoExtractUi` is for native apps.
 *
 * So the numbers are typed here instead: the page keeps drawing, the keys are
 * 44 px like everything else, and the behaviour is identical on both surfaces.
 * Same reasoning as the calendar in `DatePicker`.
 */
export function NumberPad({
  value,
  label,
  unit,
  min = 0,
  max = 9999,
  decimals = false,
  onConfirm,
  onClose,
}: {
  value: number | null;
  /** What is being typed ("Reps", "Added weight"): the pad has no other context. */
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  /** A comma key, for the fields that take halves — added weight. */
  decimals?: boolean;
  onConfirm: (value: number | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState(value === null ? '' : String(value));

  /**
   * What the typed text is worth, clamped. An empty pad means "no value", the
   * same as clearing the field — for reps the caller reads it as zero.
   */
  function parsed(): number | null {
    const raw = typed.replace(',', '.');
    if (raw === '' || raw === '.') return null;
    const result = Number(raw);
    if (!Number.isFinite(result)) return null;
    return Math.min(max, Math.max(min, result));
  }

  function press(key: string) {
    setTyped((current) => {
      if (key === 'backspace') return current.slice(0, -1);
      if (key === ',')
        return current.includes(',') ? current : `${current === '' ? '0' : current},`;
      // A leading zero is never what someone means: typing 1 after it gives 1.
      const next = current === '0' ? key : current + key;
      return next.length > 6 ? current : next;
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'Enter') onConfirm(parsed());
      else if (event.key === 'Backspace') press('backspace');
      else if (/^[0-9]$/.test(event.key)) press(event.key);
      else if (decimals && (event.key === ',' || event.key === '.')) press(',');
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals ? ',' : '', '0', 'backspace'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      /* A panel at the bottom, not a full screen: on the main display the keys
         would stretch to the height of the phone, and down here they fall under
         the thumb (spec §2.5). The exercise stays visible behind it. */
      className="px-safe fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70"
    >
      {/* Three bands, as in the calendar: label and commands never move, and
          the only thing that scrolls is the keys — on a 360x300 window (cover
          plus system bar) "Done" stays under the thumb instead of below the
          edge. */}
      <div className="pb-safe mx-auto flex max-h-dvh w-full max-w-md flex-col gap-2 rounded-t-2xl border-t border-slate-700 bg-slate-950 px-3 py-2">
        {/* Label and value on one line: two separate rows cost 40 px, which on
              a 360 px screen is the difference between fitting and scrolling. */}
        <header className="flex shrink-0 items-baseline gap-2 border-b border-slate-800 pb-2">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{label}</span>
          <span aria-live="polite" className="text-2xl font-semibold text-slate-100 tabular-nums">
            {typed === '' ? <span className="text-slate-600">0</span> : typed}
          </span>
          {unit !== undefined && unit !== '' && (
            <span className="shrink-0 text-sm text-slate-500">{unit}</span>
          )}
          <button
            type="button"
            aria-label={t('number.close')}
            onClick={onClose}
            className="tap-target -mr-2 flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="grid min-h-0 auto-rows-[minmax(2.75rem,3.25rem)] grid-cols-3 gap-1.5 overflow-y-auto">
          {keys.map((key, index) =>
            key === '' ? (
              // The gap where the comma would be: its key must not collide
              // with the digit that happens to sit at the same position.
              <span key={`gap-${String(index)}`} />
            ) : (
              <button
                key={key}
                type="button"
                aria-label={key === 'backspace' ? t('number.backspace') : key}
                onClick={() => {
                  press(key);
                }}
                className="tap-target flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-2xl font-semibold text-slate-100 tabular-nums active:bg-slate-800"
              >
                {key === 'backspace' ? <Delete aria-hidden className="size-6" /> : key}
              </button>
            ),
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setTyped('');
            }}
            className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-300"
          >
            {t('number.clear')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(parsed());
            }}
            className="tap-target flex-[2] rounded-xl bg-amber-500 px-3 text-base font-semibold text-slate-950"
          >
            {t('number.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
