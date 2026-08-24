import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { AppShell, ThumbSpacer } from '@/components/AppShell';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useTranslation } from '@/lib/i18n/useTranslation';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [urlError] = useState<string | null>(readAuthErrorFromUrl);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'loading') return <FullScreenLoader label={t('callback.signingIn')} />;

  if (status === 'anonymous') {
    return (
      <AppShell>
        <main className="flex flex-1 flex-col py-6">
          <ThumbSpacer />
          <div className="space-y-4">
            <TriangleAlert aria-hidden className="size-8 text-amber-400" />
            <h1 className="text-xl font-semibold">{t('callback.failedTitle')}</h1>
            {/* `urlError` arriva da Supabase ed e' sempre in inglese: e' un
                dettaglio diagnostico, non una frase dell'interfaccia. */}
            <p className="text-sm leading-relaxed text-slate-400">
              {urlError ?? t('callback.invalidLink')}
            </p>
            <p className="text-sm leading-relaxed text-slate-500">{t('callback.oneTimeUse')}</p>
            <Link
              to="/login"
              className="tap-target flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-amber-400"
            >
              {t('callback.backToLogin')}
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  return <FullScreenLoader label={t('callback.signingIn')} />;
}
