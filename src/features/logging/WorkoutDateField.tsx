import { CalendarDays } from 'lucide-react';
import { formatCompactDate, todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Data dell'allenamento: etichetta nostra, calendario del sistema.
 *
 * Un `<input type="date">` nudo non va bene qui per due motivi. Scrive la data
 * nel formato della lingua del BROWSER, non in quella scelta nell'app: in
 * italiano poteva uscire `08/25/2026`, che nel resto del diario significa un
 * altro giorno. Ed e' largo: sul cover display si prendeva mezza intestazione
 * per un campo che si tocca una volta ogni tanto.
 *
 * Quindi il testo lo scriviamo noi con `formatCompactDate` (o "oggi", che e' il
 * caso normale) e l'input resta sopra, trasparente: il tocco apre comunque il
 * calendario nativo, che sul telefono e' molto meglio di qualunque cosa
 * potremmo disegnare.
 */
export function WorkoutDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const { t, language } = useTranslation();
  const today = todayIso();
  const label = value === today ? t('log.today') : formatCompactDate(language, value);

  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="date"
        aria-label={t('log.date')}
        required
        max={today}
        value={value}
        onChange={(event) => {
          // Svuotare il campo dal calendario nativo e' possibile: una data
          // vuota non e' un allenamento, si torna a oggi.
          onChange(event.target.value === '' ? today : event.target.value);
        }}
        className="peer absolute inset-0 size-full opacity-0"
      />
      <span
        aria-hidden
        className="tap-target pointer-events-none flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 tabular-nums peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-400"
      >
        <CalendarDays className="size-4 shrink-0 text-slate-500" />
        {label}
      </span>
    </span>
  );
}
