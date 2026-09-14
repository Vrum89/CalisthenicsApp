import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { formatCompactDate, todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Workout date: both the label and the calendar are ours.
 *
 * A bare `<input type="date">` was wrong for two reasons. It writes the date in
 * the BROWSER's locale, not the one chosen in the app: in Italian it could read
 * `08/25/2026`, which everywhere else in the diary means another day. And it is
 * wide: on the cover display it took half the header for a field that is
 * touched once in a while.
 *
 * That left the system calendar, which is excellent on the unfolded phone. On
 * the cover display (~360x360) it gets cut off though: it shows two weeks and
 * the rest of the month is unreachable (see `DatePicker`). And the cover is
 * precisely the surface where logging happens (spec §2.5), so the calendar is
 * ours now — the same on both surfaces, which is one less thing to think about.
 */
export function WorkoutDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const { t, language } = useTranslation();
  const [picking, setPicking] = useState(false);
  const today = todayIso();
  const label = value === today ? t('log.today') : formatCompactDate(language, value);

  return (
    <>
      <button
        type="button"
        aria-label={t('log.date')}
        aria-haspopup="dialog"
        onClick={() => {
          setPicking(true);
        }}
        className="tap-target flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 tabular-nums"
      >
        <CalendarDays aria-hidden className="size-4 shrink-0 text-slate-500" />
        {label}
      </button>

      {picking && (
        <DatePicker
          value={value}
          max={today}
          onPick={(iso) => {
            onChange(iso);
            setPicking(false);
          }}
          onClose={() => {
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
