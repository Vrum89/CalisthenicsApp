import type { Language } from '@/lib/i18n/types';

/**
 * Le date del dominio sono ISO (`2026-08-05`) e restano tali nel database.
 * Qui si formattano per la lettura, seguendo la lingua corrente.
 *
 * `new Date('2026-08-05')` verrebbe interpretata come UTC e in un fuso a ovest
 * mostrerebbe il giorno prima: la stringa va spezzata a mano.
 */
function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Data estesa: "5 ago 2026" / "5 Aug 2026". */
export function formatDate(language: Language, iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Data compatta per gli assi dei grafici: "05/08". */
export function formatShortDate(iso: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[2] ?? ''}/${match[1] ?? ''}` : iso;
}

/** Oggi in formato ISO, nel fuso locale: e' il default del campo data. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}
