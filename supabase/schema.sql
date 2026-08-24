-- =============================================================================
-- Workout Diary — schema Postgres (spec §3.3)
--
-- Da eseguire una volta sola nella dashboard Supabase: SQL Editor → New query
-- → incolla tutto → Run. E' idempotente: rieseguirlo non rompe nulla.
--
-- Convenzione: colonne in snake_case (il modello TypeScript e' camelCase, la
-- traduzione avviene nel mapper del data-access layer — CLAUDE.md).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELLE
-- -----------------------------------------------------------------------------

-- EXERCISES (catalogo per-utente)
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  category     text not null,
  metric_type  text not null check (metric_type in ('sets','reps','minutes','time','note')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),

  -- Aggiunta rispetto allo spec: il seed dei workout impone di "upsertare gli
  -- esercizi per name" (seed/seed-workouts-jul-aug-2026.json), e un upsert ha
  -- bisogno di un vincolo su cui fare ON CONFLICT. Impedisce anche due voci di
  -- catalogo con lo stesso nome e metriche diverse.
  constraint exercises_user_name_unique unique (user_id, name)
);

-- PROGRAMS (schede)
create table if not exists programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  start_date  date not null,
  end_date    date,                     -- null = attiva
  notes       text,
  created_at  timestamptz not null default now()
);

-- PROGRAM_DAYS (es. A, B)
create table if not exists program_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  program_id  uuid not null references programs(id) on delete cascade,
  name        text not null,
  sort_order  int  not null
);

-- PROGRAM_EXERCISES (slot esercizio + target di partenza)
create table if not exists program_exercises (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  program_day_id    uuid not null references program_days(id) on delete cascade,
  exercise_id       uuid not null references exercises(id),
  sort_order        int  not null,
  default_scheme    text,          -- es. "5x6" (null per metriche non-sets)
  default_weight_kg numeric,
  superset_key      uuid,          -- esercizi con la stessa chiave = un superset nel giorno
  superset_order    int            -- ordine dentro il superset (0,1,...)
);

-- WORKOUTS (allenamenti svolti)
create table if not exists workouts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  workout_date   date not null,
  workout_type   text not null check (workout_type in ('from_program','freestyle','test')),
  program_day_id uuid references program_days(id),  -- valorizzato se workout_type='from_program'
  original_date  text,     -- provenienza per righe migrate dal vecchio diario
  notes          text,
  created_at     timestamptz not null default now()
);

-- WORKOUT_EXERCISES (le "righe" del prototipo)
create table if not exists workout_exercises (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  workout_id        uuid not null references workouts(id) on delete cascade,
  exercise_id       uuid not null references exercises(id),
  sort_order        int  not null,
  scheme            text,       -- scheme usato stavolta, es. "5x8"
  reps_per_set      int[],      -- es. '{6,6,6,6,4}' (solo metric_type 'sets')
  metric_value      numeric,    -- metrica unificata; per 'sets' = sum(reps_per_set)
  added_weight_kg   numeric,    -- zavorra
  variant           text,
  notes             text,
  is_excluded       boolean not null default false,
  exclusion_reason  text,
  superset_key      uuid,          -- esercizi con la stessa chiave = un superset nel workout
  superset_order    int            -- ordine dentro il superset (0,1,...)
);

-- BODY_WEIGHTS (registro pesate, peso corporeo)
create table if not exists body_weights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg   numeric not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. INDICI
--
-- Ogni policy RLS filtra per user_id, quindi user_id sta in testa a ogni indice.
-- Gli altri seguono le letture reali: dashboard per esercizio in ordine di data,
-- precompilazione "batti l'ultima", elenco workout per data.
-- -----------------------------------------------------------------------------

create index if not exists exercises_user_idx           on exercises (user_id);
create index if not exists programs_user_idx            on programs (user_id, start_date desc);
create index if not exists program_days_program_idx     on program_days (program_id, sort_order);
create index if not exists program_exercises_day_idx    on program_exercises (program_day_id, sort_order);
create index if not exists workouts_user_date_idx       on workouts (user_id, workout_date desc);
create index if not exists workouts_program_day_idx     on workouts (program_day_id);
create index if not exists workout_exercises_workout_idx on workout_exercises (workout_id, sort_order);
create index if not exists workout_exercises_history_idx on workout_exercises (user_id, exercise_id);
create index if not exists body_weights_user_date_idx   on body_weights (user_id, measured_on desc);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — "solo i propri dati" (spec §3.3)
-- -----------------------------------------------------------------------------

alter table exercises          enable row level security;
alter table programs           enable row level security;
alter table program_days       enable row level security;
alter table program_exercises  enable row level security;
alter table workouts           enable row level security;
alter table workout_exercises  enable row level security;
alter table body_weights       enable row level security;

drop policy if exists "own rows - exercises"          on exercises;
drop policy if exists "own rows - programs"           on programs;
drop policy if exists "own rows - program_days"       on program_days;
drop policy if exists "own rows - program_exercises"  on program_exercises;
drop policy if exists "own rows - workouts"           on workouts;
drop policy if exists "own rows - workout_exercises"  on workout_exercises;
drop policy if exists "own rows - body_weights"       on body_weights;

create policy "own rows - exercises" on exercises
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows - programs" on programs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows - program_days" on program_days
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows - program_exercises" on program_exercises
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows - workouts" on workouts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows - workout_exercises" on workout_exercises
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows - body_weights" on body_weights
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. GRANT PER LA DATA API (PostgREST)
--
-- Nota dello spec §3.3: sui progetti creati dopo il 30/05/2026 i grant non sono
-- piu' impliciti. Questo progetto rientra nel caso, quindi vanno dati esplicitamente.
--
-- `anon` riceve solo l'uso dello schema, nessun diritto sulle tabelle: l'app non
-- ha accesso anonimo e non deve averne.
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  exercises, programs, program_days, program_exercises,
  workouts, workout_exercises, body_weights
  to authenticated;

-- -----------------------------------------------------------------------------
-- 5. CATALOGO ESERCIZI DI DEFAULT (spec §9)
--
-- Una sola funzione, usata sia dal trigger sui nuovi utenti sia dal backfill in
-- fondo al file: la lista dei default vive in un posto solo.
--
-- I nomi sono la forma canonica del catalogo: nome semplice per gli esercizi a
-- serie, qualificatore fra parentesi quando cambia la metrica ("Pull up (10 min)").
-- La migrazione dei dati storici (§8) mappera' i vecchi nomi su questi.
--
-- `category` contiene una CHIAVE neutra rispetto alla lingua, non un'etichetta:
-- l'app e' bilingue e traduce la chiave al momento di mostrarla
-- (src/domain/categories.ts). Nessun CHECK sulla colonna: una chiave
-- sconosciuta viene mostrata cosi' com'e', non fa fallire una schermata.
-- -----------------------------------------------------------------------------

create or replace function public.seed_default_exercises(target_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into exercises (user_id, name, category, metric_type)
  values
    -- Forza a serie (metrica 'sets': checkbox per serie, totale derivato)
    (target_user, 'Chin up',                     'strength_sets',  'sets'),
    (target_user, 'Pull up',                     'strength_sets',  'sets'),
    (target_user, 'Dip',                         'strength_sets',  'sets'),
    (target_user, 'Piegamenti',                  'strength_sets',  'sets'),
    (target_user, 'Hand stand push up',          'strength_sets',  'sets'),
    (target_user, 'Chin up EMOM',                'strength_sets',  'minutes'),

    -- Max ripetizioni in 10 minuti (metrica 'reps': un numero solo)
    (target_user, 'Pull up (10 min)',            'max_reps_10min', 'reps'),
    (target_user, 'Chin up (10 min)',            'max_reps_10min', 'reps'),
    (target_user, 'Dip (10 min)',                'max_reps_10min', 'reps'),
    (target_user, 'Dip anelli (10 min)',         'max_reps_10min', 'reps'),
    (target_user, 'Hand stand push up (10 min)', 'max_reps_10min', 'reps'),
    (target_user, 'V push up (10 min)',          'max_reps_10min', 'reps'),

    -- Massimali (metrica 'reps': ripetizioni del massimale)
    (target_user, 'Massimale: Pull up',          'max_effort',     'reps'),
    (target_user, 'Massimale: Chin up',          'max_effort',     'reps'),
    (target_user, 'Massimale: Dip',              'max_effort',     'reps'),
    (target_user, 'Massimale: Hand stand push up', 'max_effort',   'reps'),
    (target_user, 'Massimale: Piegamenti',       'max_effort',     'reps'),

    -- Corsa (metrica 'time': cronometro, piu' basso e' meglio)
    (target_user, 'Corsa 1 km',                  'running',        'time'),

    -- Altro (metrica 'note': testo libero, niente grafico)
    (target_user, 'Nota libera',                 'other',          'note')
  on conflict (user_id, name) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- I circuiti a tempo non sono nei default: sono sempre su misura ("25 chin up +
-- 50 push up"), quindi nascono dalla migrazione (§8) o si aggiungono a mano.

-- Trigger: ogni nuovo utente parte con il catalogo gia' pronto.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_exercises(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: il trigger vale solo da adesso in poi, e l'utente creato durante la
-- Milestone 1 esiste gia'. Idempotente grazie a ON CONFLICT DO NOTHING.
select public.seed_default_exercises(id) from auth.users;

-- Normalizzazione: le prime versioni del seed scrivevano l'etichetta italiana
-- nella colonna `category` invece della chiave. Converte le righe gia' esistenti.
-- Idempotente: alla seconda esecuzione nessuna riga corrisponde piu'.
update exercises as e
set category = mapping.key
from (values
  ('Forza (serie × rip)',      'strength_sets'),
  ('Max ripetizioni (10 min)', 'max_reps_10min'),
  ('Circuiti a tempo',         'time_circuits'),
  ('Massimali',                'max_effort'),
  ('Corsa',                    'running'),
  ('Altro',                    'other')
) as mapping(label, key)
where e.category = mapping.label;
