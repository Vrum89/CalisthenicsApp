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

// --- Calendario -------------------------------------------------------------

/**
 * Le parti di una data ISO. Servono a disegnare un calendario nostro: il
 * calendario di sistema, sul cover display del Razr, esce dallo schermo.
 */
export function isoParts(iso: string): { year: number; month: number; day: number } | null {
  const date = parseIsoDate(iso);
  if (!date) return null;
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

/** `month` e' 0-based come in `Date`. Normalizza da solo mese 12 o -1. */
export function isoFrom(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  const shiftedMonth = String(date.getMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${shiftedMonth}-${shiftedDay}`;
}

/** La stessa data spostata di N giorni: "ieri" senza aritmetica sulle stringhe. */
export function shiftIso(iso: string, days: number): string {
  const parts = isoParts(iso);
  if (!parts) return iso;
  return isoFrom(parts.year, parts.month, parts.day + days);
}

/**
 * Il mese diviso in settimane, con `null` nelle caselle prima del primo e dopo
 * l'ultimo giorno. Si generano solo le settimane che il mese occupa davvero:
 * una sesta riga sempre presente ruberebbe 44 px a uno schermo da 360.
 *
 * La settimana parte da lunedi': l'app formatta le date in `it-IT` o `en-GB`,
 * e in entrambe la settimana comincia li'.
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

/** Intestazione del calendario: "agosto 2026" / "August 2026". */
export function formatMonth(language: Language, year: number, month: number): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[language], {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

/** Le iniziali dei giorni, da lunedi': L M M G V S D — o M T W T F S S. */
export function weekdayInitials(language: Language): string[] {
  const format = new Intl.DateTimeFormat(DATE_LOCALE[language], { weekday: 'narrow' });
  // 2024-01-01 e' un lunedi': serve solo a generare sette giorni di fila.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index)));
}

/** Oggi in formato ISO, nel fuso locale: e' il default del campo data. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}
