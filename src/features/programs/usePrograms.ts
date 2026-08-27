import {
  EMPTY_PROGRAMS,
  loadPrograms,
  type ProgramDetail,
} from '@/features/programs/programsRepository';
import { useAsyncData, type AsyncData } from '@/lib/useAsyncData';

export function usePrograms(): AsyncData<ProgramDetail[]> {
  return useAsyncData(loadPrograms, EMPTY_PROGRAMS);
}
