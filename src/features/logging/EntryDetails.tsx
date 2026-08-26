import { ChevronRight } from 'lucide-react';
import type { DraftEntry } from '@/features/logging/draft';
import { NumberStepper } from '@/features/logging/NumberStepper';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Zavorra, condizione e note di una voce, in un blocco richiudibile.
 *
 * Sta in un componente suo perche' serve identico in due posti: l'esercizio in
 * focus e ciascun esercizio dentro un superset. Un esercizio agganciato non deve
 * perdere niente per il fatto di essere agganciato — sganciarlo per cambiare la
 * zavorra e poi riagganciarlo sarebbe assurdo.
 *
 * Richiudibile e non sempre aperto: durante l'allenamento si tocca una volta e
 * poi si spuntano serie per venti minuti, e sul cover display quello spazio e'
 * lo spazio delle caselle.
 */
export function EntryDetails({
  entry,
  variants,
  summary,
  onChange,
}: {
  entry: DraftEntry;
  /** Condizioni gia' usate per questo esercizio, da proporre nel campo. */
  variants: readonly string[];
  /** Etichetta del sommario: dentro un superset e' il nome dell'esercizio. */
  summary?: string;
  onChange: (change: (entry: DraftEntry) => DraftEntry) => void;
}) {
  const { t } = useTranslation();

  // `group` + `group-open:` sul chevron: un triangolino che ruota e un contorno
  // di riga sono cio' che rende evidente che si apre. Senza, il sommario
  // sembrava un'etichetta e non un comando — infatti non veniva toccato.
  return (
    <details className="group rounded-xl border border-slate-700/60 bg-slate-900/40">
      <summary className="tap-target flex cursor-pointer list-none items-center gap-1.5 rounded-xl px-2 text-xs tracking-wider text-slate-400 uppercase hover:text-slate-200">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        {summary ?? t('log.details')}
      </summary>

      <div className="space-y-3 p-2 pt-1">
        <div className="space-y-1">
          <span className="block text-xs text-slate-500">{t('log.addedWeight')}</span>
          <NumberStepper
            value={entry.addedWeightKg}
            label={t('log.addedWeight')}
            unit="kg"
            step={2.5}
            max={200}
            placeholder="0"
            onChange={(addedWeightKg) => {
              onChange((current) => ({ ...current, addedWeightKg }));
            }}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`variant-${entry.id}`} className="block text-xs text-slate-500">
            {t('log.variant')}
          </label>
          <input
            id={`variant-${entry.id}`}
            type="text"
            autoComplete="off"
            list={variants.length > 0 ? `variants-${entry.id}` : undefined}
            value={entry.variant}
            placeholder={t('log.variantPlaceholder')}
            onChange={(event) => {
              const variant = event.target.value;
              onChange((current) => ({ ...current, variant }));
            }}
            className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-600"
          />
          {/* Un `datalist` suggerisce senza costringere: le condizioni gia'
              usate si scelgono da un tocco, ma il campo resta libero. */}
          {variants.length > 0 && (
            <datalist id={`variants-${entry.id}`}>
              {variants.map((variant) => (
                <option key={variant} value={variant} />
              ))}
            </datalist>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor={`notes-${entry.id}`} className="block text-xs text-slate-500">
            {t('log.notes')}
          </label>
          <textarea
            id={`notes-${entry.id}`}
            rows={2}
            value={entry.notes}
            placeholder={t('log.notesPlaceholder')}
            onChange={(event) => {
              const notes = event.target.value;
              onChange((current) => ({ ...current, notes }));
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600"
          />
        </div>
      </div>
    </details>
  );
}
