import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Dumbbell, LoaderCircle, MailCheck } from 'lucide-react';
import { AppShell, ThumbSpacer } from '@/components/AppShell';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/features/auth/useAuth';

type FormState = 'idle' | 'sending' | 'sent';

export function LoginPage() {
  const { status, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') return <FullScreenLoader label="Controllo la sessione…" />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFormState('sending');
    try {
      await signInWithMagicLink(email);
      setFormState('sent');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invio del link non riuscito.");
      setFormState('idle');
    }
  }

  if (formState === 'sent') {
    return (
      <AppShell>
        <main className="flex flex-1 flex-col py-6">
          <ThumbSpacer />
          <div className="space-y-4">
            <MailCheck aria-hidden className="size-8 text-amber-400" />
            <h1 className="text-xl font-semibold">Controlla la posta</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Link di accesso inviato a{' '}
              <span className="font-medium text-slate-200">{email}</span>. Aprilo{' '}
              <span className="font-medium text-slate-200">da questo dispositivo</span>: vale una
              volta sola e scade dopo un&apos;ora.
            </p>
            <p className="text-sm leading-relaxed text-slate-500">
              Non lo vedi? Guarda nello spam prima di richiederlo.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormState('idle');
              }}
              className="tap-target -ml-3 flex items-center rounded-lg px-3 text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              Usa un altro indirizzo
            </button>
          </div>
        </main>
      </AppShell>
    );
  }

  const sending = formState === 'sending';

  return (
    <AppShell>
      <main className="flex flex-1 flex-col py-6">
        <ThumbSpacer />

        <header className="mb-6 space-y-2">
          <Dumbbell aria-hidden className="size-8 text-amber-400" />
          <h1 className="text-2xl font-semibold tracking-tight">Workout Diary</h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Accedi con la tua email: ti arriva un link, nessuna password.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={sending}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder="tu@esempio.it"
              className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 disabled:opacity-60"
            />
          </div>

          {error !== null && (
            <p role="alert" className="text-sm leading-relaxed text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || email.trim().length === 0}
            className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            {sending ? 'Invio…' : 'Inviami il link'}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
