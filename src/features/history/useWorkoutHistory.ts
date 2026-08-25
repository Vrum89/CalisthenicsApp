import { EMPTY_HISTORY, loadWorkoutHistory, type WorkoutHistory } from '@/features/history/historyRepository';
import { useAsyncData, type AsyncData } from '@/lib/useAsyncData';

export function useWorkoutHistory(): AsyncData<WorkoutHistory> {
  return useAsyncData(loadWorkoutHistory, EMPTY_HISTORY);
}
