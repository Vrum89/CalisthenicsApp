import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { formatCompactDate, todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Data dell'allenamento: etichetta e calendario, tutti e due nostri.
 *
 * Un `<input type="date">` nudo non andava bene per due motivi. Scrive la data
 * nel formato della lingua del BROWSER, non in quella scelta nell'app: in
 * italiano poteva uscire `08/25/2026`, che nel resto del diario significa un
 * altro giorno. Ed e' largo: sul cover display si prendeva mezza intestazione
 * per un campo che si tocca una volta ogni tanto.
 *
 * Restava il calendario di sistema, che sul telefono aperto e' ottimo. Sul
 * cover display (~360x360) pero' si taglia: mostra due settimane e il resto del
 * mese non si raggiunge (vedi `DatePicker`). E il cover e' proprio la superficie
 * dove si registra (spec §2.5), quindi il calendario ora e' il nostro — uguale
 * sulle due superfici, che e' anche un pensiero in meno.
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
