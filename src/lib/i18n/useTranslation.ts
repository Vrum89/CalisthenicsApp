import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from '@/lib/i18n/I18nContext';

export function useTranslation(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useTranslation deve essere usato dentro <I18nProvider>.');
  }
  return value;
}
