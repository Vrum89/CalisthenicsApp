import { useState } from 'react';
import { Check, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { formatMetricValue } from '@/domain/metrics';
import { parseScheme } from '@/domain/scheme';
import {
  addSet,
  applyScheme,
  doneReps,
  entryValue,
  removeSet,
  setReps,
  toggleSet,
  type DraftEntry,
} from '@/features/logging/draft';
import { NumberStepper } from '@/features/logging/NumberStepper';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Widget a serie (spec §5.4 e §5.6), le due modalita' in un componente solo.
 *
 * Fissa (`scheme` = `NxM`): le caselle sono gia' li', un tocco secco spunta la
 * serie e fa partire il riposo. E' il gesto che deve funzionare con le mani
 * sudate, di corsa, sul cover display: un tap, niente altro.
 *
 * Aperta (`scheme` vuoto o non-`NxM`): quante ripetizioni siano uscite lo si sa
 * solo dopo, quindi toccare una casella da fare apre il correttore invece di
 * spuntarla. Da qui passano le piramidi a sfinimento.
 *
 * In entrambe, toccare una serie gia' fatta la riapre: una serie andata storta
 * si corregge dove sta, senza menu.
 */
export function SetCheckboxes({
  entry,
  schemes,
  onChange,
  onSetCompleted,
}: {
  entry: DraftEntry;
  /** Scheme gia' usati per questo esercizio, dal piu' recente. */
  schemes: readonly string[];
  onChange: (change: (entry: DraftEntry) => DraftEntry) => void;
  /** Chiamata quando una serie viene spuntata: fa partire il rest timer. */
  onSetCompleted: () => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<number | null>(null);
  const fixed = parseScheme(entry.scheme) !== null;
  const editingSet = editing === null ? null : (entry.sets[editing] ?? null);

  function complete(index: number) {
    onChange((current) => toggleSet(current, index));
    onSetCompleted();
    // Conclusa una serie dal correttore, si apre quella dopo: sul cover display
    // ogni tocco risparmiato conta, e la serie successiva e' sempre il passo
    // seguente. Se non ce n'e' un'altra da fare si chiude e basta.
    const next = entry.sets.findIndex((set, position) => position > index && !set.done);
    setEditing(next === -1 ? null : next);
  }

  function handleTap(index: number, done: boolean) {
    if (fixed && !done) {
      complete(index);
      return;
    }
    setEditing(editing === index ? null : index);
  }

  const total = entryValue(entry);
  const completed = doneReps(entry).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`scheme-${entry.id}`} className="text-xs tracking-wider text-slate-500 uppercase">
          {t('log.scheme')}
        </label>
        <input
          id={`scheme-${entry.id}`}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          list={schemes.length > 0 ? `schemes-${entry.id}` : undefined}
          value={entry.scheme}
          placeholder={t('log.schemePlaceholder')}
          onChange={(event) => {
            const scheme = event.target.value;
            onChange((current) => applyScheme(current, scheme));
          }}
          className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-sm text-slate-100 placeholder:text-slate-600"
        />
        {/* Digitando "5" il browser filtra da solo su "5x5", "5x6"…: sono gli
            scheme che hai gia' usato per QUESTO esercizio, non un elenco
            inventato da noi. Il campo resta libero. */}
        {schemes.length > 0 && (
          <datalist id={`schemes-${entry.id}`}>
            {schemes.map((scheme) => (
              <option key={scheme} value={scheme} />
            ))}
          </datalist>
        )}
        <span className="ml-auto text-sm text-slate-400 tabular-nums">
          {t('log.completedSets', { done: completed, total: entry.sets.length })}
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {entry.sets.map((set, index) => (
          <li key={index}>
            <button
              type="button"
              aria-pressed={set.done}
              aria-label={
                set.done
                  ? t('log.setDone', { index: index + 1, reps: set.reps })
                  : t('log.setTodo', { index: index + 1, reps: set.reps })
              }
              onClick={() => {
                handleTap(index, set.done);
              }}
              className={`tap-target flex items-center justify-center gap-1 rounded-xl border px-3 text-lg font-semibold tabular-nums ${
                set.done
                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                  : 'border-slate-600 bg-slate-900 text-slate-300'
              } ${editing === index ? 'ring-2 ring-slate-400' : ''}`}
            >
              {set.done && <Check aria-hidden className="size-4" />}
              {set.reps}
            </button>
          </li>
        ))}

        {!fixed && (
          <li>
            <button
              type="button"
              aria-label={t('log.addSet')}
              onClick={() => {
                onChange(addSet);
                setEditing(entry.sets.length);
              }}
              className="tap-target flex items-center justify-center rounded-xl border border-dashed border-slate-600 px-3 text-slate-400 hover:text-slate-200"
            >
              <Plus aria-hidden className="size-5" />
            </button>
          </li>
        )}
      </ul>

      {editing !== null && editingSet !== null && (
        <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">
              {t('log.set', { index: editing + 1 })}
            </span>
            <button
              type="button"
              aria-label={t('log.closeEditor')}
              onClick={() => {
                setEditing(null);
              }}
              className="tap-target ml-auto flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <NumberStepper
            value={editingSet.reps}
            label={t('log.repsLabel')}
            unit={t('metric.unit.reps')}
            onChange={(reps) => {
              const index = editing;
              onChange((current) => setReps(current, index, reps ?? 0));
            }}
          />

          <div className="flex gap-2">
            {editingSet.done ? (
              <button
                type="button"
                onClick={() => {
                  const index = editing;
                  onChange((current) => toggleSet(current, index));
                }}
                className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                <RotateCcw aria-hidden className="size-4" />
                {t('log.markUndone')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  complete(editing);
                }}
                className="tap-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                <Check aria-hidden className="size-4" />
                {t('log.markDone')}
              </button>
            )}

            {!fixed && entry.sets.length > 1 && (
              <button
                type="button"
                aria-label={t('log.removeSet')}
                onClick={() => {
                  const index = editing;
                  onChange((current) => removeSet(current, index));
                  setEditing(null);
                }}
                className="tap-target flex shrink-0 items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-400 hover:text-red-400"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-slate-400">
        {t('log.total')}{' '}
        <span className="font-semibold text-amber-400 tabular-nums">
          {formatMetricValue(t, entry.metricType, total)}
        </span>
      </p>
    </div>
  );
}
