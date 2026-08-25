-- =============================================================================
-- Rinomina della categoria "max ripetizioni (10 min)".
--
-- Da eseguire una volta nella dashboard Supabase: SQL Editor → New query →
-- incolla → Run. E' idempotente: rieseguirlo non trova piu' nulla da cambiare.
--
-- Perche': la categoria portava la durata nel nome, ma la finestra ora e'
-- una proprieta' dell'esercizio e puo' essere di 8 minuti come di 15. La chiave
-- diventa generica; l'etichetta mostrata la traduce l'app
-- (src/domain/categories.ts), che riconosce comunque anche la chiave vecchia.
-- =============================================================================

update exercises set category = 'max_reps_window' where category = 'max_reps_10min';
