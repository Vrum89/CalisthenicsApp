import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type I18nContextValue } from '@/lib/i18n/I18nContext';
import { detectLanguage, storeLanguage } from '@/lib/i18n/language';
import {
  translate,
  type Language,
  type TranslationKey,
  type TranslationParams,
} from '@/lib/i18n/types';

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
