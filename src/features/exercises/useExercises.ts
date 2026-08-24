import { useCallback, useEffect, useState } from 'react';
import type { Exercise } from '@/domain/types';
import { listExercises } from '@/features/exercises/exercisesRepository';

/**
 * L'errore viaggia come oggetto, non come frase: la traduzione avviene nella
 * vista, cosi' cambiare lingua ridipinge anche i messaggi di errore gia' a
 * schermo invece di lasciarli congelati nella lingua in cui sono nati.
 */

export type LoadStatus = 'loading' | 'ready' | 'error';

interface LoadState {
  status: LoadStatus;
  exercises: Exercise[];
  error: unknown;
}

export interface ExercisesState extends LoadState {
  reload: () => void;
}

const INITIAL: LoadState = { status: 'loading', exercises: [], error: null };

/**
 * Caricamento del catalogo con hook + client diretto, senza TanStack Query
 * (spec §2.3 lo lascia opzionale). Da rivalutare alla Milestone 4, quando le
 * dashboard avranno piu' query da tenere sincronizzate.
 *
 * Lo stato e' un oggetto solo e viene scritto esclusivamente dalle callback
 * della promise o dall'handler di `reload`: mai in modo sincrono dentro
 * l'effect, che innescherebbe un render a cascata.
 */
export function useExercises(): ExercisesState {
  const [state, setState] = useState<LoadState>(INITIAL);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setState(INITIAL);
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;

    listExercises()
      .then((exercises) => {
        if (active) setState({ status: 'ready', exercises, error: null });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setState({ status: 'error', exercises: [], error: cause });
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { ...state, reload };
}
