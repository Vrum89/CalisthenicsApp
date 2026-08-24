import { createContext } from 'react';
import type { Language, TranslateFn } from '@/lib/i18n/types';

export interface I18nContextValue {
  readonly language: Language;
  readonly setLanguage: (language: Language) => void;
  readonly t: TranslateFn;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
