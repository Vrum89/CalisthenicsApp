import { TriangleAlert } from 'lucide-react';
import { AppShell, ThumbSpacer } from '@/components/AppShell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Mostrata al posto dell'app quando mancano le variabili d'ambiente Supabase.
 * Fallire subito e in chiaro invece di crashare piu' avanti dentro supabase-js.
 */
export function ConfigErrorScreen({ missing }: { missing: readonly string[] }) {
  const { t } = useTranslation();

  return (
    <AppShell>
      <main className="flex flex-1 flex-col gap-5 py-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <ThumbSpacer />

        <TriangleAlert aria-hidden className="size-8 text-amber-400" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-100">{t('config.title')}</h1>
          <p className="text-sm leading-relaxed text-slate-400">{t('config.body')}</p>
        </div>

        <ul className="space-y-1 rounded-xl border border-slate-700 bg-slate-900 p-4">
          {missing.map((name) => (
            <li key={name} className="font-mono text-sm text-amber-300">
              {name}
            </li>
          ))}
        </ul>

        <div className="space-y-2 text-sm leading-relaxed text-slate-400">
          <p>{t('config.instructions')}</p>
          <p>{t('config.production')}</p>
        </div>
      </main>
    </AppShell>
  );
}
