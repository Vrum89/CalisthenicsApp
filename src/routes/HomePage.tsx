import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartLine, ChevronRight, CirclePlus, Dumbbell, LogOut, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { formatCompactDate } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import type { TranslationKey } from '@/lib/i18n/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/features/auth/useAuth';

const DESTINATIONS: readonly {
  to: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
}[] = [
  // Prima voce perche' e' quella che si tocca in palestra, di corsa: le altre
  // due si aprono da fermi, sul display principale.
  {
    to: '/log',
    icon: CirclePlus,
    labelKey: 'nav.log',
    hintKey: 'nav.logHint',
  },
  {
    to: '/dashboard',
    icon: ChartLine,
    labelKey: 'nav.dashboard',
    hintKey: 'nav.dashboardHint',
  },
  {
    to: '/weight',
    icon: Scale,
    labelKey: 'nav.bodyWeight',
    hintKey: 'nav.bodyWeightHint',
  },
];

/** Punto di partenza dell'app: registrazione, progressi, peso. */
export function HomePage() {
  const { user, signOut } = useAuth();
  const { t, language } = useTranslation();
  const [error, setError] = useState<unknown>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (cause) {
      setError(cause);
      setSigningOut(false);
    }
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 py-6">
        <Dumbbell aria-hidden className="size-7 shrink-0 text-amber-400" />
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {t('app.name')}
        </h1>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 space-y-3">
        {DESTINATIONS.map(({ to, icon: Icon, labelKey, hintKey }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 transition-colors hover:border-slate-600"
          >
            <Icon aria-hidden className="size-6 shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-slate-100">{t(labelKey)}</span>
              <span className="block text-sm text-slate-500">{t(hintKey)}</span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-600" />
          </Link>
        ))}
      </main>

      <footer className="space-y-3 py-6">
        <p className="truncate text-xs text-slate-600">{user?.email}</p>
        {/* Versione e data di build: solo qui, in fondo alla schermata iniziale.
            In una PWA il service worker puo' servire una copia vecchia, e senza
            questa riga "l'ho aggiornata?" non ha risposta. Fuori di qui non
            serve a niente, quindi non compare da nessun'altra parte. */}
        <p className="truncate text-xs text-slate-700 tabular-nums">
          {t('home.version', {
            version: __APP_VERSION__,
            date: formatCompactDate(language, __BUILD_TIME__.slice(0, 10)),
          })}
        </p>
        {error !== null && (
          <p role="alert" className="text-sm text-red-400">
            {describeError(error, t)}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          disabled={signingOut}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-base font-medium text-slate-300 hover:bg-slate-900 disabled:opacity-50"
        >
          <LogOut aria-hidden className="size-5" />
          {signingOut ? t('common.signingOut') : t('common.signOut')}
        </button>
      </footer>
    </AppShell>
  );
}
