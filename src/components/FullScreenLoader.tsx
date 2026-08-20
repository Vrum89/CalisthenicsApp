import { LoaderCircle } from 'lucide-react';

export function FullScreenLoader({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div
      className="px-safe flex min-h-dvh flex-col items-center justify-center gap-3 text-slate-400"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle aria-hidden className="size-8 animate-spin text-amber-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
