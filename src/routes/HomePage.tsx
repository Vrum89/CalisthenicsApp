import { useState } from 'react';
import { Dumbbell, LogOut } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Segnaposto della Milestone 1: dimostra che sessione e client Supabase
 * funzionano. Le schermate reali (logging, dashboard) arrivano dalla M4 in poi.
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

      <main className="flex-1 space-y-4">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-sm font-medium text-slate-400">Sessione attiva</h2>
          <p className="mt-1 truncate text-base font-medium text-slate-100">{user?.email}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
            Connesso a Supabase
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-400">Prossimo passo</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Milestone 2: schema del database, RLS e catalogo esercizi. Da lì in poi questa
            schermata diventa il diario vero.
          </p>
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
