import { useState } from 'react';
import { EllipsisVertical, Plus, Search, X } from 'lucide-react';
import { categoryLabel, compareCategories } from '@/domain/categories';
import type { Exercise } from '@/domain/types';
import {
  describePerformance,
  type ExerciseUsage,
  type LastPerformance,
} from '@/features/logging/lastPerformance';
import { ExerciseManager } from '@/features/logging/ExerciseManager';
import { NewExerciseForm, type NewExerciseDraft } from '@/features/logging/NewExerciseForm';
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
  variants,
  usage,
  onPick,
  onCreate,
  onRename,
  onMerge,
  onDelete,
  onRenameVariant,
  onClearVariant,
  onClose,
}: {
  exercises: readonly Exercise[];
  performances: ReadonlyMap<string, LastPerformance>;
  /** Condizioni gia' usate, per esercizio e dalla piu' recente. */
  variants: ReadonlyMap<string, readonly string[]>;
  /** Quante volte ogni esercizio compare nello storico. Assente = mai usato. */
  usage: ReadonlyMap<string, ExerciseUsage>;
  onPick: (exercise: Exercise, variant?: string) => void;
  onCreate: (draft: NewExerciseDraft) => Promise<void>;
  onRename: (exercise: Exercise, name: string) => Promise<void>;
  onMerge: (source: Exercise, target: Exercise) => Promise<void>;
  onDelete: (exercise: Exercise) => Promise<void>;
  onRenameVariant: (exercise: Exercise, from: string, to: string) => Promise<void>;
  onClearVariant: (exercise: Exercise, variant: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  // `null` = elenco; altrimenti sono i valori di partenza del form.
  const [creating, setCreating] = useState<(Partial<NewExerciseDraft> & { name: string }) | null>(
    null,
  );
  const [managing, setManaging] = useState<Exercise | null>(null);

  const needle = query.trim().toLowerCase();
  /**
   * La ricerca guarda anche le condizioni: "materassino" e' spesso il modo in cui
   * un esercizio si ricorda davvero, piu' del suo nome di catalogo.
   */
  const matches = (exercise: Exercise): boolean =>
    needle === '' ||
    exercise.name.toLowerCase().includes(needle) ||
    (variants.get(exercise.id) ?? []).some((variant) => variant.toLowerCase().includes(needle));

  const visible = exercises
    .filter((exercise) => exercise.isActive)
    .filter(matches)
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

        {managing !== null ? (
          <ExerciseManager
            exercise={managing}
            siblings={exercises.filter((other) => other.id !== managing.id)}
            usage={usage.get(managing.id)}
            variants={variants.get(managing.id) ?? []}
            onRename={async (name) => {
              await onRename(managing, name);
              setManaging(null);
            }}
            onMerge={async (target) => {
              await onMerge(managing, target);
              setManaging(null);
            }}
            onDuplicate={() => {
              setManaging(null);
              setCreating({
                name: t('log.copyName', { name: managing.name }),
                category: managing.category,
                metricType: managing.metricType,
                windowSeconds: managing.windowSeconds,
              });
            }}
            onDelete={async () => {
              await onDelete(managing);
              setManaging(null);
            }}
            onRenameVariant={(from, to) => onRenameVariant(managing, from, to)}
            onClearVariant={(variant) => onClearVariant(managing, variant)}
            onClose={() => {
              setManaging(null);
            }}
          />
        ) : creating !== null ? (
          <NewExerciseForm
            initial={creating}
            onCreate={onCreate}
            onCancel={() => {
              setCreating(null);
            }}
          />
        ) : (
          <>
            <div className="relative">
              <Search
                aria-hidden
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
              />
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

            <ul className="-mx-4 mt-2 flex-1 divide-y divide-slate-800 overflow-y-auto px-4 pb-4">
              {visible.map((exercise) => {
                const last = performances.get(exercise.id);
                return (
                  <li key={exercise.id} className="py-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onPick(exercise);
                        }}
                        className="min-w-0 flex-1 py-2 text-left"
                      >
                        <span className="block truncate text-base text-slate-100">
                          {exercise.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {last
                            ? describePerformance(t, exercise.metricType, last.entry)
                            : categoryLabel(t, exercise.category)}
                        </span>
                      </button>

                      {/* Un solo comando in piu' per riga: a 360 px due icone
                          per esercizio mangerebbero la larghezza del nome. */}
                      <button
                        type="button"
                        aria-label={t('log.manage')}
                        onClick={() => {
                          setManaging(exercise);
                        }}
                        className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-600 hover:text-slate-300"
                      >
                        <EllipsisVertical aria-hidden className="size-5" />
                      </button>
                    </div>

                    {/* Le condizioni gia' usate, scegliibili da qui: per gli
                        handstand push up "con quale rialzo" e' parte della
                        scelta dell'esercizio, non un dettaglio da compilare
                        dopo. Toccare il nome sopra lascia la condizione
                        ereditata dall'ultima volta. */}
                    {(variants.get(exercise.id) ?? []).length > 0 && (
                      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                        {(variants.get(exercise.id) ?? []).map((variant) => (
                          <li key={variant}>
                            <button
                              type="button"
                              onClick={() => {
                                onPick(exercise, variant);
                              }}
                              className="tap-target rounded-lg bg-slate-900 px-3 text-sm whitespace-nowrap text-slate-300 hover:text-slate-100"
                            >
                              {variant}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                  </li>
                );
              })}

              {/* La creazione sta in fondo all'elenco e non dietro un menu: quando
                  la ricerca non trova niente e' esattamente cio' che serve, e
                  quando trova qualcosa non da' fastidio. */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCreating({ name: query.trim() });
                  }}
                  className="tap-target flex w-full items-center gap-2 py-3 text-left text-base font-medium text-amber-400"
                >
                  <Plus aria-hidden className="size-5 shrink-0" />
                  <span className="min-w-0 truncate">
                    {needle === ''
                      ? t('log.create.open')
                      : t('log.create.named', { name: query.trim() })}
                  </span>
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
