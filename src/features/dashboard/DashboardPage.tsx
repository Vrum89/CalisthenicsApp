import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { compareCategories } from '@/domain/categories';
import { metricConfig } from '@/domain/metrics';
import { buildHistory, computeStats } from '@/domain/stats';
import { listVariants, pointsWithVariant } from '@/domain/variants';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useExercises } from '@/features/exercises/useExercises';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import { deleteWorkoutEntry } from '@/features/logging/workoutRepository';
import { CategoryTabs } from '@/features/dashboard/CategoryTabs';
import { EntryList } from '@/features/dashboard/EntryList';
import { ExerciseChart } from '@/features/dashboard/ExerciseChart';
import { StatCards } from '@/features/dashboard/StatCards';
import { VariantFilter } from '@/features/dashboard/VariantFilter';

export function DashboardPage() {
  const { t } = useTranslation();
  const exercisesQuery = useExercises();
  const historyQuery = useWorkoutHistory();

  /**
   * `?exercise=<id>` apre la dashboard gia' su quell'esercizio.
   *
   * Serve ai link che arrivano da altrove — per esempio "queste registrazioni,
   * che trovi in Progressi" nella gestione del catalogo: mandare l'utente a una
   * schermata dove deve ricercare a mano cio' che gli hai appena nominato non e'
   * un collegamento, e' un rimando.
   */
  const [searchParams] = useSearchParams();
  const requestedExerciseId = searchParams.get('exercise');

  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [pickedExerciseId, setPickedExerciseId] = useState<string | null>(null);
  const [pickedEntryId, setPickedEntryId] = useState<string | null>(null);
  const [pickedVariant, setPickedVariant] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const exercises = exercisesQuery.data;

  const categories = [...new Set(exercises.map((item) => item.category))].sort((a, b) =>
    compareCategories(t, a, b),
  );

  // Selezione derivata invece che sincronizzata: se la categoria cambia e
  // l'esercizio scelto non le appartiene piu', si ricade sul primo. Nessun
  // effect da tenere allineato.
  // L'esercizio chiesto dall'URL vale finche' non se ne sceglie un altro a mano:
  // decide anche la categoria, altrimenti resterebbe fuori dalla scheda aperta.
  const requested =
    pickedExerciseId === null && requestedExerciseId !== null
      ? (exercises.find((item) => item.id === requestedExerciseId) ?? null)
      : null;

  const category = pickedCategory ?? requested?.category ?? categories[0] ?? null;
  const inCategory = exercises.filter((exercise) => exercise.category === category);
  const exercise =
    inCategory.find((item) => item.id === (pickedExerciseId ?? requested?.id)) ??
    inCategory[0] ??
    null;

  // Niente useMemo: lo storico e' di poche centinaia di righe e il React
  // Compiler memoizza da se'. Scriverlo a mano qui faceva solo litigare il
  // compilatore con dipendenze che non riusciva a dimostrare stabili.
  const workoutsById = new Map(historyQuery.data.workouts.map((workout) => [workout.id, workout]));
  const exerciseNames = new Map(exercises.map((item) => [item.id, item.name]));
  const allPoints = exercise
    ? buildHistory(historyQuery.data.entries, workoutsById, exercise.id, exerciseNames)
    : [];

  // Le condizioni si calcolano su TUTTE le voci, non su quelle filtrate: e' cio'
  // che tiene stabile l'ordine, e quindi i colori, mentre si filtra.
  const variants = listVariants(allPoints);
  const variant = variants.some((group) => group.variant === pickedVariant) ? pickedVariant : null;

  const points = variant === null ? allPoints : pointsWithVariant(allPoints, variant);
  const stats = exercise ? computeStats(points, exercise.metricType) : null;
  // Record e trend mescolano condizioni non confrontabili finche' non se ne
  // sceglie una: va detto, non lasciato dedurre.
  const mixed = variant === null && variants.length > 1;

  // Anche la voce evidenziata e' derivata: cambiando esercizio la selezione
  // decade da sola, senza un effect che la azzeri.
  const selectedEntryId =
    stats?.comparable.some((point) => point.entry.id === pickedEntryId) === true
      ? pickedEntryId
      : null;

  function selectEntry(entryId: string | null) {
    setPickedEntryId(entryId);
    if (entryId === null) return;
    // Sul telefono lo storico sta sotto il grafico: senza questo, toccare una
    // voce in fondo evidenzierebbe un punto fuori schermo.
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chartRef.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
  }

  const loading = exercisesQuery.status === 'loading' || historyQuery.status === 'loading';
  const failure =
    exercisesQuery.status === 'error'
      ? exercisesQuery.error
      : historyQuery.status === 'error'
        ? historyQuery.error
        : null;

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
          {t('dashboard.title')}
        </h1>
        <LanguageSwitcher />
      </header>

      {loading && (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {t('dashboard.loading')}
        </p>
      )}

      {failure !== null && (
        <div className="space-y-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-red-300">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span role="alert">{describeError(failure, t)}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              exercisesQuery.reload();
              historyQuery.reload();
            }}
            className="tap-target flex items-center rounded-lg px-3 text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && failure === null && (
        <main className="flex-1 space-y-4 pb-8">
          {categories.length === 0 ? (
            <p className="py-6 text-sm text-slate-400">{t('dashboard.noExercises')}</p>
          ) : (
            <>
              <CategoryTabs
                categories={categories}
                selected={category ?? ''}
                onSelect={(next) => {
                  setPickedCategory(next);
                  setPickedExerciseId(null);
                  setPickedVariant(null);
                }}
              />

              <div className="space-y-1">
                <label
                  htmlFor="exercise"
                  className="block text-xs tracking-wider text-slate-500 uppercase"
                >
                  {t('dashboard.exercise')}
                </label>
                <select
                  id="exercise"
                  value={exercise?.id ?? ''}
                  onChange={(event) => {
                    setPickedExerciseId(event.target.value);
                    setPickedVariant(null);
                  }}
                  className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
                >
                  {inCategory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {exercise && stats && (
                <>
                  {stats.points.length === 0 ? (
                    <p className="py-6 text-sm text-slate-400">{t('dashboard.noData')}</p>
                  ) : (
                    <>
                      {variants.length > 1 && (
                        <VariantFilter
                          variants={variants}
                          selected={variant}
                          onSelect={(next) => {
                            setPickedVariant(next);
                            setPickedEntryId(null);
                          }}
                        />
                      )}

                      <StatCards stats={stats} metricType={exercise.metricType} />

                      {mixed && (
                        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200/80">
                          {t('dashboard.variantMixed', { count: variants.length })}
                        </p>
                      )}

                      {metricConfig(exercise.metricType).chartKind === 'none' ? (
                        <p className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-400">
                          {t('dashboard.noChartNote')}
                        </p>
                      ) : stats.comparable.length < 2 ? (
                        <p className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-400">
                          {t('dashboard.noChartSingle')}
                        </p>
                      ) : (
                        <div ref={chartRef} className="scroll-mt-4">
                          <ExerciseChart
                            points={stats.comparable}
                            metricType={exercise.metricType}
                            selectedEntryId={selectedEntryId}
                            variants={variants}
                            selectedVariant={variant}
                          />
                        </div>
                      )}

                      <section className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <h2 className="text-sm font-medium text-slate-400">
                            {t('dashboard.history')}
                          </h2>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {t('dashboard.sessions')} {stats.points.length}
                          </span>
                        </div>
                        <EntryList
                          stats={stats}
                          metricType={exercise.metricType}
                          selectedEntryId={selectedEntryId}
                          onSelect={selectEntry}
                          onDelete={async (point) => {
                            await deleteWorkoutEntry(point.entry.id, point.entry.workoutId);
                            // La voce cancellata poteva essere quella evidenziata:
                            // lasciarla selezionata punterebbe a un id che non esiste.
                            selectEntry(null);
                            historyQuery.reload();
                          }}
                        />
                      </section>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </main>
      )}
    </AppShell>
  );
}
