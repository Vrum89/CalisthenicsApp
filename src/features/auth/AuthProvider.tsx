import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/AuthContext';

/**
 * Traduce gli errori di Supabase Auth nei pochi casi che l'utente puo'
 * effettivamente incontrare e risolvere. Per tutto il resto passa il messaggio
 * originale: meglio un messaggio in inglese che uno generico e inutile.
 */
function toDisplayMessage(error: AuthError): string {
  const raw = error.message.toLowerCase();

  if (raw.includes('rate limit') || raw.includes('too many requests') || error.status === 429) {
    return "Troppe email inviate di recente. Supabase ne consente poche all'ora sul piano gratuito: riprova tra un po'.";
  }
  if (raw.includes('signups not allowed')) {
    return 'Le registrazioni sono disabilitate sul progetto Supabase. Attiva "Allow new users to sign up" in Authentication → Sign In / Providers.';
  }
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) {
    return "L'indirizzo email non sembra valido.";
  }
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) {
    return 'Impossibile raggiungere Supabase. Controlla la connessione (e che il progetto non sia in pausa).';
  }
  return error.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;

    // Sessione iniziale: ripresa dal localStorage oppure letta dall'URL del
    // magic link (detectSessionInUrl). getSession() attende l'inizializzazione
    // del client, quindi al ritorno il token nel frammento e' gia' consumato.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'anonymous');
    });

    // Da qui in poi: login, logout, refresh del token, e login avvenuti in
    // un'altra scheda dello stesso browser.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithMagicLink = useCallback(
    async (email: string): Promise<void> => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Deve essere nella allow-list "Redirect URLs" del progetto Supabase.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw new Error(toDisplayMessage(error));
    },
    [supabase],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(toDisplayMessage(error));
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      signInWithMagicLink,
      signOut,
    }),
    [status, session, signInWithMagicLink, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
