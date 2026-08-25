import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { categoryLabel, compareCategories } from '@/domain/categories';
import type { Exercise } from '@/domain/types';
import { describePerformance, type LastPerformance } from '@/features/logging/lastPerformance';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Scelta dell'esercizio da aggiungere (spec §5.2: costruzione ad-hoc).
 *
 * A schermo intero e non in un menu a tendina: sul cover display una tendina
 * nativa copre tutto lo stesso, ma senza campo di ricerca e senza il riferimento
 * dell'ultima volta. Qui invece si cerca digitando e si vede subito cosa si e'
 * fatto l'ultima volta con quell'esercizio — che spesso e' il motivo per cui lo
 * si sta scegliendo.
 */
export function ExercisePicker({
  exercises,
  performances,
  onPick,
  onClose,
}: {
  exercises: readonly Exercise[];
  performances: ReadonlyMap<string, LastPerformance>;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const visible = exercises
    .filter((exercise) => exercise.isActive)
    .filter((exercise) => needle === '' || exercise.name.toLowerCase().includes(needle))
    .sort(
      (a, b) => compareCategories(t, a.category, b.category) || a.name.localeCompare(b.name),
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('log.picker.title')}
      className="px-safe pt-safe pb-safe fixed inset-0 z-30 flex flex-col bg-slate-950"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-4">
        <header className="flex items-center gap-2 py-3">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{t('log.picker.title')}</h2>
          <button
            type="button"
            aria-label={t('log.picker.close')}
            onClick={onClose}
            className="tap-target -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
          >
            <X aria-hidden className="size-6" />
          </button>
        </header>

        <div className="relative">
          <Search aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            autoComplete="off"
            aria-label={t('log.picker.search')}
            placeholder={t('log.picker.search')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 pr-3 pl-9 text-base text-slate-100 placeholder:text-slate-600"
          />
        </div>

        {visible.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">{t('log.picker.empty')}</p>
        ) : (
          <ul className="-mx-4 mt-2 flex-1 divide-y divide-slate-800 overflow-y-auto px-4 pb-4">
            {visible.map((exercise) => {
              const last = performances.get(exercise.id);
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(exercise);
                    }}
                    className="w-full py-3 text-left"
                  >
                    <span className="block truncate text-base text-slate-100">{exercise.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {last
                        ? describePerformance(t, exercise.metricType, last.entry)
                        : categoryLabel(t, exercise.category)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
