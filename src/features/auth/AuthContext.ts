import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

/**
 * `loading` copre la finestra tra il mount e la risoluzione della sessione
 * (ripresa da localStorage o letta dall'URL del magic link). Tenerlo distinto
 * da `anonymous` evita il flash della pagina di login a ogni ricarica.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly session: Session | null;
  readonly user: User | null;
  /** Invia il magic link. Rigetta con un Error dal messaggio mostrabile. */
  readonly signInWithMagicLink: (email: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
