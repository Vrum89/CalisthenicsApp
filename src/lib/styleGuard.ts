/**
 * Rete di sicurezza per il foglio di stile.
 *
 * Se la richiesta del CSS fallisce — una singhiozzata di rete al momento
 * sbagliato, o un asset non ancora propagato dopo un deploy — il browser non
 * riprova: la pagina resta a schermo senza uno stile, con i link viola e il
 * carattere con le grazie. L'app e' tecnicamente viva e completamente
 * inutilizzabile, e chi la guarda non ha modo di capire cosa e' successo.
 *
 * Qui si riprova una volta a caricare gli stessi file (con una query diversa,
 * per non ripescare la risposta fallita dalla cache HTTP) e, se non basta, si
 * ricarica la pagina una volta sola. Il flag in `sessionStorage` e' quello che
 * impedisce al rimedio di diventare un ciclo di ricariche.
 */

import { detectLanguage } from '@/lib/i18n/language';
import { translate } from '@/lib/i18n/types';

const RELOAD_FLAG = 'workout-diary:style-reload';

/**
 * Un foglio che non e' arrivato.
 *
 * Guardare `link.sheet` non basta: dopo una richiesta fallita Chromium attacca
 * al link un `CSSStyleSheet` lo stesso, ma **opaco** — leggerne le regole lancia
 * `SecurityError`, come se fosse di un altro dominio. Verificato abortendo la
 * richiesta del CSS in un browser vero.
 *
 * Da li' il criterio: un foglio del NOSTRO dominio, se e' arrivato, e' sempre
 * leggibile. Se lancia, o se e' vuoto, non e' arrivato. Per un foglio di
 * un'altra origine il `SecurityError` e' invece normale e non dice niente.
 */
function isMissing(link: HTMLLinkElement): boolean {
  const sheet = link.sheet;
  if (sheet === null) return true;

  const sameOrigin = new URL(link.href, document.baseURI).origin === window.location.origin;
  try {
    return sheet.cssRules.length === 0;
  } catch {
    return sameOrigin;
  }
}

function loadedStylesheets(): { total: number; failed: HTMLLinkElement[] } {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
  return { total: links.length, failed: links.filter(isMissing) };
}

function retry(link: HTMLLinkElement): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(link.href, document.baseURI);
    url.searchParams.set('retry', String(Date.now()));

    const replacement = document.createElement('link');
    replacement.rel = 'stylesheet';
    replacement.href = url.toString();
    replacement.addEventListener('load', () => {
      resolve(true);
    });
    replacement.addEventListener('error', () => {
      resolve(false);
    });
    document.head.append(replacement);
  });
}

/**
 * Ultima spiaggia: una copia in cache rotta, che ne' il tentativo ne' la
 * ricarica sanano.
 *
 * Si butta via tutto cio' che il service worker tiene da parte e si riparte
 * pulito. E' il "disinstalla e reinstalla la PWA" senza doverlo spiegare a
 * parole: da premere, non da eseguire a mano.
 */
async function resetCaches(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Niente service worker (o vietato): si prosegue con le cache.
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Cache API non disponibile: resta comunque la ricarica.
  }
  sessionStorage.removeItem(RELOAD_FLAG);
  window.location.reload();
}

/**
 * Il pannello si disegna con stili in linea, non con classi: il CSS e'
 * esattamente cio' che manca. Le stringhe passano dall'i18n come ovunque, con
 * la lingua letta a mano — React non e' ancora montato.
 */
function showRecoveryPanel(): void {
  const language = detectLanguage();
  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;overflow:auto;padding:24px;' +
    'background:#020617;color:#e2e8f0;font:16px/1.5 system-ui,sans-serif';

  const title = document.createElement('h1');
  title.textContent = translate(language, 'style.title');
  title.style.cssText = 'margin:0 0 12px;font-size:20px';

  const body = document.createElement('p');
  body.textContent = translate(language, 'style.body');
  body.style.cssText = 'margin:0 0 20px;max-width:34em';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = translate(language, 'style.reset');
  button.style.cssText =
    'min-height:44px;padding:0 20px;border:0;border-radius:12px;' +
    'background:#f59e0b;color:#020617;font:600 16px system-ui,sans-serif';
  button.addEventListener('click', () => {
    void resetCaches();
  });

  panel.append(title, body, button);
  document.body.prepend(panel);
}

export function guardStylesheets(): void {
  const { total, failed } = loadedStylesheets();

  // Nessun foglio esterno (dev server: lo stile lo inietta Vite) o tutti a
  // posto: e' il caso normale, non si tocca niente.
  if (total === 0 || failed.length === 0) {
    sessionStorage.removeItem(RELOAD_FLAG);
    return;
  }

  void Promise.all(failed.map(retry)).then((results) => {
    if (results.every(Boolean)) return;

    // Il secondo tentativo e' la ricarica completa: rifa' anche l'HTML, che a
    // questo punto potrebbe puntare a file che non esistono piu'.
    if (sessionStorage.getItem(RELOAD_FLAG) === null) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      return;
    }

    // Gia' ricaricato e ancora senza stile: non e' un singhiozzo di rete.
    showRecoveryPanel();
  });
}
