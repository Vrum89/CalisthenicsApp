import { isLanguage, type Language } from '@/lib/i18n/types';

/**
 * Language detection and storage, outside the React provider.
 *
 * It lives here because it is needed before React mounts: the stylesheet safety
 * net (`styleGuard`) has to be able to speak, and at that point there is no
 * context to read the language from.
 */

const STORAGE_KEY = 'workout-diary.language';

/**
 * English, not Italian: someone who speaks neither supported language is far
 * more likely to get by in English. An Italian speaker is recognised by
 * `navigator.languages` anyway and never reaches this fallback.
 */
const FALLBACK: Language = 'en';

/** localStorage can throw in private browsing: the language is not worth a crash. */
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
    // Choice not persisted: it holds for this session only.
  }
}

/** Explicit choice → device language → English. */
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
