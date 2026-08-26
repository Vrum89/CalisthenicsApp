-- =============================================================================
-- Aggiunta: fusione di due esercizi del catalogo.
--
-- Da eseguire una volta nella dashboard Supabase: SQL Editor → New query →
-- incolla → Run. E' idempotente (`create or replace`).
--
-- A cosa serve: un refuso battuto una volta — "Dipp" invece di "Dip" — crea una
-- voce di catalogo separata, e da quel momento lo storico di quell'esercizio e'
-- spezzato in due grafici che non si parlano. Rinominare la voce sbagliata col
-- nome giusto qui vuol dire fondere le due: le registrazioni passano
-- all'esercizio buono e la voce di troppo sparisce.
--
-- Perche' una funzione e non tre chiamate dall'app: spostare le righe e
-- cancellare l'esercizio devono riuscire o fallire insieme. A meta' strada
-- resterebbe un esercizio vuoto o, peggio, righe orfane.
-- =============================================================================

create or replace function public.merge_exercises(source uuid, target uuid)
returns integer
language plpgsql
-- `security invoker` (il default, esplicitato qui per chiarezza): la funzione
-- gira con i permessi di chi la chiama, quindi la RLS resta in vigore su ogni
-- riga toccata. Con `security definer` avrebbe scavalcato l'isolamento fra
-- utenti che e' il fondamento di tutto lo schema.
security invoker
set search_path = public
as $$
declare
  moved integer;
  source_metric text;
  target_metric text;
begin
  if source = target then
    raise exception 'merge_exercises: origine e destinazione coincidono';
  end if;

  -- La RLS gia' impedisce di vedere gli esercizi altrui, ma un `update` che
  -- punta le proprie righe a un id qualunque passerebbe: le policy di
  -- `workout_exercises` guardano `user_id`, non `exercise_id`. Il controllo
  -- esplicito evita di corrompere il proprio storico con un id inventato.
  select metric_type into source_metric
    from exercises where id = source and user_id = auth.uid();
  select metric_type into target_metric
    from exercises where id = target and user_id = auth.uid();

  if source_metric is null or target_metric is null then
    raise exception 'merge_exercises: esercizio inesistente o non tuo';
  end if;

  -- Metriche diverse significano numeri che vogliono dire cose diverse: 30
  -- ripetizioni totali e 30 secondi finirebbero sulla stessa linea.
  if source_metric <> target_metric then
    raise exception 'merge_exercises: metriche diverse (% e %)', source_metric, target_metric;
  end if;

  update workout_exercises set exercise_id = target where exercise_id = source;
  get diagnostics moved = row_count;

  update program_exercises set exercise_id = target where exercise_id = source;

  delete from exercises where id = source;

  return moved;
end;
$$;

grant execute on function public.merge_exercises(uuid, uuid) to authenticated;
