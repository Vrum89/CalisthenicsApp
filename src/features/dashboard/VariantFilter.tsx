import { variantLabel, type VariantGroup } from '@/domain/variants';
import { variantColor } from '@/features/dashboard/variantPalette';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Scelta della condizione (spec §6, estensione).
 *
 * Compare solo quando un esercizio ha più di una condizione: con una sola non
 * c'è niente da filtrare e il chip sarebbe un comando che non fa nulla.
 *
 * Il pallino accanto all'etichetta è lo stesso colore che la variante ha sul
 * grafico: è il ponte fra questo elenco e le barre. L'etichetta resta in colore
 * di testo — il colore lo porta il pallino, non le parole.
 */
export function VariantFilter({
  variants,
  selected,
  onSelect,
}: {
  variants: readonly VariantGroup[];
  /** `null` = tutte. */
  selected: string | null;
  onSelect: (variant: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <p className="text-xs tracking-wider text-slate-500 uppercase">{t('dashboard.variants')}</p>
      <div
        role="group"
        aria-label={t('dashboard.variants')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => {
            onSelect(null);
          }}
          className={`tap-target shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap ${
            selected === null
              ? 'bg-slate-700 text-slate-100'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('dashboard.variantAll')}
        </button>

        {variants.map((group, index) => {
          const active = group.variant === selected;
          return (
            <button
              key={group.variant}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onSelect(active ? null : group.variant);
              }}
              className={`tap-target flex shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap ${
                active ? 'bg-slate-700 text-slate-100' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: variantColor(index) }}
              />
              {variantLabel(t, group.variant)}
              <span className="text-xs text-slate-500 tabular-nums">{group.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
