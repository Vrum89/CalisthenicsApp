import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { compareCategories } from '@/domain/categories';
import { metricConfig } from '@/domain/metrics';
import { buildHistory, computeStats } from '@/domain/stats';
import { describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useExercises } from '@/features/exercises/useExercises';
import { useWorkoutHistory } from '@/features/history/useWorkoutHistory';
import { CategoryTabs } from '@/features/dashboard/CategoryTabs';
import { EntryList } from '@/features/dashboard/EntryList';
import { ExerciseChart } from '@/features/dashboard/ExerciseChart';
import { StatCards } from '@/features/dashboard/StatCards';

export function DashboardPage() {
  const { t } = useTranslation();
  const exercisesQuery = useExercises();
  const historyQuery = useWorkoutHistory();

  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [pickedExerciseId, setPickedExerciseId] = useState<string | null>(null);

  const exercises = exercisesQuery.data;

  const categories = [...new Set(exercises.map((item) => item.category))].sort((a, b) =>
    compareCategories(t, a, b),
  );

  // Selezione derivata invece che sincronizzata: se la categoria cambia e
  // l'esercizio scelto non le appartiene piu', si ricade sul primo. Nessun
  // effect da tenere allineato.
  const category = pickedCategory ?? categories[0] ?? null;
  const inCategory = exercises.filter((exercise) => exercise.category === category);
  const exercise = inCategory.find((item) => item.id === pickedExerciseId) ?? inCategory[0] ?? null;

  // Niente useMemo: lo storico e' di poche centinaia di righe e il React
  // Compiler memoizza da se'. Scriverlo a mano qui faceva solo litigare il
  // compilatore con dipendenze che non riusciva a dimostrare stabili.
  const workoutsById = new Map(historyQuery.data.workouts.map((workout) => [workout.id, workout]));
  const stats = exercise
    ? computeStats(
        buildHistory(historyQuery.data.entries, workoutsById, exercise.id),
        exercise.metricType,
      )
    : null;

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
                      <StatCards stats={stats} metricType={exercise.metricType} />

                      {metricConfig(exercise.metricType).chartKind === 'none' ? (
                        <p className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-400">
                          {t('dashboard.noChartNote')}
                        </p>
                      ) : stats.comparable.length < 2 ? (
                        <p className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-400">
                          {t('dashboard.noChartSingle')}
                        </p>
                      ) : (
                        <ExerciseChart
                          points={stats.comparable}
                          metricType={exercise.metricType}
                        />
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
                        <EntryList stats={stats} metricType={exercise.metricType} />
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
