import { useCallback, useEffect, useState } from 'react';
import type { Exercise } from '@/domain/types';
import { listExercises } from '@/features/exercises/exercisesRepository';

export type LoadStatus = 'loading' | 'ready' | 'error';

interface LoadState {
  status: LoadStatus;
  exercises: Exercise[];
  error: string | null;
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
        setState({
          status: 'error',
          exercises: [],
          error: cause instanceof Error ? cause.message : 'Caricamento non riuscito.',
        });
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { ...state, reload };
}
