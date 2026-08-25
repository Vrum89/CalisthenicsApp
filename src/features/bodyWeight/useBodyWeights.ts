import type { BodyWeight } from '@/domain/types';
import { EMPTY_BODY_WEIGHTS, listBodyWeights } from '@/features/bodyWeight/bodyWeightRepository';
import { useAsyncData, type AsyncData } from '@/lib/useAsyncData';

export function useBodyWeights(): AsyncData<BodyWeight[]> {
  return useAsyncData(listBodyWeights, EMPTY_BODY_WEIGHTS);
}
