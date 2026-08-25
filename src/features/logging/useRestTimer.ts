import { useCallback, useEffect, useRef, useState } from 'react';
import { beep, primeAudio, vibrate } from '@/lib/beep';

/**
 * Rest timer (spec §5.5): countdown fra una serie e l'altra.
 *
 * Non e' il cronometro del circuito — quello conta in su ed e' un dato salvato
 * (`Stopwatch`). Questo conta alla rovescia, non blocca niente e non finisce nel
 * database: il tempo di riposo per-serie e' fuori scope permanente (spec §10).
 *
 * Il tempo si misura su un istante di scadenza (`endsAt`), non decrementando un
 * contatore a ogni tick: col telefono in tasca il browser rallenta o sospende
 * gli intervalli, e un contatore che scala di uno alla volta perderebbe secondi
 * proprio quando non lo si guarda. Al rientro, la differenza fra due date e'
 * comunque esatta.
 */

export const REST_PRESETS: readonly number[] = [60, 90, 120];
export const DEFAULT_REST_SECONDS = 90;

const TICK_MS = 250;

export interface RestTimer {
  readonly running: boolean;
  /** Secondi al termine. Negativo dopo lo zero: e' l'overtime. */
  readonly remaining: number;
  /** Durata impostata, quella da cui riparte il prossimo riposo. */
  readonly duration: number;
  readonly start: () => void;
  readonly stop: () => void;
  readonly setDuration: (seconds: number) => void;
}

export function useRestTimer(): RestTimer {
  const [duration, setDurationState] = useState(DEFAULT_REST_SECONDS);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Il beep e' un evento, non uno stato: deve suonare una volta all'attraversare
  // lo zero, e un tick di 250 ms passerebbe piu' volte per lo stesso istante.
  const beeped = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;

    const id = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (!beeped.current && tick >= endsAt) {
        beeped.current = true;
        beep();
        vibrate();
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [endsAt]);

  const start = useCallback(() => {
    // Dentro il gesto: su iOS l'audio creato altrove nasce muto.
    primeAudio();
    beeped.current = false;
    const tick = Date.now();
    setNow(tick);
    setEndsAt(tick + duration * 1000);
  }, [duration]);

  const stop = useCallback(() => {
    setEndsAt(null);
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setDurationState(seconds);
    // Cambiare durata a timer acceso ri-basa il riposo in corso: e' il gesto di
    // chi si accorge a meta' che oggi gliene serve di piu'.
    setEndsAt((current) => (current === null ? null : Date.now() + seconds * 1000));
    beeped.current = false;
  }, []);

  const running = endsAt !== null;
  const remaining = running ? Math.round((endsAt - now) / 1000) : duration;

  return { running, remaining, duration, start, stop, setDuration };
}
