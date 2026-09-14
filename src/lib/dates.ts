import type { Language } from '@/lib/i18n/types';

/**
 * Locale completo con cui formattare le date.
 *
 * `Intl` con il solo 'en' risolve a en-US, che scrive le date come 10/13/25.
 * In un diario personale letto nelle due lingue, la stessa riga cambierebbe
 * ordine premendo il toggle: 13/10 in italiano, 10/13 in inglese, senza niente
 * che segnali il cambio. Fissare en-GB tiene un ordine solo in tutta l'app.
 */
const DATE_LOCALE: Record<Language, string> = {
  it: 'it-IT',
  en: 'en-GB',
};

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

/**
 * Data estesa: "5 ago 2026" / "5 Aug 2026".
 *
 * Per una data letta da sola — la didascalia di una card, un tooltip. Il mese
 * a parole non si puo' fraintendere, mentre in un'app bilingue "10/13" e
 * "13/10" possono voler dire la stessa cosa o due cose diverse.
 */
export function formatDate(language: Language, iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(DATE_LOCALE[language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Data compatta: "13/10/25".
 *
 * Per gli elenchi, dove le date si leggono in colonna una sotto l'altra: tutte
 * larghe uguale, e con `tabular-nums` le cifre restano incolonnate. Il mese a
 * parole, in successione, e' rumore.
 *
 * L'ordine dei campi lo decide la lingua, non noi.
 */
export function formatCompactDate(language: Language, iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(DATE_LOCALE[language], {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

/** Giorno e mese per i tick degli assi, dove l'anno non ci sta: "13/10". */
export function formatAxisDate(language: Language, iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(DATE_LOCALE[language], { day: '2-digit', month: '2-digit' }).format(date);
}

// --- Calendar ---------------------------------------------------------------

/**
 * The parts of an ISO date. Needed to draw a calendar of our own: the system
 * one runs off the screen on the Razr cover display.
 */
export function isoParts(iso: string): { year: number; month: number; day: number } | null {
  const date = parseIsoDate(iso);
  if (!date) return null;
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

/** `month` is 0-based as in `Date`, and month 12 or -1 normalises itself. */
export function isoFrom(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  const shiftedMonth = String(date.getMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${shiftedMonth}-${shiftedDay}`;
}

/** The same date shifted by N days: "yesterday" without string arithmetic. */
export function shiftIso(iso: string, days: number): string {
  const parts = isoParts(iso);
  if (!parts) return iso;
  return isoFrom(parts.year, parts.month, parts.day + days);
}

/**
 * The month split into weeks, with `null` in the cells before the first and
 * after the last day. Only the weeks the month actually spans are generated: an
 * always-present sixth row would steal 44 px from a 360 px screen.
 *
 * Weeks start on Monday: the app formats dates as `it-IT` or `en-GB`, and both
 * locales start there.
 */
export function monthWeeks(year: number, month: number): (number | null)[][] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from<null>({ length: offset }).fill(null),
    ...Array.from({ length }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** Calendar heading: "agosto 2026" / "August 2026". */
export function formatMonth(language: Language, year: number, month: number): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[language], {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

/** Weekday initials, from Monday: L M M G V S D — or M T W T F S S. */
export function weekdayInitials(language: Language): string[] {
  const format = new Intl.DateTimeFormat(DATE_LOCALE[language], { weekday: 'narrow' });
  // 2024-01-01 is a Monday: it only serves to generate seven days in a row.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index)));
}

/** Today in ISO form, in the local timezone: the default of the date field. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}
