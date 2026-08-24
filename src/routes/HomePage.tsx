import { useState } from 'react';
import { Dumbbell, LoaderCircle, LogOut, RefreshCw, TriangleAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { metricConfig } from '@/domain/metrics';
import type { Exercise } from '@/domain/types';
import { useExercises } from '@/features/exercises/useExercises';
import { useAuth } from '@/features/auth/useAuth';

/** Raggruppa per categoria conservando l'ordine gia' deciso dalla query. */
function groupByCategory(exercises: readonly Exercise[]): [string, Exercise[]][] {
  const groups = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    const bucket = groups.get(exercise.category);
    if (bucket) {
      bucket.push(exercise);
    } else {
      groups.set(exercise.category, [exercise]);
    }
  }
  return [...groups];
}

function CatalogSection() {
  const { status, exercises, error, reload } = useExercises();

  if (status === 'loading') {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        Carico il catalogo…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-red-300">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span role="alert">{error}</span>
        </p>
        <button
          type="button"
          onClick={reload}
          className="tap-target flex items-center gap-2 rounded-lg px-3 text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          <RefreshCw aria-hidden className="size-4" />
          Riprova
        </button>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <p className="py-6 text-sm leading-relaxed text-slate-400">
        Il catalogo è vuoto. Esegui la parte finale di{' '}
        <code className="font-mono text-slate-300">supabase/schema.sql</code>, che inserisce gli
        esercizi di default.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groupByCategory(exercises).map(([category, items]) => (
        <section key={category}>
          <h3 className="text-xs font-medium tracking-wider text-slate-500 uppercase">
            {category}
          </h3>
          <ul className="mt-2 divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {exercise.name}
                </span>
                {/* L'etichetta viene dal registro metriche, non da un mapping locale. */}
                <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {metricConfig(exercise.metricType).label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Segnaposto in attesa delle schermate reali (logging dalla M5, dashboard dalla
 * M4). Mostrando il catalogo prova end-to-end la catena della Milestone 2:
 * schema, RLS, tipi del database, mapper e registro metriche.
 */
export function HomePage() {
  const { user, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Logout non riuscito.');
      setSigningOut(false);
    }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 py-6">
        <Dumbbell aria-hidden className="size-7 shrink-0 text-amber-400" />
        <h1 className="text-xl font-semibold tracking-tight">Workout Diary</h1>
      </header>

      <main className="flex-1 space-y-6">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-sm font-medium text-slate-400">Sessione attiva</h2>
          <p className="mt-1 truncate text-base font-medium text-slate-100">{user?.email}</p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-400">Catalogo esercizi</h2>
          <CatalogSection />
        </section>
      </main>

      <footer className="space-y-3 py-6">
        {error !== null && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          disabled={signingOut}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-base font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-50"
        >
          <LogOut aria-hidden className="size-5" />
          {signingOut ? 'Esco…' : 'Esci'}
        </button>
      </footer>
    </AppShell>
  );
}
