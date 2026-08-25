import { useCallback, useRef, useState, useEffect } from 'react';
import { beep, primeAudio, vibrate } from '@/lib/beep';
import type { TranslationKey } from '@/lib/i18n/types';

/**
 * Conto alla rovescia dal vivo. Serve a due cose che si comportano identiche:
 * il riposo fra le serie (spec §5.5) e la finestra di un esercizio a tempo
 * ("quante ripetizioni in 10 minuti", §5.4). In entrambi i casi conta alla
 * rovescia, non blocca niente e non finisce nel database — il tempo di riposo
 * per-serie e' fuori scope permanente (spec §10), e la finestra dei 10 minuti e'
 * una regola dell'esercizio, non un risultato.
 *
 * Non e' il cronometro del circuito (`Stopwatch`): quello conta in su ed e' un
 * dato salvato.
 *
 * Il tempo si misura su un istante di scadenza (`endsAt`), non decrementando un
 * contatore a ogni tick: col telefono in tasca il browser rallenta o sospende
 * gli intervalli, e un contatore che scala di uno alla volta perderebbe secondi
 * proprio quando non lo si guarda. Al rientro, la differenza fra due date e'
 * comunque esatta.
 */

export const REST_PRESETS: readonly number[] = [60, 90, 120];
export const WINDOW_PRESETS: readonly number[] = [300, 600, 900];
export const DEFAULT_REST_SECONDS = 90;

const TICK_MS = 250;

/** Cosa sta scandendo il timer: cambia l'etichetta e i preset, non il motore. */
export interface TimerMode {
  readonly labelKey: TranslationKey;
  readonly overtimeKey: TranslationKey;
  readonly presets: readonly number[];
  readonly seconds: number;
  /**
   * Se la durata scelta a mano in barra vince su `seconds` ai riavvii.
   *
   * Vale per il riposo: i preset sono una preferenza del momento, e ogni serie
   * successiva deve ripartire da quella. NON vale per una finestra a tempo, dove
   * `seconds` viene dal dato — l'EMOM dura quanto dice il numero, e cambiarlo da
   * 12 a 10 deve cambiare anche il conto alla rovescia.
   */
  readonly keepManualDuration: boolean;
}

export const REST_MODE: TimerMode = {
  labelKey: 'log.rest.title',
  overtimeKey: 'log.rest.overtime',
  presets: REST_PRESETS,
  seconds: DEFAULT_REST_SECONDS,
  keepManualDuration: true,
};

export function windowMode(seconds: number): TimerMode {
  return {
    labelKey: 'log.window.title',
    overtimeKey: 'log.window.over',
    presets: WINDOW_PRESETS,
    seconds,
    keepManualDuration: false,
  };
}

export interface RestTimer {
  readonly running: boolean;
  /** Secondi al termine. Negativo dopo lo zero: e' l'overtime. */
  readonly remaining: number;
  /** Durata impostata, quella da cui riparte il prossimo conteggio. */
  readonly duration: number;
  readonly mode: TimerMode;
  /** Senza argomento riparte il riposo, che e' il caso normale. */
  readonly start: (mode?: TimerMode) => void;
  readonly stop: () => void;
  readonly setDuration: (seconds: number) => void;
}

export function useRestTimer(): RestTimer {
  const [mode, setMode] = useState<TimerMode>(REST_MODE);
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

  const start = useCallback(
    (next?: TimerMode) => {
      // Dentro il gesto: su iOS l'audio creato altrove nasce muto.
      primeAudio();
      beeped.current = false;
      // Il riposo riparte dalla durata scelta a mano finche' si resta sul
      // riposo; una finestra riparte sempre dalla sua, che viene dal dato.
      const sameMode = next !== undefined && next.labelKey === mode.labelKey;
      const seconds =
        next === undefined
          ? duration
          : next.keepManualDuration && sameMode
            ? duration
            : next.seconds;
      if (next) setMode(next);
      setDurationState(seconds);
      const tick = Date.now();
      setNow(tick);
      setEndsAt(tick + seconds * 1000);
    },
    [duration, mode],
  );

  const stop = useCallback(() => {
    setEndsAt(null);
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setDurationState(seconds);
    // Cambiare durata a timer acceso ri-basa il conteggio in corso: e' il gesto
    // di chi si accorge a meta' che oggi gliene serve di piu'.
    setEndsAt((current) => (current === null ? null : Date.now() + seconds * 1000));
    beeped.current = false;
  }, []);

  const running = endsAt !== null;
  const remaining = running ? Math.round((endsAt - now) / 1000) : duration;

  return { running, remaining, duration, mode, start, stop, setDuration };
}
