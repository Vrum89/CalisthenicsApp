import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Link2,
  LoaderCircle,
  Plus,
  Save,
  TriangleAlert,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { AppError, describeError } from '@/lib/errors';
import { todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Exercise, WorkoutType } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import {
  createExercise,
  deleteExercise,
  mergeExercises,
  renameExercise,
} from '@/features/exercises/exercisesRepository';
import { clearVariant, renameVariant } from '@/features/exercises/variantsRepository';
import { useExercises } from '@/features/exercises/useExercises';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import {
  addRound,
  alignRounds,
  draftEntryFor,
  filledEntries,
  groupEntries,
  newSupersetKey,
  removeRound,
  type DraftEntry,
} from '@/features/logging/draft';
import { ExerciseCard } from '@/features/logging/ExerciseCard';
import { ExercisePicker } from '@/features/logging/ExercisePicker';
import {
  exerciseUsage,
  knownSchemes,
  knownVariants,
  lastPerformances,
} from '@/features/logging/lastPerformance';
import type { NewExerciseDraft } from '@/features/logging/NewExerciseForm';
import { RestTimerBar } from '@/features/logging/RestTimerBar';
import { ProgramDayPicker } from '@/features/logging/ProgramDayPicker';
import { SupersetCard } from '@/features/logging/SupersetCard';
import type { ProgramDayWithExercises } from '@/features/programs/programsRepository';
import { usePrograms } from '@/features/programs/usePrograms';
import { WorkoutDateField } from '@/features/logging/WorkoutDateField';
import { saveWorkout } from '@/features/logging/workoutRepository';
import { REST_MODE, useRestTimer, windowMode } from '@/features/logging/useRestTimer';
import { useWorkoutDraft } from '@/features/logging/useWorkoutDraft';

const SELECTABLE_TYPES: readonly WorkoutType[] = ['from_program', 'freestyle', 'test'];

const TYPE_LABEL = {
  freestyle: 'log.type.freestyle',
  test: 'log.type.test',
  from_program: 'log.type.fromProgram',
} as const;

/**
 * Registrazione di un allenamento (spec §5.2 e §5.3).
 *
 * Regola di layout, che viene prima di tutto il resto: questa schermata si usa
 * DURANTE l'allenamento, sul cover display da ~360x360 (spec §2.5). Quindi un
 * esercizio in focus alla volta, il resto raggiungibile ma non a schermo, e
 * niente che non serva mentre si e' sotto la sbarra.
 *
 * "Da scheda" non e' un tipo di registrazione diverso: e' lo stesso flusso che
 * parte gia' compilato con gli esercizi del giorno. I widget, il riposo e la
 * precompilazione sono identici — cambia solo da dove arrivano le voci.
 */
export function LogPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const exercises = useExercises();
  const history = useWorkoutHistory();
  const programs = usePrograms();
  const draftController = useWorkoutDraft();
  const timer = useRestTimer();

  const navigate = useNavigate();
  /**
   * L'esercizio in manutenzione sta nell'URL (`/log?manage=<id>`), non solo
   * nello stato: dal pannello si esce verso Progressi per cancellare una
   * sessione, e il tasto indietro deve riportare qui, aperto dov'era. Uno stato
   * locale morirebbe alla navigazione.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const managingId = searchParams.get('manage');

  const [focus, setFocus] = useState(0);
  // Quando e' valorizzata, l'esercizio scelto nel picker si aggancia a questa
  // voce invece di aggiungersi in fondo.
  const [linkingTo, setLinkingTo] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickingDay, setPickingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const { draft } = draftController;
  const entries = draft.entries;
  // La navigazione va per gruppi: un superset e' un solo passo, non due.
  const groups = groupEntries(entries);
  const performances = lastPerformances(history.data);
  const variantsByExercise = knownVariants(history.data);
  const schemesByExercise = knownSchemes(history.data);
  const usageByExercise = exerciseUsage(history.data);

  /**
   * Carica un giorno di scheda nella bozza.
   *
   * Gli slot diventano voci normali: da qui in poi non c'e' differenza con un
   * allenamento libero, e ogni valore resta editabile. La scheda ha dato il
   * punto di partenza, non un vincolo — e l'ultima performance vince comunque
   * sui suoi valori (regola della progressione, spec §5).
   */
  function loadProgramDay(day: ProgramDayWithExercises) {
    const catalog = new Map(exercises.data.map((item) => [item.id, item]));

    draftController.replace({
      workoutDate: draft.workoutDate,
      workoutType: 'from_program',
      programDayId: day.day.id,
      notes: '',
      entries: day.exercises.flatMap((slot) => {
        const exercise = catalog.get(slot.exerciseId);
        if (!exercise) return [];
        return [
          draftEntryFor(exercise, performances.get(slot.exerciseId)?.entry ?? null, {
            scheme: slot.defaultScheme,
            weightKg: slot.defaultWeightKg,
            supersetKey: slot.supersetKey,
          }),
        ];
      }),
    });
    setFocus(0);
    setPickingDay(false);
    setSaved(false);
  }
  const managing = exercises.data.find((item) => item.id === managingId) ?? null;

  function setManaging(exercise: Exercise | null) {
    setSearchParams(exercise === null ? {} : { manage: exercise.id }, { replace: true });
    if (exercise !== null) setPicking(true);
  }

  // L'indice si tiene dentro i bordi qui, non a ogni rimozione: cosi' non c'e'
  // un istante in cui punta a una voce che non esiste piu'.
  const index = Math.min(focus, Math.max(0, groups.length - 1));
  const currentGroup = groups[index] ?? null;
  const current = currentGroup?.entries[0] ?? null;
  const ready = filledEntries(draft).length > 0;

  /**
   * Aggiunge una voce alla bozza: in fondo, oppure dentro il superset ancorato a
   * `linkingTo`. Agganciare allinea i round, perche' un superset con 5 serie di
   * uno e 3 dell'altro avrebbe due giri mezzi vuoti.
   */
  function addToDraft(entry: DraftEntry) {
    const anchor = linkingTo === null ? null : entries.find((e) => e.id === linkingTo);
    if (!anchor) {
      draftController.addEntry(entry);
      setFocus(groups.length);
      return;
    }

    const key = anchor.supersetKey ?? newSupersetKey();
    // La chiave va messa anche sull'ancora: agganciando il secondo esercizio
    // nasce il superset, e finche' era da sola quella voce non ne aveva una.
    const members = alignRounds([
      ...entries
        .filter((e) => e.supersetKey === key || e.id === anchor.id)
        .map((e) => ({ ...e, supersetKey: key })),
      { ...entry, supersetKey: key },
    ]);

    for (const member of members) {
      if (member.id === entry.id) {
        draftController.addEntry(member);
      } else {
        draftController.updateEntry(member.id, () => member);
      }
    }
  }

  async function handleCreateExercise(exercise: NewExerciseDraft) {
    if (!user) return;
    const created = await createExercise({ ...exercise, userId: user.id, isActive: true });
    addToDraft(draftEntryFor(created, null));
    setLinkingTo(null);
    setPicking(false);
    setSaved(false);
    // Il catalogo si ricarica dopo: l'esercizio e' gia' nella bozza, e
    // aspettare la lista completa terrebbe fermo chi si sta allenando.
    exercises.reload();
  }

  /** Stacca una voce dal suo superset: torna un esercizio come gli altri. */
  function handleUnlink(entryId: string) {
    draftController.updateEntry(entryId, (entry) => ({ ...entry, supersetKey: null }));
  }

  async function handleDeleteExercise(exercise: Exercise) {
    await deleteExercise(exercise.id);
    // Toglierlo anche dalla bozza: restare in una registrazione un esercizio
    // che non esiste piu' vorrebbe dire fallire al salvataggio.
    for (const entry of entries.filter((candidate) => candidate.exerciseId === exercise.id)) {
      draftController.removeEntry(entry.id);
    }
    exercises.reload();
  }

  /**
   * Le manutenzioni del catalogo ricaricano sia il catalogo sia lo storico: una
   * fusione sposta registrazioni, e la dashboard non deve restare col vecchio
   * conteggio finche' non si ricarica la pagina.
   */
  async function refreshCatalog() {
    exercises.reload();
    history.reload();
  }

  async function handleRenameExercise(exercise: Exercise, name: string) {
    await renameExercise(exercise.id, name);
    // Il nome vive anche nella bozza, che deve restare leggibile da sola.
    for (const entry of entries.filter((candidate) => candidate.exerciseId === exercise.id)) {
      draftController.updateEntry(entry.id, (current) => ({ ...current, name }));
    }
    await refreshCatalog();
  }

  async function handleMergeExercises(source: Exercise, target: Exercise) {
    await mergeExercises(source.id, target.id);
    // Le voci in bozza puntano a un esercizio che non esiste piu': si spostano
    // anche loro, o al salvataggio fallirebbero.
    for (const entry of entries.filter((candidate) => candidate.exerciseId === source.id)) {
      draftController.updateEntry(entry.id, (current) => ({
        ...current,
        exerciseId: target.id,
        name: target.name,
      }));
    }
    await refreshCatalog();
  }

  async function handleRenameVariant(exercise: Exercise, from: string, to: string) {
    await renameVariant(exercise.id, from, to);
    await refreshCatalog();
  }

  async function handleClearVariant(exercise: Exercise, variant: string) {
    await clearVariant(exercise.id, variant);
    await refreshCatalog();
  }

  async function handleSave() {
    setError(null);
    if (!user) return;

    if (draft.workoutDate > todayIso()) {
      setError(new AppError('log.futureDate', `Future workout date: ${draft.workoutDate}`));
      return;
    }

    setSaving(true);
    try {
      await saveWorkout(draft, user.id);
      timer.stop();
      draftController.reset();
      setFocus(0);
      setSaved(true);
      history.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label={t('nav.back')}
          className="tap-target -ml-2 flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>

        {/* La data e' modificabile e parte da oggi: capita di segnare la sera,
            o il giorno dopo, un allenamento gia' fatto. */}
        <WorkoutDateField
          value={draft.workoutDate}
          onChange={(date) => {
            draftController.setDate(date);
            setSaved(false);
          }}
        />

        {/* `overflow-x-auto`: tre tipi piu' la data non entrano sempre in 360 px
            — in inglese sforavano. Meglio una riga che scorre di una pagina che
            esce dai bordi. */}
        <div
          role="group"
          aria-label={t('log.type')}
          className="-mr-4 ml-auto flex min-w-0 gap-1 overflow-x-auto pr-4"
        >
          {SELECTABLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={draft.workoutType === type}
              onClick={() => {
                // "Da scheda" non e' un'etichetta da appiccicare a una bozza
                // qualunque: apre la scelta del giorno, ed e' quella a riempirla.
                if (type === 'from_program') setPickingDay(true);
                else draftController.setWorkoutType(type);
              }}
              className={`tap-target shrink-0 rounded-lg px-2 text-sm font-medium whitespace-nowrap ${
                draft.workoutType === type
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t(TYPE_LABEL[type])}
            </button>
          ))}
        </div>
      </header>

      <main className={`flex-1 space-y-4 ${timer.running ? 'pb-24' : 'pb-8'}`}>
        {exercises.status === 'error' && (
          <p className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span role="alert">{describeError(exercises.error, t)}</span>
          </p>
        )}

        {current === null ? (
          <div className="space-y-4 pt-6 text-center">
            <p className="text-sm leading-relaxed text-slate-400">{t('log.empty')}</p>
            {saved && (
              <p className="text-sm text-emerald-400">
                {t('log.saved')}{' '}
                <Link to="/dashboard" className="underline">
                  {t('nav.dashboard')}
                </Link>
              </p>
            )}
          </div>
        ) : (
          <>
            {currentGroup !== null && currentGroup.entries.length > 1 ? (
              <SupersetCard
                key={currentGroup.supersetKey}
                group={currentGroup}
                variants={variantsByExercise}
                onChangeEntry={(entryId, change) => {
                  draftController.updateEntry(entryId, change);
                  setSaved(false);
                }}
                onChangeRounds={(delta) => {
                  const members = currentGroup.entries;
                  const changed = delta === 1 ? addRound(members) : removeRound(members);
                  for (const member of changed) {
                    draftController.updateEntry(member.id, () => member);
                  }
                  setSaved(false);
                }}
                onUnlink={handleUnlink}
                onRoundComplete={() => {
                  timer.start(REST_MODE);
                }}
              />
            ) : (
              <ExerciseCard
                key={current.id}
                entry={current}
                last={performances.get(current.exerciseId) ?? null}
                onChange={(change) => {
                  draftController.updateEntry(current.id, change);
                  setSaved(false);
                }}
                onRemove={() => {
                  draftController.removeEntry(current.id);
                }}
                variants={variantsByExercise.get(current.exerciseId) ?? []}
                schemes={schemesByExercise.get(current.exerciseId) ?? []}
                onSetCompleted={() => {
                  timer.start(REST_MODE);
                }}
                onStartWindow={(seconds) => {
                  timer.start(windowMode(seconds));
                }}
              />
            )}

            {groups.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label={t('log.previous')}
                  disabled={index === 0}
                  onClick={() => {
                    setFocus(index - 1);
                  }}
                  className="tap-target flex items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft aria-hidden className="size-5" />
                </button>
                <span className="text-sm text-slate-400 tabular-nums">
                  {t('log.position', { index: index + 1, total: groups.length })}
                </span>
                <button
                  type="button"
                  aria-label={t('log.next')}
                  disabled={index === groups.length - 1}
                  onClick={() => {
                    setFocus(index + 1);
                  }}
                  className="tap-target flex items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 disabled:opacity-30"
                >
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              </div>
            )}
            {/* L'aggancio parte da un esercizio gia' in lista: "questo, insieme
                a…". E' l'unico modo in cui un superset nasce davvero — non
                esiste un superset vuoto da riempire. */}
            {current.metricType === 'sets' && (
              <button
                type="button"
                onClick={() => {
                  setLinkingTo(current.id);
                  setPicking(true);
                }}
                className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-base font-medium text-slate-300 hover:bg-slate-900"
              >
                <Link2 aria-hidden className="size-5" />
                {t('log.superset.link')}
              </button>
            )}

          </>
        )}


        <button
          type="button"
          onClick={() => {
            setPicking(true);
          }}
          disabled={exercises.status !== 'ready'}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 text-base font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-50"
        >
          {exercises.status === 'loading' ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
          ) : (
            <Plus aria-hidden className="size-5" />
          )}
          {t('log.addExercise')}
        </button>

        {entries.length > 0 && (
          <>
            <details>
              <summary className="tap-target flex cursor-pointer list-none items-center text-xs tracking-wider text-slate-500 uppercase">
                {t('log.workoutNotes')}
              </summary>
              <textarea
                rows={2}
                aria-label={t('log.workoutNotes')}
                value={draft.notes}
                placeholder={t('log.notesPlaceholder')}
                onChange={(event) => {
                  draftController.setNotes(event.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-600"
              />
            </details>

            {error !== null && (
              <p role="alert" className="text-sm leading-relaxed text-red-400">
                {describeError(error, t)}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={saving || !ready}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle aria-hidden className="size-5 animate-spin" />
              ) : (
                <Save aria-hidden className="size-5" />
              )}
              {saving ? t('log.saving') : t('log.save')}
            </button>

            {!ready && <p className="text-center text-xs text-slate-500">{t('log.nothingDone')}</p>}
          </>
        )}
      </main>

      <RestTimerBar timer={timer} />

      {pickingDay && (
        <ProgramDayPicker
          programs={programs.data}
          workouts={history.data.workouts}
          onPick={loadProgramDay}
          onClose={() => {
            setPickingDay(false);
          }}
        />
      )}

      {(picking || managing !== null) && (
        <ExercisePicker
          exercises={exercises.data}
          performances={performances}
          variants={variantsByExercise}
          usage={usageByExercise}
          managing={managing}
          setManaging={setManaging}
          onPick={(exercise, variant) => {
            const entry = draftEntryFor(exercise, performances.get(exercise.id)?.entry ?? null);
            addToDraft(variant === undefined ? entry : { ...entry, variant });
            setLinkingTo(null);
            setPicking(false);
            setSaved(false);
          }}
          onCreate={handleCreateExercise}
          onRename={handleRenameExercise}
          onMerge={handleMergeExercises}
          onDelete={handleDeleteExercise}
          onRenameVariant={handleRenameVariant}
          onClearVariant={handleClearVariant}
          onOpenHistory={(exercise) => {
            // `push`, non `replace`: e' proprio il tasto indietro a dover
            // riportare al pannello, che l'URL qui sopra tiene in vita.
            void navigate(`/dashboard?exercise=${exercise.id}`);
          }}
          onClose={() => {
            setPicking(false);
            setLinkingTo(null);
            if (managingId !== null) setSearchParams({}, { replace: true });
          }}
        />
      )}
    </AppShell>
  );
}
