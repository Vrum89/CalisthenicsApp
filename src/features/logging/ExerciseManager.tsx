import { useState } from 'react';
import { Check, Copy, LoaderCircle, Merge, Trash2, X } from 'lucide-react';
import { categoryLabel } from '@/domain/categories';
import { metricLabel } from '@/domain/metrics';
import type { Exercise } from '@/domain/types';
import type { ExerciseUsage } from '@/features/logging/lastPerformance';
import { formatCompactDate } from '@/lib/dates';
import { AppError, describeError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Confronto fra nomi come lo farebbe una persona: "dip" e "Dip " sono lo stesso. */
function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/**
 * Manutenzione di un esercizio del catalogo.
 *
 * Esiste per un motivo preciso: un refuso battuto una volta — "Dipp" invece di
 * "Dip" — crea una voce separata, e da quel momento lo storico di quell'esercizio
 * e' spezzato in due grafici che non si parlano. Senza un modo di ripararlo
 * resterebbero due scelte, entrambe cattive: tenersi la voce sbagliata per
 * sempre, o perdere la sessione che ci sta sotto.
 *
 * Per questo rinominare e fondere sono lo stesso gesto: scrivi il nome giusto,
 * e se quel nome esiste gia' il bottone diventa "unisci". Non e' un comando
 * separato da cercare — e' cosa succede naturalmente quando correggi l'errore.
 *
 * Stesso ragionamento sulle condizioni, che sono testo ripetuto su ogni voce:
 * si rinominano (fondendole) o si tolgono, dentro questo esercizio soltanto.
 */
export function ExerciseManager({
  exercise,
  siblings,
  usage,
  variants,
  onRename,
  onMerge,
  onDuplicate,
  onDelete,
  onRenameVariant,
  onClearVariant,
  onOpenHistory,
  onClose,
}: {
  exercise: Exercise;
  /** Gli altri esercizi del catalogo: servono a riconoscere un nome gia' preso. */
  siblings: readonly Exercise[];
  usage: ExerciseUsage | undefined;
  variants: readonly string[];
  onRename: (name: string) => Promise<void>;
  onMerge: (target: Exercise) => Promise<void>;
  onDuplicate: () => void;
  onDelete: () => Promise<void>;
  onRenameVariant: (from: string, to: string) => Promise<void>;
  onClearVariant: (variant: string) => Promise<void>;
  /** Apre lo storico di questo esercizio in Progressi. */
  onOpenHistory: () => void;
  onClose: () => void;
}) {
  const { t, language } = useTranslation();
  const [name, setName] = useState(exercise.name);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const trimmed = name.trim();
  const changed = trimmed.length > 0 && !sameName(trimmed, exercise.name);
  const clash = siblings.find((other) => sameName(other.name, trimmed)) ?? null;
  // Metriche diverse significano numeri che vogliono dire cose diverse: 30
  // ripetizioni e 30 secondi finirebbero sulla stessa linea.
  const mergeable = clash !== null && clash.metricType === exercise.metricType;

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmitName() {
    if (clash === null) {
      void run(() => onRename(trimmed));
      return;
    }
    if (!mergeable) {
      setError(
        new AppError('log.manage.mergeBlocked', `Metric mismatch with ${clash.name}`, {
          name: clash.name,
          metric: metricLabel(t, clash.metricType),
        }),
      );
      return;
    }
    void run(() => onMerge(clash));
  }

  return (
    <div className="space-y-4 py-3">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-100">{exercise.name}</h3>
          <p className="truncate text-xs text-slate-500">
            {categoryLabel(t, exercise.category)} · {metricLabel(t, exercise.metricType)}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('log.manage.back')}
          onClick={onClose}
          className="tap-target -mt-1 -mr-2 flex shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div className="space-y-1">
        <label htmlFor="manage-name" className="block text-xs text-slate-500">
          {t('log.create.name')}
        </label>
        <input
          id="manage-name"
          type="text"
          autoComplete="off"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          className="tap-target w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
        />

        {clash !== null && changed && (
          <p className="text-xs leading-relaxed text-amber-400">
            {mergeable
              ? t('log.manage.mergeHint', { name: clash.name, count: usage?.count ?? 0 })
              : t('log.manage.mergeBlocked', {
                  name: clash.name,
                  metric: metricLabel(t, clash.metricType),
                })}
          </p>
        )}

        <button
          type="button"
          disabled={busy || !changed || (clash !== null && !mergeable)}
          onClick={handleSubmitName}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : clash !== null ? (
            <Merge aria-hidden className="size-4" />
          ) : (
            <Check aria-hidden className="size-4" />
          )}
          {clash !== null ? t('log.manage.merge', { name: clash.name }) : t('log.manage.rename')}
        </button>
      </div>

      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs tracking-wider text-slate-500 uppercase">{t('log.variant')}</p>
          <ul className="space-y-1">
            {variants.map((variant) => (
              <li key={variant}>
                {editingVariant === variant ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      aria-label={t('log.variant')}
                      value={variantDraft}
                      onChange={(event) => {
                        setVariantDraft(event.target.value);
                      }}
                      className="tap-target min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100"
                    />
                    <button
                      type="button"
                      aria-label={t('log.manage.applyVariant')}
                      disabled={busy}
                      onClick={() => {
                        void run(async () => {
                          await onRenameVariant(variant, variantDraft);
                          setEditingVariant(null);
                        });
                      }}
                      className="tap-target flex shrink-0 items-center justify-center rounded-xl bg-amber-500 px-3 text-slate-950 disabled:opacity-40"
                    >
                      <Check aria-hidden className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVariant(variant);
                        setVariantDraft(variant);
                        setError(null);
                      }}
                      className="tap-target min-w-0 flex-1 truncate rounded-lg px-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                    >
                      {variant}
                    </button>
                    <button
                      type="button"
                      aria-label={t('log.manage.clearVariant', { name: variant })}
                      disabled={busy}
                      onClick={() => {
                        void run(() => onClearVariant(variant));
                      }}
                      className="tap-target flex shrink-0 items-center justify-center rounded-lg text-slate-600 hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-slate-500">{t('log.manage.variantHint')}</p>
        </div>
      )}

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={onDuplicate}
          className="tap-target flex w-full items-center gap-2 rounded-lg px-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          <Copy aria-hidden className="size-4 shrink-0" />
          {t('log.duplicate')}
        </button>

        {/* Eliminabile solo se non compare in nessun allenamento: altrimenti si
            dice dove sta, invece di offrire un comando che il database
            rifiuterebbe — e che comunque significherebbe cancellare quelle
            sessioni. Il modo di riparare un nome sbagliato gia' usato e' la
            fusione qui sopra, non l'eliminazione. */}
        {usage === undefined ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void run(onDelete);
            }}
            className="tap-target flex w-full items-center gap-2 rounded-lg px-2 text-sm text-red-400 hover:bg-slate-800 disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4 shrink-0" />
            {t('log.delete')}
          </button>
        ) : (
          <p className="px-2 text-xs leading-relaxed text-slate-500">
            {/* Nessuna libreria di pluralizzazione per due sole forme: due
                chiavi dicono la stessa cosa e restano traducibili. */}
            {t(usage.count === 1 ? 'log.deleteBlockedOne' : 'log.deleteBlocked', {
              count: usage.count,
              date: formatCompactDate(language, usage.lastDate),
            })}{' '}
            {/* Il rimando diventa un collegamento: la dashboard si apre gia' su
                questo esercizio, e tornando indietro si ritrova questa
                schermata aperta dov'era. */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="font-medium text-amber-400 underline underline-offset-2"
            >
              {t('log.manage.openHistory')}
            </button>
          </p>
        )}
      </div>

      {error !== null && (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {describeError(error, t)}
        </p>
      )}
    </div>
  );
}
