/**
 * Beep del rest timer (spec §5.5).
 *
 * Web Audio e non un file audio: un `<audio>` con un mp3 sarebbe una risorsa da
 * scaricare, da mettere in cache nel service worker e da tenere allineata, per
 * produrre 200 ms di onda sinusoidale. Qui l'onda la genera il browser.
 *
 * Il vincolo vero e' iOS: un AudioContext creato fuori da un gesto dell'utente
 * nasce sospeso e resta muto. Per questo `primeAudio()` va chiamato nel tap che
 * fa partire il timer — non quando il timer scade, che e' troppo tardi.
 */

const FREQUENCY_HZ = 880;
const DURATION_S = 0.18;
const PEAK_GAIN = 0.25;
/**
 * Pattern e non una vibrazione secca: due colpi si distinguono dalle notifiche
 * di tutto il resto, e con il telefono appoggiato per terra si sentono.
 */
const VIBRATION_PATTERN = [140, 70, 140];

let context: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  return context;
}

/**
 * Prepara (o risveglia) l'audio dentro un gesto dell'utente.
 *
 * Va chiamata a ogni avvio del timer, non una volta sola: il contesto puo'
 * tornare sospeso quando l'app finisce in background, ed e' esattamente cio' che
 * succede col telefono in tasca fra una serie e l'altra.
 */
export function primeAudio(): void {
  const audio = ensureContext();
  if (audio && audio.state === 'suspended') void audio.resume();
}

/**
 * Un beep breve. Silenzioso e senza errori se il browser non ha Web Audio o se
 * il contesto e' rimasto sospeso: il timer resta comunque visibile a schermo,
 * il suono e' un di piu'.
 */
export function beep(): void {
  const audio = ensureContext();
  if (!audio || audio.state !== 'running') return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(FREQUENCY_HZ, now);

  // Attacco e rilascio smussati: un gain che salta da 0 a 0.25 produce un
  // "click" udibile all'inizio e alla fine della nota.
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION_S);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + DURATION_S);
}

/**
 * Vibrazione, dove esiste. Su iOS non esiste e non e' un problema.
 *
 * Da sapere: la Vibration API viene annullata dal browser quando il documento
 * e' nascosto — schermo spento, app in background, altra scheda davanti. E'
 * nella specifica, non e' un bug aggirabile: se il telefono e' in tasca resta
 * solo il beep. Per questo il suono viene prima, e la vibrazione e' un extra.
 */
export function vibrate(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  navigator.vibrate(VIBRATION_PATTERN);
}
