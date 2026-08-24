/**
 * Italiano — locale di riferimento.
 *
 * Le chiavi di questo file definiscono `TranslationKey`: ogni altra lingua deve
 * fornirle tutte, altrimenti il compilatore si lamenta. Aggiungere una stringa
 * qui e dimenticarsene in `en.ts` e' un errore di build, non un buco scoperto a
 * runtime.
 *
 * I segnaposto hanno la forma `{nome}`.
 */
export const it = {
  'app.name': 'Workout Diary',

  'language.label': 'Lingua',

  'common.retry': 'Riprova',
  'common.signOut': 'Esci',
  'common.signingOut': 'Esco…',
  'common.loading': 'Caricamento…',

  'login.subtitle': 'Accedi con la tua email: ti arriva un link, nessuna password.',
  'login.checkingSession': 'Controllo la sessione…',
  'login.emailLabel': 'Email',
  'login.emailPlaceholder': 'tu@esempio.it',
  'login.submit': 'Inviami il link',
  'login.submitting': 'Invio…',
  'login.sentTitle': 'Controlla la posta',
  'login.sentBody': 'Link di accesso inviato a {email}.',
  'login.sentHint':
    'Aprilo da questo dispositivo: vale una volta sola e scade dopo un’ora.',
  'login.sentSpam': 'Non lo vedi? Guarda nello spam prima di richiederlo.',
  'login.otherAddress': 'Usa un altro indirizzo',

  'callback.signingIn': 'Ti sto facendo entrare…',
  'callback.failedTitle': 'Accesso non riuscito',
  'callback.invalidLink': 'Il link non è più valido: è scaduto oppure era già stato usato.',
  'callback.oneTimeUse': 'Ogni magic link vale una volta sola. Richiedine uno nuovo.',
  'callback.backToLogin': 'Torna al login',

  'config.title': 'Configurazione incompleta',
  'config.body':
    'L’app non sa a quale progetto Supabase collegarsi. Mancano queste variabili d’ambiente:',
  'config.instructions':
    'Copia .env.example in .env.local, riempilo con i valori da Supabase (Project Settings → API Keys) e riavvia npm run dev.',
  'config.production': 'In produzione le stesse variabili vanno impostate su Vercel.',

  'home.session': 'Sessione attiva',
  'home.catalog': 'Catalogo esercizi',
  'home.catalogLoading': 'Carico il catalogo…',
  'home.catalogEmpty':
    'Il catalogo è vuoto. Esegui la parte finale di supabase/schema.sql, che inserisce gli esercizi di default.',

  'metric.sets.label': 'Serie',
  'metric.sets.caption': 'Barre: ripetizioni totali · linea azzurra: zavorra (kg)',
  'metric.reps.label': 'Ripetizioni',
  'metric.reps.caption': 'Ripetizioni completate — più in alto è meglio',
  'metric.minutes.label': 'Minuti',
  'metric.minutes.caption': 'Durata EMOM in minuti — più in alto è meglio',
  'metric.time.label': 'Tempo',
  'metric.time.caption': 'Tempo totale — più in basso è meglio',
  'metric.note.label': 'Nota',
  'metric.note.caption': 'Voce descrittiva, senza valore numerico',

  'metric.unit.reps': 'rip',
  'metric.unit.minutes': 'min',
  'metric.unit.seconds': 's',
  'metric.unit.none': '',

  'error.unexpected': 'Errore imprevisto. {detail}',
  'error.auth.rateLimit':
    'Troppe email inviate di recente. Il piano gratuito di Supabase ne consente poche all’ora: riprova tra un po’.',
  'error.auth.signupsDisabled':
    'Le registrazioni sono disabilitate sul progetto Supabase. Attiva «Allow new users to sign up» in Authentication → Sign In / Providers.',
  'error.auth.invalidEmail': 'L’indirizzo email non sembra valido.',
  'error.auth.network':
    'Impossibile raggiungere Supabase. Controlla la connessione, e che il progetto non sia in pausa.',
  'error.auth.sendFailed': 'Invio del link non riuscito. {detail}',
  'error.auth.signOutFailed': 'Logout non riuscito. {detail}',

  'error.db.missingTables':
    'Le tabelle non esistono ancora nel database. Applica supabase/schema.sql dalla dashboard Supabase (SQL Editor → New query).',
  'error.db.permissions':
    'Permessi mancanti sulla tabella. Controlla di aver eseguito anche la sezione GRANT di supabase/schema.sql.',
  'error.db.expiredSession': 'Sessione scaduta. Esci e rientra con un nuovo magic link.',
  'error.exercises.load': 'Non è stato possibile leggere il catalogo esercizi. {detail}',

  'error.domain.unknownMetricType': 'Tipo di metrica non riconosciuto dal dominio: «{value}».',
  'error.domain.unknownWorkoutType': 'Tipo di allenamento non riconosciuto dal dominio: «{value}».',
  'error.domain.invalidNumber': 'Valore numerico non valido dal database: «{value}».',
} as const;

export type TranslationKey = keyof typeof it;
