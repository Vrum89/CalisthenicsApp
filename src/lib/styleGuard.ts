/**
 * Safety net for the stylesheet.
 *
 * When the CSS request fails — a network hiccup at the wrong moment, or an
 * asset not yet propagated after a deploy — the browser does not retry: the
 * page stays up with no styling, purple links and a serif font. The app is
 * technically alive and completely unusable, and whoever is looking at it has
 * no way of telling what happened.
 *
 * Here the same files are requested once more (with a different query, so the
 * failed response is not served again from the HTTP cache) and, if that is not
 * enough, the page is reloaded exactly once. The `sessionStorage` flag is what
 * keeps the remedy from becoming a reload loop.
 */

import { detectLanguage } from '@/lib/i18n/language';
import { translate } from '@/lib/i18n/types';

const RELOAD_FLAG = 'workout-diary:style-reload';

/**
 * A stylesheet that never arrived.
 *
 * Checking `link.sheet` is not enough: after a failed request Chromium still
 * attaches a `CSSStyleSheet` to the link, but an **opaque** one — reading its
 * rules throws `SecurityError`, as if it came from another domain. Verified by
 * aborting the CSS request in a real browser.
 *
 * Hence the test: a stylesheet from OUR origin, once it has arrived, is always
 * readable. If it throws, or if it is empty, it did not arrive. For a
 * cross-origin sheet the `SecurityError` is normal instead, and tells nothing.
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
 * Last resort: a broken cached copy that neither the retry nor the reload can
 * heal.
 *
 * Everything the service worker keeps aside is thrown away and the app starts
 * clean. It is "uninstall and reinstall the PWA" without having to explain it:
 * a button to press, not a procedure to follow.
 */
async function resetCaches(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // No service worker (or not allowed): carry on with the caches.
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Cache API unavailable: the reload still stands.
  }
  sessionStorage.removeItem(RELOAD_FLAG);
  window.location.reload();
}

/**
 * What the server actually answers for that file.
 *
 * This is the line that tells the two families of causes apart instead of
 * guessing after the fact: `200 text/html` means the file is not there and
 * something answered with the page in its place; a network error means it never
 * arrived; `200 text/css` means the problem is a cached copy.
 */
async function probe(href: string): Promise<string> {
  try {
    const response = await fetch(href, { cache: 'reload' });
    return `${String(response.status)} ${response.headers.get('content-type') ?? '?'}`;
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'fetch failed';
  }
}

/**
 * The panel is drawn with inline styles, not classes: CSS is exactly what is
 * missing. The strings still come from i18n as everywhere else, with the
 * language read by hand — React has not mounted yet.
 */
function showRecoveryPanel(detail: string): void {
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

  // The technical line: it is for whoever has to work out what happened, and
  // it sits at the bottom because it means nothing to someone training.
  const diagnostics = document.createElement('p');
  diagnostics.textContent = translate(language, 'style.detail', {
    detail,
    version: __APP_VERSION__,
  });
  diagnostics.style.cssText = 'margin:20px 0 0;font-size:13px;color:#94a3b8;word-break:break-word';

  panel.append(title, body, button, diagnostics);
  document.body.prepend(panel);
}

export function guardStylesheets(): void {
  const { total, failed } = loadedStylesheets();

  // No external sheet (dev server: Vite injects the styles) or all of them
  // fine: the normal case, nothing to do.
  if (total === 0 || failed.length === 0) {
    sessionStorage.removeItem(RELOAD_FLAG);
    return;
  }

  void Promise.all(failed.map(retry)).then((results) => {
    if (results.every(Boolean)) return;

    // The second attempt is a full reload: it fetches the HTML too, which by
    // now may be pointing at files that no longer exist.
    if (sessionStorage.getItem(RELOAD_FLAG) === null) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      return;
    }

    // Already reloaded and still unstyled: this is not a network hiccup.
    const href = failed[0]?.href;
    void (href === undefined ? Promise.resolve('?') : probe(href)).then(showRecoveryPanel);
  });
}
