import { useTranslation } from '@/lib/i18n/useTranslation';
import { LANGUAGES, LANGUAGE_NAMES } from '@/lib/i18n/types';

/**
 * Le etichette sono i codici (IT / EN) e restano identiche in ogni lingua: sono
 * l'unica cosa nell'interfaccia che non va tradotta, altrimenti chi non capisce
 * la lingua corrente non ritrova il comando per cambiarla.
 */
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="flex shrink-0 overflow-hidden rounded-lg border border-slate-700"
    >
      {LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            title={LANGUAGE_NAMES[code]}
            onClick={() => {
              setLanguage(code);
            }}
            className={`tap-target px-3 text-sm font-medium transition-colors ${
              active ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
