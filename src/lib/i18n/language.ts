import { isLanguage, type Language } from '@/lib/i18n/types';

/**
 * Scelta e memoria della lingua, fuori dal provider React.
 *
 * Sta qui perche' serve anche prima che React monti: la rete di sicurezza sul
 * foglio di stile (`styleGuard`) deve poter parlare, e in quel momento non c'e'
 * nessun contesto da cui leggere la lingua.
 */

const STORAGE_KEY = 'workout-diary.language';

/**
 * Inglese, non italiano: chi non parla nessuna delle due lingue supportate ha
 * molte piu' probabilita' di cavarsela in inglese. Un italiano viene comunque
 * riconosciuto da `navigator.languages` e non arriva mai fin qui.
 */
const FALLBACK: Language = 'en';

/** localStorage puo' lanciare in navigazione privata: la lingua non vale un crash. */
export function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Scelta non persistita: vale per questa sessione e basta.
  }
}

/** Scelta esplicita → lingua del dispositivo → inglese. */
export function detectLanguage(): Language {
  const stored = readStoredLanguage();
  if (stored) return stored;

  for (const candidate of navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language]) {
    const base = candidate.slice(0, 2).toLowerCase();
    if (isLanguage(base)) return base;
  }
  return FALLBACK;
}
