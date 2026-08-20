import { TriangleAlert } from 'lucide-react';
import { AppShell, ThumbSpacer } from '@/components/AppShell';

/**
 * Mostrata al posto dell'app quando mancano le variabili d'ambiente Supabase.
 * Fallire subito e in chiaro invece di crashare piu' avanti dentro supabase-js.
 */
export function ConfigErrorScreen({ missing }: { missing: readonly string[] }) {
  return (
    <AppShell>
      <main className="flex flex-1 flex-col gap-5 py-6">
        <ThumbSpacer />
        <TriangleAlert aria-hidden className="size-8 text-amber-400" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-100">Configurazione incompleta</h1>
          <p className="text-sm leading-relaxed text-slate-400">
            L&apos;app non sa a quale progetto Supabase collegarsi. Mancano queste variabili
            d&apos;ambiente:
          </p>
        </div>

        <ul className="space-y-1 rounded-xl border border-slate-700 bg-slate-900 p-4">
          {missing.map((name) => (
            <li key={name} className="font-mono text-sm text-amber-300">
              {name}
            </li>
          ))}
        </ul>

        <div className="space-y-2 text-sm leading-relaxed text-slate-400">
          <p>
            Copia <code className="font-mono text-slate-300">.env.example</code> in{' '}
            <code className="font-mono text-slate-300">.env.local</code>, riempilo con i valori da
            Supabase (Project Settings → API Keys) e riavvia{' '}
            <code className="font-mono text-slate-300">npm run dev</code>.
          </p>
          <p>In produzione: le stesse variabili vanno impostate su Vercel.</p>
        </div>
      </main>
    </AppShell>
  );
}
