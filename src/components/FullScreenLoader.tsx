import { LoaderCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function FullScreenLoader({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <div
      className="px-safe flex min-h-dvh flex-col items-center justify-center gap-3 text-slate-400"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle aria-hidden className="size-8 animate-spin text-amber-400" />
      <p className="text-sm">{label ?? t('common.loading')}</p>
    </div>
  );
}
