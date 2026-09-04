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
 * Il calendario dell'app, al posto di quello di sistema.
 *
 * Motivo: sul cover display del Razr 50 (~360x360) il dialog nativo di Android
 * cambia impaginazione — intestazione a sinistra, come se fosse un telefono in
 * orizzontale — e la griglia del mese resta alta due righe, tagliata in basso e
 * senza scorrimento. Dal 15 in poi il mese non e' raggiungibile. Quel dialog lo
 * disegna il browser fuori dalla pagina: nessun CSS, attributo o viewport
 * nostro puo' rimpicciolirlo, quindi l'unica via e' non usarlo.
 *
 * Qui invece le settimane sono solo quelle che il mese occupa, il pannello
 * scorre se non ci sta, e le caselle restano da 44 px come tutto il resto.
 */
export function DatePicker({
  value,
  max,
  onPick,
  onClose,
}: {
  value: string;
  /** Ultima data scegliibile, ISO. Un allenamento non si registra in anticipo. */
  max?: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const { t, language } = useTranslation();
  const today = todayIso();
  const selected = isoParts(value) ?? isoParts(today);

  // Il mese mostrato: si parte da quello della data scelta e si sfoglia.
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
      /* `h-dvh` e non `inset-0`: su Android l'altezza del viewport cambia con
         la barra di sistema, e un pannello alto quanto la finestra "teorica"
         finisce sotto quella barra — il fondo si vede tagliato. L'unita'
         dinamica misura lo spazio che c'e' davvero, adesso. */
      className="px-safe pt-safe pb-safe fixed top-0 left-0 z-40 flex h-dvh w-full justify-center bg-slate-950"
    >
      {/* Tre fasce: intestazione e scorciatoie restano sempre a schermo, e a
          cedere e' solo la griglia, che scorre. Su 360x360 e' cio' che tiene i
          pulsanti raggiungibili anche quando il mese occupa sei settimane. */}
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

        {/* `min-h-0` insieme a `flex-1`: senza, un figlio flex non si lascia
            rimpicciolire sotto il proprio contenuto e lo scroll non parte. */}
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

        {/* Le due scelte che coprono quasi tutti i casi: si registra l'allenamento
            appena fatto, o quello di ieri sera che ci si e' dimenticati. */}
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
        </div>
      </div>
    </div>
  );
}
