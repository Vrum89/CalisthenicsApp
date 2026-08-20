import type { ReactNode } from 'react';

/**
 * Contenitore comune a tutte le schermate (spec §2.5).
 *
 * Colonna singola sempre, larghezza utile che regge da ~320 px (cover display,
 * ~360x360) a ~411 px (display principale) senza layout affiancati, e padding
 * safe-area su tutti i lati per notch, piega e ritagli fotocamera.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="px-safe pt-safe pb-safe flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4">{children}</div>
    </div>
  );
}

/**
 * Spaziatore che spinge il contenuto verso il basso, nel terzo raggiungibile
 * dal pollice sul display principale (~411x915, spec §2.5).
 *
 * Perche' non `justify-end`: quando il contenuto supera l'altezza della
 * viewport — cioe' sul cover a ~360x360 — l'overflow di `justify-end` esce
 * dal bordo superiore e non e' raggiungibile con lo scroll. Un flex spacer
 * con `min-h-0` invece si comprime fino a zero e restituisce lo spazio.
 */
export function ThumbSpacer() {
  return <div aria-hidden className="min-h-0 flex-1" />;
}
