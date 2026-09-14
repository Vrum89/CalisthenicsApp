import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatDate,
  formatMonth,
  isoFrom,
  isoParts,
  monthWeeks,
  shiftIso,
  todayIso,
  weekdayInitials,
} from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * The app's own calendar, in place of the system one.
 *
 * Why: on the Razr 50 cover display (~360x360) Android's native dialog switches
 * layout — header on the left, as if the phone were held sideways — and the
 * month grid is left two rows tall, cut off at the bottom and unscrollable.
 * From the 15th onwards the month is unreachable. That dialog is drawn by the
 * browser outside the page: no CSS, attribute or viewport of ours can shrink
 * it, so the only way out is not to use it.
 *
 * Here instead only the weeks the month spans are drawn, the panel scrolls when
 * it does not fit, and the cells stay 44 px like everything else.
 */
export function DatePicker({
  value,
  max,
  onPick,
  onClear,
  onClose,
}: {
  value: string;
  /** Last selectable date, ISO. A workout is never logged in advance. */
  max?: string;
  onPick: (iso: string) => void;
  /** When present, the date can also be cleared: a program with no end is open. */
  onClear?: () => void;
  onClose: () => void;
}) {
  const { t, language } = useTranslation();
  const today = todayIso();
  const selected = isoParts(value) ?? isoParts(today);

  // The month on screen: it starts from the selected date and is paged from there.
  const [cursor, setCursor] = useState(() => ({
    year: selected?.year ?? new Date().getFullYear(),
    month: selected?.month ?? new Date().getMonth(),
  }));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const weeks = monthWeeks(cursor.year, cursor.month);
  const initials = weekdayInitials(language);

  function shiftMonth(delta: -1 | 1) {
    const shifted = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: shifted.getFullYear(), month: shifted.getMonth() });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('date.title')}
      /* `h-dvh` rather than `inset-0`: on Android the viewport height changes
         with the system bar, and a panel as tall as the "theoretical" window
         ends up underneath it — the bottom looks cut off. The dynamic unit
         measures the space that is actually there, right now. */
      className="px-safe pt-safe pb-safe fixed top-0 left-0 z-40 flex h-dvh w-full justify-center bg-slate-950"
    >
      {/* Three bands: header and shortcuts always stay on screen, and the only
          one to give way is the grid, which scrolls. On 360x360 that is what
          keeps the buttons reachable even when the month spans six weeks. */}
      <div className="flex h-full w-full max-w-md flex-col px-3 py-2">
        <header className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={t('date.previousMonth')}
            onClick={() => {
              shiftMonth(-1);
            }}
            className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>

          <h2 aria-live="polite" className="min-w-0 flex-1 truncate text-center text-base font-semibold">
            {formatMonth(language, cursor.year, cursor.month)}
          </h2>

          <button
            type="button"
            aria-label={t('date.nextMonth')}
            onClick={() => {
              shiftMonth(1);
            }}
            className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>

          <button
            type="button"
            aria-label={t('date.close')}
            onClick={onClose}
            className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-100"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div aria-hidden className="grid shrink-0 grid-cols-7 pt-1 pb-0.5">
          {initials.map((initial, index) => (
            <span key={index} className="text-center text-[0.7rem] text-slate-500 uppercase">
              {initial}
            </span>
          ))}
        </div>

        {/* `min-h-0` together with `flex-1`: without it a flex child refuses to
            shrink below its content, and the scrolling never starts. */}
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-7 gap-0.5 overflow-y-auto">
          {weeks.flat().map((day, index) => {
            if (day === null) return <span key={index} />;

            const iso = isoFrom(cursor.year, cursor.month, day);
            const isSelected = iso === value;
            const isToday = iso === today;
            const disabled = max !== undefined && iso > max;

            return (
              <button
                key={index}
                type="button"
                disabled={disabled}
                aria-label={formatDate(language, iso)}
                aria-pressed={isSelected}
                onClick={() => {
                  onPick(iso);
                }}
                className={`tap-target flex items-center justify-center rounded-lg text-base tabular-nums disabled:text-slate-700 ${
                  isSelected
                    ? 'bg-amber-500 font-semibold text-slate-950'
                    : isToday
                      ? 'border border-amber-500/60 text-amber-300'
                      : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* The two choices covering almost every case: logging the workout just
            finished, or last night's one you forgot about. */}
        <div className="flex shrink-0 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onPick(today);
            }}
            className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-200 hover:bg-slate-900"
          >
            {t('date.today')}
          </button>
          <button
            type="button"
            onClick={() => {
              onPick(shiftIso(today, -1));
            }}
            className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-200 hover:bg-slate-900"
          >
            {t('date.yesterday')}
          </button>
          {onClear !== undefined && (
            <button
              type="button"
              onClick={onClear}
              className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-400 hover:bg-slate-900"
            >
              {t('date.clear')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
