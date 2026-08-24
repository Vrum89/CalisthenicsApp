import type { TranslateFn, TranslationKey, TranslationParams } from '@/lib/i18n/types';

/**
 * Errore che sa come farsi raccontare all'utente.
 *
 * Porta una chiave di traduzione invece di una frase gia' scritta: il livello
 * dati non conosce la lingua corrente, e sceglierla li' avrebbe congelato i
 * messaggi in italiano. `message` resta in inglese, per console e stack trace.
 */
export class AppError extends Error {
  readonly i18nKey: TranslationKey;
  readonly params: TranslationParams | undefined;

  constructor(i18nKey: TranslationKey, message: string, params?: TranslationParams) {
    super(message);
    this.name = 'AppError';
    this.i18nKey = i18nKey;
    this.params = params;
  }
}

/** Traduce qualunque cosa sia stata lanciata in una frase mostrabile. */
export function describeError(error: unknown, t: TranslateFn): string {
  if (error instanceof AppError) {
    return t(error.i18nKey, error.params);
  }
  const detail = error instanceof Error ? error.message : String(error);
  return t('error.unexpected', { detail });
}
