import { useCallback, useEffect, useState } from 'react';
import { todayIso } from '@/lib/dates';
import { createDraft, type DraftEntry, type WorkoutDraft } from '@/features/logging/draft';
import type { WorkoutType } from '@/domain/types';

/**
 * Stato della bozza in corso, con salvataggio locale automatico.
 *
 * Il salvataggio locale non e' un lusso: durante un allenamento il telefono va
 * in tasca, lo schermo si spegne e il browser puo' scaricare la pagina; senza
 * questo, tornare all'app dopo il riposo vorrebbe dire ritrovare la scheda
 * vuota. Va in `localStorage` e non a database perche' una bozza non e' un
 * allenamento: finche' non la salvi, non e' successa.
 *
 * La chiave e' versionata: cambiando la forma di `WorkoutDraft` si passa a `v2`
 * e le bozze vecchie vengono ignorate invece di arrivare deformate alla UI.
 */

const STORAGE_KEY = 'workout-diary:draft:v1';

export interface DraftController {
  readonly draft: WorkoutDraft;
  readonly setDate: (date: string) => void;
  readonly setWorkoutType: (workoutType: WorkoutType) => void;
  readonly setNotes: (notes: string) => void;
  readonly addEntry: (entry: DraftEntry) => void;
  readonly updateEntry: (id: string, change: (entry: DraftEntry) => DraftEntry) => void;
  readonly removeEntry: (id: string) => void;
  readonly reset: () => void;
}

function readStored(): WorkoutDraft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const draft = parsed as WorkoutDraft;
    if (typeof draft.workoutDate !== 'string' || !Array.isArray(draft.entries)) return null;
    return draft;
  } catch {
    // Storage pieno, disabilitato o JSON corrotto: si riparte da una bozza
    // nuova. Perdere una bozza e' spiacevole, andare in errore all'apertura
    // dell'app mentre ci si allena e' peggio.
    return null;
  }
}

export function useWorkoutDraft(): DraftController {
  const [draft, setDraft] = useState<WorkoutDraft>(() => readStored() ?? createDraft(todayIso()));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Vedi sopra: la bozza vive comunque in memoria.
    }
  }, [draft]);

  const setDate = useCallback((workoutDate: string) => {
    setDraft((current) => ({ ...current, workoutDate }));
  }, []);

  const setWorkoutType = useCallback((workoutType: WorkoutType) => {
    setDraft((current) => ({ ...current, workoutType }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setDraft((current) => ({ ...current, notes }));
  }, []);

  const addEntry = useCallback((entry: DraftEntry) => {
    setDraft((current) => ({ ...current, entries: [...current.entries, entry] }));
  }, []);

  const updateEntry = useCallback((id: string, change: (entry: DraftEntry) => DraftEntry) => {
    setDraft((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === id ? change(entry) : entry)),
    }));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setDraft((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  }, []);

  const reset = useCallback(() => {
    setDraft(createDraft(todayIso()));
  }, []);

  return { draft, setDate, setWorkoutType, setNotes, addEntry, updateEntry, removeEntry, reset };
}
