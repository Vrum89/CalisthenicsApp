-- =============================================================================
-- Aggiunta: durata della finestra a tempo per esercizio.
--
-- Da eseguire una volta nella dashboard Supabase: SQL Editor → New query →
-- incolla → Run. E' idempotente: rieseguirlo non fa niente.
--
-- Serve perche' la tabella `exercises` esiste dalla Milestone 2, e il
-- `create table if not exists` di schema.sql non aggiunge colonne a una tabella
-- gia' creata. Chi applica schema.sql da zero ha gia' questa colonna e puo'
-- ignorare questo file.
--
-- Cosa fa: permette di dire che un "max ripetizioni" dura 8 minuti invece dei
-- 10 di default. `null` = la durata di default della metrica, quindi niente
-- cambia per gli esercizi che ci sono gia'.
-- =============================================================================

alter table exercises add column if not exists window_seconds int
  check (window_seconds is null or window_seconds between 10 and 7200);
