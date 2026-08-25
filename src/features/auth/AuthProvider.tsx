import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AppError } from '@/lib/errors';
import type { TranslationKey } from '@/lib/i18n/types';
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/AuthContext';

/**
 * Traduce gli errori di Supabase Auth nei pochi casi che l'utente puo'
 * effettivamente incontrare e risolvere. Per tutto il resto usa `fallbackKey`,
 * che porta con se' il messaggio originale in {detail}: meglio un dettaglio in
 * inglese che una frase generica e inutile.
 */
function toAppError(error: AuthError, fallbackKey: TranslationKey): AppError {
  const raw = error.message.toLowerCase();

  if (raw.includes('rate limit') || raw.includes('too many requests') || error.status === 429) {
    return new AppError('error.auth.rateLimit', error.message);
  }
  if (raw.includes('signups not allowed')) {
    return new AppError('error.auth.signupsDisabled', error.message);
  }
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) {
    return new AppError('error.auth.invalidEmail', error.message);
  }
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) {
    return new AppError('error.auth.network', error.message);
  }
  return new AppError(fallbackKey, error.message, { detail: error.message });
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
      if (error) throw toAppError(error, 'error.auth.sendFailed');
    },
    [supabase],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw toAppError(error, 'error.auth.signOutFailed');
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
