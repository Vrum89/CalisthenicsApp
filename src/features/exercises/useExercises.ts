import type { Exercise } from '@/domain/types';
import { listExercises } from '@/features/exercises/exercisesRepository';
import { useAsyncData, type AsyncData } from '@/lib/useAsyncData';

const EMPTY: Exercise[] = [];

export function useExercises(): AsyncData<Exercise[]> {
  return useAsyncData(listExercises, EMPTY);
}
