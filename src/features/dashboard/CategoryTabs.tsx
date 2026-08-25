import { categoryLabel } from '@/domain/categories';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Tab delle categorie (spec §6), scrollabili in orizzontale: a 360 px non ci
 * stanno sei etichette, e mandarle a capo farebbe ballare l'altezza della
 * pagina a ogni cambio di lingua.
 */
export function CategoryTabs({
  categories,
  selected,
  onSelect,
}: {
  categories: readonly string[];
  selected: string;
  onSelect: (category: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t('dashboard.title')}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {categories.map((category) => {
        const active = category === selected;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              onSelect(category);
            }}
            className={`tap-target shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {categoryLabel(t, category)}
          </button>
        );
      })}
    </div>
  );
}
