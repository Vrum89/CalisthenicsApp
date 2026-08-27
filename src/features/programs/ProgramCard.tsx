import { useState } from 'react';
import { ChevronDown, ChevronUp, Link2, Plus, Trash2, Unlink } from 'lucide-react';
import { compareCategories } from '@/domain/categories';
import type { Exercise, ProgramExercise } from '@/domain/types';
import type { ProgramDayWithExercises } from '@/features/programs/programsRepository';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Un giorno della scheda: gli slot, in ordine, coi valori di partenza.
 *
 * "Di partenza" perche' restano tutti editabili durante l'allenamento, non
 * perche' contino poco: quando ci sono, sono loro a riempire la registrazione.
 * Quello che la scheda lascia vuoto lo riempie l'ultima performance (spec §5,
 * regola della progressione). Modificare una scheda non tocca gli allenamenti
 * gia' registrati: template e istanza restano due cose separate.
 *
 * Gli slot consecutivi si possono agganciare in un superset: la scheda dice
 * "questi due si alternano a round", e il logging li apre gia' in un'unica
 * scheda a round invece che come due esercizi da fare in fila.
 *
 * La scelta dell'esercizio e' una tendina nativa e non il picker a schermo
 * intero del logging: qui si e' fermi al tavolo sul display principale, non
 * sotto la sbarra col cover display, e una tendina raggruppata per categoria
 * costa un tocco invece di due.
 */
export function ProgramDayEditor({
  day,
  exercises,
  schemesByExercise,
  busy,
  onAddExercise,
  onChangeSlot,
  onMoveSlot,
  onRemoveSlot,
  onLinkSlot,
  onUnlinkSlot,
  onRename,
  onDelete,
}: {
  day: ProgramDayWithExercises;
  /** Il catalogo, per la tendina e per risolvere i nomi degli slot. */
  exercises: readonly Exercise[];
  /** Gli scheme gia' usati per ogni esercizio, i piu' recenti in testa. */
  schemesByExercise: ReadonlyMap<string, readonly string[]>;
  busy: boolean;
  onAddExercise: (exerciseId: string) => void;
  onChangeSlot: (
    slot: ProgramExercise,
    changes: { defaultScheme?: string | null; defaultWeightKg?: number | null },
  ) => void;
  onMoveSlot: (slot: ProgramExercise, direction: -1 | 1) => void;
  onRemoveSlot: (slot: ProgramExercise) => void;
  /** Aggancia lo slot a quello sopra, formando o allargando un superset. */
  onLinkSlot: (slot: ProgramExercise) => void;
  onUnlinkSlot: (slot: ProgramExercise) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(day.day.name);

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  /** Agganciato a quello sopra: stessa chiave e riga adiacente. */
  function linkedToPrevious(index: number): boolean {
    const slot = day.exercises[index];
    const previous = day.exercises[index - 1];
    return (
      slot !== undefined &&
      previous !== undefined &&
      slot.supersetKey !== null &&
      slot.supersetKey === previous.supersetKey
    );
  }
  const sorted = [...exercises]
    .filter((exercise) => exercise.isActive)
    .sort((a, b) => compareCategories(t, a.category, b.category) || a.name.localeCompare(b.name));

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
      <header className="flex items-center gap-2">
        <input
          type="text"
          aria-label={t('programs.dayName')}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed.length > 0 && trimmed !== day.day.name) onRename(trimmed);
            else setName(day.day.name);
          }}
          className="tap-target w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 text-base font-semibold text-slate-100"
        />
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          aria-label={t('programs.deleteDay', { name: day.day.name })}
          disabled={busy}
          onClick={onDelete}
          className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-600 hover:text-red-400 disabled:opacity-40"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </header>

      {day.exercises.length === 0 ? (
        <p className="text-sm text-slate-500">{t('programs.noExercises')}</p>
      ) : (
        <ol className="space-y-2">
          {day.exercises.map((slot, index) => {
            const exercise = byId.get(slot.exerciseId);
            const linked = linkedToPrevious(index);
            // Il bordo ambra tiene insieme visivamente il tratto: un superset
            // si riconosce dalla colonna colorata, non leggendo le chiavi.
            const inSuperset = linked || linkedToPrevious(index + 1);
            const schemes = schemesByExercise.get(slot.exerciseId) ?? [];

            return (
              <li key={slot.id} className="space-y-2">
                {index > 0 && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (linked) onUnlinkSlot(slot);
                        else onLinkSlot(slot);
                      }}
                      className={`tap-target flex items-center gap-1 rounded-full px-3 text-xs font-medium disabled:opacity-40 ${
                        linked
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-slate-600 hover:text-slate-300'
                      }`}
                    >
                      {linked ? (
                        <Unlink aria-hidden className="size-3.5" />
                      ) : (
                        <Link2 aria-hidden className="size-3.5" />
                      )}
                      {t(linked ? 'programs.superset.unlink' : 'programs.superset.link')}
                    </button>
                  </div>
                )}

                <div
                  className={`space-y-2 rounded-lg border p-2 ${
                    inSuperset
                      ? 'border-slate-800 border-l-2 border-l-amber-500/60'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                      {exercise?.name ?? slot.exerciseId}
                    </span>
                    <button
                      type="button"
                      aria-label={t('programs.moveUp')}
                      disabled={busy || index === 0}
                      onClick={() => {
                        onMoveSlot(slot, -1);
                      }}
                      className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-30"
                    >
                      <ChevronUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('programs.moveDown')}
                      disabled={busy || index === day.exercises.length - 1}
                      onClick={() => {
                        onMoveSlot(slot, 1);
                      }}
                      className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 disabled:opacity-30"
                    >
                      <ChevronDown aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('programs.removeSlot', {
                        name: exercise?.name ?? '',
                      })}
                      disabled={busy}
                      onClick={() => {
                        onRemoveSlot(slot);
                      }}
                      className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-600 hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <label className="min-w-0 flex-1 space-y-1">
                      <span className="block text-xs text-slate-500">
                        {t('programs.defaultScheme')}
                      </span>
                      {/* Gli scheme gia' usati per QUESTO esercizio, come nel
                        logging: una scheda si scrive quasi sempre partendo da
                        cio' che si sta gia' facendo. */}
                      <input
                        type="text"
                        autoComplete="off"
                        list={schemes.length > 0 ? `program-schemes-${slot.id}` : undefined}
                        defaultValue={slot.defaultScheme ?? ''}
                        placeholder={t('log.schemePlaceholder')}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          onChangeSlot(slot, {
                            defaultScheme: value.length > 0 ? value : null,
                          });
                        }}
                        className="tap-target w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-base text-slate-100 placeholder:text-slate-600"
                      />
                      {schemes.length > 0 && (
                        <datalist id={`program-schemes-${slot.id}`}>
                          {schemes.map((scheme) => (
                            <option key={scheme} value={scheme} />
                          ))}
                        </datalist>
                      )}
                    </label>
                    <label className="w-28 space-y-1">
                      <span className="block text-xs text-slate-500">
                        {t('programs.defaultWeight')}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        defaultValue={
                          slot.defaultWeightKg === null ? '' : String(slot.defaultWeightKg)
                        }
                        placeholder="0"
                        onBlur={(event) => {
                          const raw = event.target.value.replace(',', '.').trim();
                          const parsed = Number(raw);
                          onChangeSlot(slot, {
                            defaultWeightKg: raw === '' || !Number.isFinite(parsed) ? null : parsed,
                          });
                        }}
                        className="tap-target w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-base text-slate-100 placeholder:text-slate-600"
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <label className="flex items-center gap-2">
        <Plus aria-hidden className="size-4 shrink-0 text-slate-500" />
        <span className="sr-only">{t('programs.addExercise')}</span>
        <select
          aria-label={t('programs.addExercise')}
          value=""
          disabled={busy}
          onChange={(event) => {
            if (event.target.value !== '') onAddExercise(event.target.value);
          }}
          className="tap-target min-w-0 flex-1 rounded-lg border border-dashed border-slate-600 bg-slate-900 px-2 text-sm text-slate-300 disabled:opacity-40"
        >
          <option value="">{t('programs.addExercise')}</option>
          {sorted.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
