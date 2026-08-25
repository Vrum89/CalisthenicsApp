import type { BodyWeight } from '@/domain/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { fromBodyWeight, toBodyWeight, type NewBodyWeight } from '@/lib/supabase/mappers';

export const EMPTY_BODY_WEIGHTS: BodyWeight[] = [];

/** Registro pesate, dal piu' vecchio al piu' recente: e' l'ordine del grafico. */
export async function listBodyWeights(): Promise<BodyWeight[]> {
  const { data, error } = await getSupabaseClient()
    .from('body_weights')
    .select('*')
    .order('measured_on', { ascending: true });

  if (error) throw toAppError(error, 'error.bodyWeight.load');
  return data.map(toBodyWeight);
}

export async function addBodyWeight(entry: NewBodyWeight): Promise<BodyWeight> {
  const { data, error } = await getSupabaseClient()
    .from('body_weights')
    .insert(fromBodyWeight(entry))
    .select()
    .single();

  if (error) throw toAppError(error, 'error.bodyWeight.save');
  return toBodyWeight(data);
}
