import { useCallback, useEffect, useState } from 'react';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface AsyncData<T> {
  status: LoadStatus;
  data: T;
  /** L'errore grezzo: la traduzione avviene nella vista, con `describeError`. */
  error: unknown;
  reload: () => void;
}

/**
 * Caricamento di dati remoti con hook e client Supabase diretto, senza TanStack
 * Query (spec §2.3 lo lascia opzionale). Il volume qui e' minuscolo — l'intero
 * storico sono poche centinaia di righe — e una cache condivisa non
 * guadagnerebbe niente che valga una dipendenza in piu'.
 *
 * `load` deve avere identita' stabile: passare una funzione di modulo, non una
 * lambda ricreata a ogni render.
 *
 * Lo stato viene scritto solo dalle callback della promise o dall'handler di
 * `reload`, mai in modo sincrono dentro l'effect: sarebbe un render a cascata.
 */
export function useAsyncData<T>(load: () => Promise<T>, empty: T): AsyncData<T> {
  const [state, setState] = useState<{ status: LoadStatus; data: T; error: unknown }>({
    status: 'loading',
    data: empty,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  /**
   * Reloads while keeping on screen the data already there.
   *
   * Clearing it meant, on every edit to a program, watching the list vanish and
   * come back: a white flash that reads as "something got reset". The old data
   * is correct until proven otherwise — and the proof arrives an instant later,
   * with the response.
   */
  const reload = useCallback(() => {
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;

    load()
      .then((data) => {
        if (active) setState({ status: 'ready', data, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', data: empty, error });
      });

    return () => {
      active = false;
    };
  }, [load, empty, reloadToken]);

  return { ...state, reload };
}
