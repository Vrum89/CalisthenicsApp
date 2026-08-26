import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Unlink } from 'lucide-react';
import { formatMetricValue } from '@/domain/metrics';
import { EntryDetails } from '@/features/logging/EntryDetails';
import {
  currentRound,
  doneReps,
  entryValue,
  plannedTotal,
  roundComplete,
  roundCount,
  setReps,
  toggleSet,
  type DraftEntry,
  type DraftGroup,
} from '@/features/logging/draft';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Un superset in esecuzione (spec §5.6).
 *
 * La differenza con due esercizi affiancati sta tutta qui: si mostra **un round
 * alla volta**, non tutte le serie. "5 pull + 10 piegamenti x5" non si esegue
 * facendo cinque trazioni cinque volte e poi cinque serie di piegamenti — si
 * alterna, e la schermata deve assecondare quell'ordine invece di costringere ad
 * andare avanti e indietro fra due card.
 *
 * Il riposo parte alla fine del round, non dopo ogni casella: il riposo e' "dopo
 * averli fatti entrambi". E' l'unico comportamento che il raggruppamento
 * introduce davvero; tutto il resto sono due esercizi normali, con la loro
 * riga in dashboard e il loro storico.
 */
export function SupersetCard({
  group,
  variants,
  onChangeEntry,
  onChangeRounds,
  onUnlink,
  onRoundComplete,
}: {
  group: DraftGroup;
  /** Condizioni gia' usate, per esercizio. */
  variants: ReadonlyMap<string, readonly string[]>;
  onChangeEntry: (entryId: string, change: (entry: DraftEntry) => DraftEntry) => void;
  /** Aggiunge o toglie un round a tutti gli esercizi del gruppo insieme. */
  onChangeRounds: (delta: 1 | -1) => void;
  onUnlink: (entryId: string) => void;
  /** Chiamata quando l'ultimo esercizio del round e' concluso: fa partire il riposo. */
  onRoundComplete: () => void;
}) {
  const { t } = useTranslation();
  const rounds = roundCount(group);
  const suggested = currentRound(group);
  // Il round che si vede segue l'esecuzione, ma resta sfogliabile: per correggere
  // una serie di due round fa non si deve disfare quello che si e' gia' segnato.
  const [browsing, setBrowsing] = useState<number | null>(null);
  const round = browsing ?? suggested;
  const [editing, setEditing] = useState<string | null>(null);

  function complete(entry: DraftEntry) {
    onChangeEntry(entry.id, (current) => toggleSet(current, round));
    setEditing(null);

    // Il riposo va dopo l'ultimo del round: si guarda se gli altri hanno finito,
    // perche' `group` qui e' ancora quello di prima del cambiamento.
    const others = group.entries.filter((other) => other.id !== entry.id);
    if (others.every((other) => other.sets[round]?.done === true)) {
      onRoundComplete();
      if (browsing !== null && round + 1 < rounds) setBrowsing(round + 1);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-3">
      <header className="space-y-1">
        {/* "Superset: 25 Pull up + 50 Piegamenti" dice cosa si sta per fare
            meglio dei soli nomi. I totali sono quelli PREVISTI (tutte le serie,
            spuntate o no): un titolo che cambia a ogni casella sarebbe rumore.

            "Superset" e non "circuito": un circuito e' un esercizio a tempo, e
            nel catalogo ne esistono gia' col loro nome ("Circuito: 25 chin
            up"). Chiamare cosi' anche questo confonderebbe due cose diverse. */}
        <h2 className="text-lg leading-tight font-semibold text-slate-100">
          {t('log.superset.title', {
            parts: group.entries
              .map((entry) => `${String(plannedTotal(entry))} ${entry.name}`)
              .join(' + '),
          })}
        </h2>
        <p className="text-xs text-slate-500">
          {t('log.superset.rounds', { done: doneRounds(group), total: rounds })}
        </p>
      </header>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label={t('log.superset.previousRound')}
          disabled={round === 0}
          onClick={() => {
            setBrowsing(round - 1);
          }}
          className="tap-target flex items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <span className="text-sm font-medium text-slate-300 tabular-nums">
          {t('log.superset.round', { index: round + 1, total: rounds })}
        </span>
        <button
          type="button"
          aria-label={t('log.superset.nextRound')}
          disabled={round + 1 >= rounds}
          onClick={() => {
            setBrowsing(round + 1);
          }}
          className="tap-target flex items-center justify-center rounded-xl border border-slate-700 px-3 text-slate-300 disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      {/* Togliere un round serve dopo un aggancio: allineare al massimo e' la
          scelta prudente, ma i giri di troppo vanno via da qualche parte. */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => {
            onChangeRounds(-1);
            setBrowsing(null);
          }}
          disabled={rounds <= 1}
          className="tap-target flex items-center gap-1 rounded-lg px-2 text-slate-400 hover:text-slate-200 disabled:opacity-30"
        >
          <Minus aria-hidden className="size-4" />
          {t('log.superset.removeRound')}
        </button>
        <button
          type="button"
          onClick={() => {
            onChangeRounds(1);
            setBrowsing(null);
          }}
          className="tap-target flex items-center gap-1 rounded-lg px-2 text-slate-400 hover:text-slate-200"
        >
          <Plus aria-hidden className="size-4" />
          {t('log.superset.addRound')}
        </button>
      </div>

      {/* Il bracket a sinistra: dice a colpo d'occhio che questi esercizi sono
          legati, senza spiegarlo a parole. */}
      <ul className="space-y-2 border-l-2 border-amber-400/40 pl-2">
        {group.entries.map((entry) => {
          const set = entry.sets[round];
          const done = set?.done === true;

          return (
            <li key={entry.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={done}
                  aria-label={
                    done
                      ? t('log.setDone', { index: round + 1, reps: set?.reps ?? 0 })
                      : t('log.setTodo', { index: round + 1, reps: set?.reps ?? 0 })
                  }
                  onClick={() => {
                    if (done) {
                      setEditing(editing === entry.id ? null : entry.id);
                      return;
                    }
                    complete(entry);
                  }}
                  className={`tap-target flex shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-lg font-semibold tabular-nums ${
                    done
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-slate-600 bg-slate-900 text-slate-300'
                  }`}
                >
                  {done && <Check aria-hidden className="size-4" />}
                  {set?.reps ?? 0}
                </button>

                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{entry.name}</span>

                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {formatMetricValue(t, entry.metricType, entryValue(entry))}
                </span>

                <button
                  type="button"
                  aria-label={t('log.superset.unlink', { name: entry.name })}
                  onClick={() => {
                    onUnlink(entry.id);
                  }}
                  className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-600 hover:text-slate-300"
                >
                  <Unlink aria-hidden className="size-4" />
                </button>
              </div>

              {editing === entry.id && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
                  <button
                    type="button"
                    aria-label={t('log.decrease', { label: entry.name })}
                    onClick={() => {
                      onChangeEntry(entry.id, (current) =>
                        setReps(current, round, (current.sets[round]?.reps ?? 0) - 1),
                      );
                    }}
                    className="tap-target flex shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300"
                  >
                    <Minus aria-hidden className="size-4" />
                  </button>
                  <span className="min-w-0 flex-1 text-center text-lg font-semibold tabular-nums">
                    {set?.reps ?? 0}
                  </span>
                  <button
                    type="button"
                    aria-label={t('log.increase', { label: entry.name })}
                    onClick={() => {
                      onChangeEntry(entry.id, (current) =>
                        setReps(current, round, (current.sets[round]?.reps ?? 0) + 1),
                      );
                    }}
                    className="tap-target flex shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300"
                  >
                    <Plus aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeEntry(entry.id, (current) => toggleSet(current, round));
                      setEditing(null);
                    }}
                    className="tap-target shrink-0 rounded-lg border border-slate-700 px-3 text-sm text-slate-300"
                  >
                    {t('log.markUndone')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500">
        {group.entries
          .map((entry) => `${entry.name}: ${String(doneReps(entry).length)}×`)
          .join(' · ')}
      </p>

      {/* Zavorra, condizione e note restano raggiungibili anche da agganciati:
          un esercizio dentro un superset e' un esercizio come gli altri. */}
      <div className="space-y-1.5">
        {group.entries.map((entry) => (
          <EntryDetails
            key={entry.id}
            entry={entry}
            summary={entry.name}
            variants={variants.get(entry.exerciseId) ?? []}
            onChange={(change) => {
              onChangeEntry(entry.id, change);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function doneRounds(group: DraftGroup): number {
  let count = 0;
  for (let round = 0; round < roundCount(group); round += 1) {
    if (roundComplete(group, round)) count += 1;
  }
  return count;
}
