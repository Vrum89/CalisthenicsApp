import { en } from '@/lib/i18n/locales/en';
import { it, type TranslationKey } from '@/lib/i18n/locales/it';

export type { TranslationKey };

export const LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Etichette nella lingua stessa: "Italiano" resta "Italiano" anche in inglese. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  it: 'Italiano',
  en: 'English',
};

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { it, en };

export type TranslationParams = Record<string, string | number>;

export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some((language) => language === value);
}

/**
 * Sostituisce i segnaposto `{nome}`. Un segnaposto senza valore resta visibile
 * cosi' com'e': meglio un `{detail}` in faccia durante lo sviluppo che una frase
 * monca in produzione.
 */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  return interpolate(TRANSLATIONS[language][key], params);
}
