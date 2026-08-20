import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { AppShell, ThumbSpacer } from '@/components/AppShell';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Atterraggio del magic link (`/auth/callback`).
 *
 * Il grosso del lavoro lo fa supabase-js: `detectSessionInUrl` legge i token dal
 * frammento e li scambia per una sessione prima che `getSession()` risolva.
 * Qui restano due cose: leggere un eventuale errore restituito da Supabase, e
 * rimandare a casa appena la sessione c'e'.
 */
function readAuthErrorFromUrl(): string | null {
  // Letto durante il primo render, prima che supabase-js ripulisca l'URL.
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  return (
    fragment.get('error_description') ??
    fragment.get('error') ??
    query.get('error_description') ??
    query.get('error')
  );
}

export function AuthCallbackPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [urlError] = useState<string | null>(readAuthErrorFromUrl);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'loading') return <FullScreenLoader label="Ti sto facendo entrare…" />;

  if (status === 'anonymous') {
    return (
      <AppShell>
        <main className="flex flex-1 flex-col py-6">
          <ThumbSpacer />
          <div className="space-y-4">
            <TriangleAlert aria-hidden className="size-8 text-amber-400" />
            <h1 className="text-xl font-semibold">Accesso non riuscito</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              {urlError ?? 'Il link non è più valido: è scaduto oppure era già stato usato.'}
            </p>
            <p className="text-sm leading-relaxed text-slate-500">
              Ogni magic link vale una volta sola. Richiedine uno nuovo.
            </p>
            <Link
              to="/login"
              className="tap-target flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-amber-400"
            >
              Torna al login
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  return <FullScreenLoader label="Ti sto facendo entrare…" />;
}
