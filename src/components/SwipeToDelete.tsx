import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Oltre questo scorrimento la riga resta aperta invece di tornare al suo posto. */
const OPEN_AT_PX = 56;
/** Quanto si scopre il comando quando la riga e' aperta. */
const REVEAL_PX = 88;
/** Sotto questo spostamento orizzontale il gesto e' considerato uno scroll. */
const DIRECTION_PX = 8;

/**
 * Riga che si scosta verso sinistra e scopre un comando di cancellazione.
 *
 * Lo swipe non cancella da solo: scopre un bottone da premere. Un gesto
 * scivoloso che elimina un pezzo di storico al primo colpo sarebbe un modo
 * eccellente per perdere una sessione mentre si scorre l'elenco con le mani
 * sudate.
 *
 * Su desktop lo swipe non e' un gesto naturale, e nemmeno scopribile: li' il
 * comando compare al passaggio del mouse. In entrambi i casi resta raggiungibile
 * da tastiera (`focus-within`), perche' un'azione che esiste solo dentro un
 * gesto touch e' un'azione che per qualcuno non esiste.
 */
export function SwipeToDelete({
  children,
  onRequestDelete,
  label,
}: {
  children: ReactNode;
  onRequestDelete: () => void;
  /** Etichetta accessibile del comando: descrive cosa si cancella. */
  label: string;
}) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  // Stato e non ref: durante il trascinamento la riga deve seguire il dito senza
  // animazione, e questo dato serve proprio a decidere come disegnarla.
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  // `null` finche' non si capisce se il dito sta scorrendo o trascinando.
  const horizontal = useRef<boolean | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return;
    // Con la cattura il dito puo' uscire dalla riga senza che il gesto muoia a
    // meta', lasciandola scostata per sempre.
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY };
    horizontal.current = null;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    if (!from) return;

    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;

    // Si decide una volta sola in che direzione va il gesto: senza questo, uno
    // scroll verticale un po' storto aprirebbe le righe mentre si scorre.
    if (horizontal.current === null) {
      if (Math.abs(dx) < DIRECTION_PX && Math.abs(dy) < DIRECTION_PX) return;
      horizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!horizontal.current) return;

    setDragging(true);
    const base = open ? -REVEAL_PX : 0;
    // Solo verso sinistra, e non oltre la larghezza del comando scoperto.
    setOffset(Math.max(-REVEAL_PX, Math.min(0, base + dx)));
  }

  function handlePointerUp() {
    if (horizontal.current === true) {
      const shouldOpen = offset <= -OPEN_AT_PX;
      setOpen(shouldOpen);
      setOffset(shouldOpen ? -REVEAL_PX : 0);
    }
    start.current = null;
    horizontal.current = null;
    setDragging(false);
  }

  return (
    <div className="group relative overflow-hidden">
      {/* Il comando sta sotto la riga, scoperto dallo scorrimento. */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          aria-label={label}
          tabIndex={open ? 0 : -1}
          onClick={() => {
            onRequestDelete();
            setOpen(false);
            setOffset(0);
          }}
          className="flex w-22 items-center justify-center gap-1 bg-red-600 px-3 text-xs font-semibold text-slate-50"
        >
          <Trash2 aria-hidden className="size-4 shrink-0" />
          {t('common.delete')}
        </button>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${String(offset)}px)` }}
        // `touch-pan-y`: si dichiara al browser che il verticale resta suo (lo
        // scroll dell'elenco) e l'orizzontale e' nostro. Senza, Chrome tratta
        // il gesto come uno scroll e annulla i pointer events a meta' strada —
        // la riga non si scosta affatto.
        className={`relative touch-pan-y bg-slate-950 ${dragging ? '' : 'transition-transform'}`}
      >
        {children}

        {/* Il gemello per mouse e tastiera: invisibile finche' non serve, e mai
            al posto del contenuto — sta in overlay a destra, dove starebbe il
            comando scoperto dallo swipe.

            `pointer-events-none` finche' e' invisibile: un bottone trasparente
            che intercetta i tocchi nell'angolo della riga sarebbe peggio che
            non averlo. E `@media (hover: hover)` perche' su touch `:hover`
            resta attaccato dopo un tap, facendolo comparire quando non serve. */}
        <button
          type="button"
          aria-label={label}
          onClick={onRequestDelete}
          className="tap-target pointer-events-none absolute top-1/2 right-1 flex -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
