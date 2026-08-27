import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, LoaderCircle, Plus, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { newSupersetKey, normalizeSupersets, supersetRun } from '@/domain/superset';
import type { ProgramExercise } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { useExercises } from '@/features/exercises/useExercises';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import { knownSchemes } from '@/features/logging/lastPerformance';
import { ProgramDayEditor } from '@/features/programs/ProgramCard';
import {
  addProgramExercise,
  createDay,
  createProgram,
  deleteDay,
  deleteProgram,
  deleteProgramExercise,
  renameDay,
  updateProgram,
  updateProgramExercise,
  type ProgramDetail,
} from '@/features/programs/programsRepository';
import { usePrograms } from '@/features/programs/usePrograms';
import { formatDate, todayIso } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Nomi dei giorni come li usa chi si allena: A, B, C… */
function nextDayName(used: readonly string[]): string {
  const letters = 'ABCDEFGH';
  return [...letters].find((letter) => !used.includes(letter)) ?? String(used.length + 1);
}

/**
 * Le schede (spec §11 punto 7).
 *
 * Elenco ed editor nella stessa schermata, aperti uno alla volta: le schede si
 * contano sulle dita e si toccano raramente: da fermi, sul display principale.
 * Il logging, che si usa in movimento, e' l'unico posto che merita un flusso
 * suo (spec §2.5).
 *
 * Ogni modifica va a database appena fatta, senza un "salva" globale: un
 * template e' una manciata di righe, e un salvataggio da ricordare e' un modo
 * per perdere il lavoro.
 */
export function ProgramsPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const programs = usePrograms();
  const exercises = useExercises();
  // Lo storico serve solo a suggerire gli scheme gia' usati: scrivere una
  // scheda vuol dire quasi sempre ripartire da cio' che si sta gia' facendo.
  const history = useWorkoutHistory();
  const schemesByExercise = knownSchemes(history.data);

  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  /** Ogni azione ricarica: le schede sono piccole e la verita' sta nel database. */
  function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    action()
      .then(() => {
        programs.reload();
      })
      .catch((cause: unknown) => {
        setError(cause);
      })
      .finally(() => {
        setBusy(false);
      });
  }

  function handleCreate() {
    if (!user) return;
    run(async () => {
      const program = await createProgram({
        userId: user.id,
        name: t('programs.namePlaceholder'),
        startDate: todayIso(),
        endDate: null,
        notes: null,
      });
      // Una scheda senza giorni non e' utilizzabile: il primo si crea con lei.
      await createDay({
        userId: user.id,
        programId: program.id,
        name: 'A',
        sortOrder: 0,
      });
      setOpenId(program.id);
    });
  }

  /**
   * Scrive a database un nuovo ordine di slot.
   *
   * L'ordine e i superset stanno nella stessa operazione perche' sono la stessa
   * cosa: un superset e' un tratto contiguo, e spostare una riga puo' spezzarlo.
   * `normalizeSupersets` decide le chiavi finali, qui si scrivono solo le righe
   * che cambiano davvero — `sortOrder` diventa 0..n-1, cosi' un giorno con
   * buchi si ricompatta da solo.
   */
  async function writeSlots(
    /** Le righe come stanno a database: il metro per capire cosa e' cambiato. */
    saved: readonly ProgramExercise[],
    next: readonly ProgramExercise[],
  ) {
    const assignments = normalizeSupersets(next);
    const savedById = new Map(saved.map((slot) => [slot.id, slot]));

    for (const [index, slot] of next.entries()) {
      const assignment = assignments[index];
      const before = savedById.get(slot.id);
      if (!assignment || !before) continue;

      const changes: {
        sortOrder?: number;
        supersetKey?: string | null;
        supersetOrder?: number | null;
      } = {};
      if (before.sortOrder !== index) changes.sortOrder = index;
      if (before.supersetKey !== assignment.supersetKey) {
        changes.supersetKey = assignment.supersetKey;
      }
      if (before.supersetOrder !== assignment.supersetOrder) {
        changes.supersetOrder = assignment.supersetOrder;
      }

      if (Object.keys(changes).length > 0) await updateProgramExercise(slot.id, changes);
    }
  }

  function applySlots(saved: readonly ProgramExercise[], next: readonly ProgramExercise[]) {
    run(() => writeSlots(saved, next));
  }

  /**
   * Toglie uno slot e rimette in ordine quelli che restano: senza, cancellare
   * meta' di un superset lascerebbe l'altra meta' agganciata a nessuno.
   */
  function removeSlot(slots: readonly ProgramExercise[], slot: ProgramExercise) {
    const rest = slots.filter((candidate) => candidate.id !== slot.id);
    run(async () => {
      await deleteProgramExercise(slot.id);
      await writeSlots(rest, rest);
    });
  }

  function moveSlot(slots: readonly ProgramExercise[], slot: ProgramExercise, direction: -1 | 1) {
    const index = slots.findIndex((candidate) => candidate.id === slot.id);
    const other = slots[index + direction];
    if (!other) return;

    const next = [...slots];
    next[index] = other;
    next[index + direction] = slot;
    applySlots(slots, next);
  }

  /**
   * Aggancia uno slot a quello sopra: nasce un superset, o si allarga quello
   * che c'e' gia'. Si agganciano i due TRATTI interi, non le due righe: se
   * sopra c'era gia' una coppia, il terzo entra nello stesso giro invece di
   * spezzarla in due superset.
   */
  function linkSlot(slots: readonly ProgramExercise[], slot: ProgramExercise) {
    const index = slots.findIndex((candidate) => candidate.id === slot.id);
    const previous = slots[index - 1];
    if (!previous) return;

    const key = previous.supersetKey ?? newSupersetKey();
    const merged = new Set(
      [...supersetRun(slots, index - 1), ...supersetRun(slots, index)].map((member) => member.id),
    );
    applySlots(
      slots,
      slots.map((candidate) =>
        merged.has(candidate.id) ? { ...candidate, supersetKey: key } : candidate,
      ),
    );
  }

  /**
   * Stacca uno slot da quello sopra. Il tratto si divide in due: cio' che resta
   * sopra tiene la chiave, da qui in giu' se ne prende una nuova — e se una
   * delle due parti resta da sola, `normalizeSupersets` le toglie la chiave.
   */
  function unlinkSlot(slots: readonly ProgramExercise[], slot: ProgramExercise) {
    const index = slots.findIndex((candidate) => candidate.id === slot.id);
    const key = newSupersetKey();
    const tail = new Set(
      supersetRun(slots, index)
        .filter((member) => slots.findIndex((c) => c.id === member.id) >= index)
        .map((member) => member.id),
    );
    applySlots(
      slots,
      slots.map((candidate) =>
        tail.has(candidate.id) ? { ...candidate, supersetKey: key } : candidate,
      ),
    );
  }

  function renderProgram(detail: ProgramDetail) {
    const { program, days } = detail;
    const open = openId === program.id;
    const usedNames = days.map((entry) => entry.day.name);

    return (
      <li key={program.id} className="rounded-xl border border-slate-700 bg-slate-800/40">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpenId(open ? null : program.id);
          }}
          className="w-full p-3 text-left"
        >
          <span className="block truncate text-base font-semibold text-slate-100">
            {program.name}
          </span>
          <span className="block text-xs text-slate-500">
            {program.endDate === null
              ? `${t('programs.since', { date: formatDate(language, program.startDate) })} · ${t('programs.active')}`
              : t('programs.closed', {
                  date: formatDate(language, program.endDate),
                })}
          </span>
        </button>

        {open && (
          <div className="space-y-4 border-t border-slate-800 p-3">
            <div className="space-y-1">
              <label htmlFor={`name-${program.id}`} className="block text-xs text-slate-500">
                {t('programs.name')}
              </label>
              <input
                id={`name-${program.id}`}
                type="text"
                autoComplete="off"
                defaultValue={program.name}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value.length > 0 && value !== program.name) {
                    run(() => updateProgram(program.id, { name: value }));
                  }
                }}
                className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
              />
            </div>

            <div className="flex gap-2">
              <label className="min-w-0 flex-1 space-y-1">
                <span className="block text-xs text-slate-500">{t('programs.start')}</span>
                <input
                  type="date"
                  defaultValue={program.startDate}
                  onBlur={(event) => {
                    if (event.target.value !== '' && event.target.value !== program.startDate) {
                      run(() =>
                        updateProgram(program.id, {
                          startDate: event.target.value,
                        }),
                      );
                    }
                  }}
                  className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
                />
              </label>
              <label className="min-w-0 flex-1 space-y-1">
                <span className="block text-xs text-slate-500">{t('programs.end')}</span>
                <input
                  type="date"
                  defaultValue={program.endDate ?? ''}
                  onBlur={(event) => {
                    const value = event.target.value === '' ? null : event.target.value;
                    if (value !== program.endDate) {
                      run(() => updateProgram(program.id, { endDate: value }));
                    }
                  }}
                  className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
                />
              </label>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">{t('programs.hint')}</p>

            <div className="space-y-3">
              <p className="text-xs tracking-wider text-slate-500 uppercase">
                {t('programs.days')}
              </p>

              {days.map((day) => (
                <ProgramDayEditor
                  key={day.day.id}
                  day={day}
                  exercises={exercises.data}
                  schemesByExercise={schemesByExercise}
                  busy={busy}
                  onAddExercise={(exerciseId) => {
                    if (!user) return;
                    run(() =>
                      addProgramExercise({
                        userId: user.id,
                        programDayId: day.day.id,
                        exerciseId,
                        sortOrder: day.exercises.length,
                        defaultScheme: null,
                        defaultWeightKg: null,
                        supersetKey: null,
                        supersetOrder: null,
                      }),
                    );
                  }}
                  onChangeSlot={(slot, changes) => {
                    run(() => updateProgramExercise(slot.id, changes));
                  }}
                  onMoveSlot={(slot, direction) => {
                    moveSlot(day.exercises, slot, direction);
                  }}
                  onRemoveSlot={(slot) => {
                    removeSlot(day.exercises, slot);
                  }}
                  onLinkSlot={(slot) => {
                    linkSlot(day.exercises, slot);
                  }}
                  onUnlinkSlot={(slot) => {
                    unlinkSlot(day.exercises, slot);
                  }}
                  onRename={(name) => {
                    run(() => renameDay(day.day.id, name));
                  }}
                  onDelete={() => {
                    run(() => deleteDay(day.day.id));
                  }}
                />
              ))}

              <button
                type="button"
                disabled={busy || !user}
                onClick={() => {
                  if (!user) return;
                  run(() =>
                    createDay({
                      userId: user.id,
                      programId: program.id,
                      name: nextDayName(usedNames),
                      sortOrder: days.length,
                    }),
                  );
                }}
                className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 text-base font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-40"
              >
                <Plus aria-hidden className="size-5" />
                {t('programs.addDay')}
              </button>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <p className="text-xs leading-relaxed text-slate-500">
                {program.endDate === null ? t('programs.closeHint') : t('programs.reopenHint')}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    run(() =>
                      updateProgram(program.id, {
                        endDate: program.endDate === null ? todayIso() : null,
                      }),
                    );
                  }}
                  className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-40"
                >
                  {program.endDate === null ? t('programs.close') : t('programs.reopen')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    run(() => deleteProgram(program.id));
                  }}
                  className="tap-target flex-1 rounded-xl border border-slate-700 px-3 text-sm font-medium text-red-400 hover:bg-slate-900 disabled:opacity-40"
                >
                  {t('programs.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center gap-2 py-4">
        <Link
          to="/"
          aria-label={t('nav.back')}
          className="tap-target -ml-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {t('programs.title')}
        </h1>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 space-y-4 pb-8">
        {/* Solo al primo caricamento: durante un ricarico l'elenco resta a
            schermo, e la riga "carico" farebbe saltare il layout ogni volta. */}
        {programs.status === 'loading' && programs.data.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            {t('common.loading')}
          </p>
        )}

        {programs.status === 'error' && (
          <p className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span role="alert">{describeError(programs.error, t)}</span>
          </p>
        )}

        {error !== null && (
          <p
            role="alert"
            className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm leading-relaxed text-red-300"
          >
            {describeError(error, t)}
          </p>
        )}

        {programs.status === 'ready' && programs.data.length === 0 && (
          <p className="text-sm leading-relaxed text-slate-400">{t('programs.empty')}</p>
        )}

        {programs.data.length > 0 && (
          <ul className="space-y-3">{programs.data.map(renderProgram)}</ul>
        )}

        <button
          type="button"
          disabled={busy || !user}
          onClick={handleCreate}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          <Plus aria-hidden className="size-5" />
          {t('programs.new')}
        </button>
      </main>
    </AppShell>
  );
}
