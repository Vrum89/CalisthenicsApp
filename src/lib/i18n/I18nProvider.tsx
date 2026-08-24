import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type I18nContextValue } from '@/lib/i18n/I18nContext';
import {
  isLanguage,
  translate,
  type Language,
  type TranslationKey,
  type TranslationParams,
} from '@/lib/i18n/types';

const STORAGE_KEY = 'workout-diary.language';

/**
 * Inglese, non italiano: chi non parla nessuna delle due lingue supportate ha
 * molte piu' probabilita' di cavarsela in inglese. Un italiano viene comunque
 * riconosciuto da `navigator.languages` e non arriva mai fin qui.
 */
const FALLBACK: Language = 'en';

/** localStorage puo' lanciare in navigazione privata: la lingua non vale un crash. */
function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Scelta non persistita: vale per questa sessione e basta.
  }
}

/** Scelta esplicita → lingua del dispositivo → inglese. */
function detectLanguage(): Language {
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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  // `lang` sul documento non e' cosmetico: guida sillabazione, correttore
  // ortografico e lettori di schermo.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    storeLanguage(next);
    setLanguageState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    }),
    [language, setLanguage],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}
