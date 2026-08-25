-- =============================================================================
-- Workout Diary — esclusione delle voci non confrontabili (spec §6, §9)
--
-- FACOLTATIVO. Da eseguire solo se sei d'accordo con le quattro decisioni qui
-- sotto: sono giudizi sui TUOI dati, non correzioni tecniche.
--
-- `is_excluded` non cancella niente. La voce resta visibile in dashboard, in
-- grigio e con la ragione accanto, ma esce dai calcoli di best, trend e PR.
--
-- Perche' serve: per i circuiti la metrica e' `time`, quindi il record e' il
-- valore PIU' BASSO. Una riga con un tempo sbagliato per difetto non e' un
-- dettaglio: diventa il tuo record e ci resta per sempre.
--
-- Idempotente: rieseguirlo non cambia nulla.
-- =============================================================================

do $$
declare
  target_user uuid;
begin
  select id into strict target_user from auth.users;

  -- 1. 28/10/2025 — Circuito: 25 chin up in 1:56.
  --    Le altre due esecuzioni sono 7:49 e 6:00. Il diario stesso lo segna
  --    come possibile refuso. Cosi' com'e' e' il record del circuito.
  update workout_exercises we
  set is_excluded = true,
      exclusion_reason = 'Tempo anomalo (1:56 contro 7:49 e 6:00): probabile errore di trascrizione.'
  from workouts w, exercises e
  where we.workout_id = w.id and we.exercise_id = e.id and we.user_id = target_user
    and w.workout_date = '2025-10-28' and e.name = 'Circuito: 25 chin up';

  -- 2. 25/03/2026 — Circuito: 20 chin up (2s) + 50 bar dip in 4:57.
  --    L'annotazione originale era «4 57 06:04», ambigua. Le altre esecuzioni
  --    stanno fra 6:04 e 12:21. Anche questa e' diventata il record.
  update workout_exercises we
  set is_excluded = true,
      exclusion_reason = 'Annotazione ambigua nel diario originale («4 57 06:04»).'
  from workouts w, exercises e
  where we.workout_id = w.id and we.exercise_id = e.id and we.user_id = target_user
    and w.workout_date = '2026-03-25' and e.name = 'Circuito: 20 chin up (2s) + 50 bar dip';

  -- 3. 25/04/2026 — Circuito: 20 chin up + 20 dip @5kg eseguito SENZA zavorra.
  --    Il diario lo dice esplicitamente: non e' confrontabile con il target a 5 kg.
  update workout_exercises we
  set is_excluded = true,
      exclusion_reason = 'Eseguito senza zavorra: non confrontabile con il target a 5 kg.'
  from workouts w, exercises e
  where we.workout_id = w.id and we.exercise_id = e.id and we.user_id = target_user
    and w.workout_date = '2026-04-25' and e.name = 'Circuito: 20 chin up + 20 dip @5kg';

  -- 4. 22/12/2025 — Massimale: Piegamenti = 12 con 5 kg.
  --    Il diario annota «possibile refuso per pull up». E' il massimale piu'
  --    alto registrato per i piegamenti, quindi sposta il record.
  update workout_exercises we
  set is_excluded = true,
      exclusion_reason = 'Probabile refuso: annotato fra i massimali di pull up.'
  from workouts w, exercises e
  where we.workout_id = w.id and we.exercise_id = e.id and we.user_id = target_user
    and w.workout_date = '2025-12-22' and e.name = 'Massimale: Piegamenti';
end $$;

-- Verifica: elenca cosa e' stato escluso.
select w.workout_date, e.name, we.metric_value, we.exclusion_reason
from workout_exercises we
join workouts w on w.id = we.workout_id
join exercises e on e.id = we.exercise_id
where we.is_excluded
order by w.workout_date;
