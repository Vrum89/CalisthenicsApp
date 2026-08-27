import { ClipboardList, X } from 'lucide-react';
import type { Workout } from '@/domain/types';
import type { ProgramDayWithExercises, ProgramDetail } from '@/features/programs/programsRepository';
import { activePrograms, suggestDay } from '@/features/programs/planning';
import { todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * Scelta del giorno di scheda da cui far nascere l'allenamento (spec §5.1).
 *
 * Il giorno proposto e' evidenziato, gli altri restano a un tocco: la proposta
 * ("tocca a B") serve a risparmiare una domanda quando la risposta e' ovvia, non
 * a decidere al posto di chi si allena. Anche le schede chiuse restano in
 * elenco, sotto: ripescare un vecchio programma e' un caso previsto.
 */
export function ProgramDayPicker({
  programs,
  workouts,
  onPick,
  onClose,
}: {
  programs: readonly ProgramDetail[];
  workouts: readonly Workout[];
  onPick: (day: ProgramDayWithExercises) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = todayIso();
  const active = activePrograms(programs, today);
  const closed = programs.filter((program) => !active.includes(program));

  function renderProgram(program: ProgramDetail, suggested: boolean) {
    const proposal = suggested ? suggestDay(program, workouts) : null;

    return (
      <li key={program.program.id} className="space-y-2">
        <p className="truncate text-sm font-medium text-slate-300">{program.program.name}</p>
        {program.days.length === 0 ? (
          <p className="text-xs text-slate-500">{t('programs.noDays')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {program.days.map((day) => {
              const isProposal = proposal?.day.id === day.day.id;
              return (
                <li key={day.day.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(day);
                    }}
                    className={`tap-target rounded-xl px-4 text-base font-semibold ${
                      isProposal
                        ? 'bg-amber-500 text-slate-950'
                        : 'border border-slate-700 bg-slate-900 text-slate-200'
                    }`}
                  >
                    {day.day.name}
                    <span className="ml-2 text-xs font-normal opacity-70">
                      {t(
                        day.exercises.length === 1 ? 'log.program.slot' : 'log.program.slots',
                        { count: day.exercises.length },
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('log.program.title')}
      className="px-safe pt-safe pb-safe fixed inset-0 z-30 flex flex-col bg-slate-950"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4">
        <header className="flex items-center gap-2 py-3">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
            {t('log.program.title')}
          </h2>
          <button
            type="button"
            aria-label={t('log.picker.close')}
            onClick={onClose}
            className="tap-target -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
          >
            <X aria-hidden className="size-6" />
          </button>
        </header>

        {programs.length === 0 ? (
          <p className="flex items-start gap-2 py-4 text-sm leading-relaxed text-slate-400">
            <ClipboardList aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('log.program.none')}
          </p>
        ) : (
          <div className="space-y-5 pb-6">
            {active.length > 0 && (
              <ul className="space-y-4">{active.map((program) => renderProgram(program, true))}</ul>
            )}

            {closed.length > 0 && (
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <p className="text-xs tracking-wider text-slate-500 uppercase">
                  {t('log.program.closed')}
                </p>
                <ul className="space-y-4">
                  {closed.map((program) => renderProgram(program, false))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
