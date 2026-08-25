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

  'nav.dashboard': 'Progressi',
  'nav.dashboardHint': 'Grafici, record e storico per esercizio',
  'nav.bodyWeight': 'Peso corporeo',
  'nav.bodyWeightHint': 'Registra una pesata e guarda l’andamento',
  'nav.back': 'Indietro',

  'dashboard.title': 'Progressi',
  'dashboard.exercise': 'Esercizio',
  'dashboard.noExercises': 'Nessun esercizio nel catalogo.',
  'dashboard.noData': 'Nessun allenamento registrato per questo esercizio.',
  'dashboard.noChartNote': 'Voce di solo diario: niente da graficare, sotto trovi le annotazioni.',
  'dashboard.noChartSingle': 'Serve più di una sessione con un valore per disegnare un andamento.',
  'dashboard.history': 'Storico',
  'dashboard.sessions': 'Sessioni',
  'dashboard.pr': 'PR',
  'dashboard.newRecord': 'Nuovo record',
  'dashboard.excluded': 'Esclusa dai calcoli',
  'dashboard.originalDate': 'data originale {date}',
  'dashboard.loading': 'Carico lo storico…',
  'dashboard.addedWeight': 'zavorra {kg} kg',

  'stat.first': 'Prima',
  'stat.best': 'Migliore',
  'stat.last': 'Ultima',
  'stat.trend': 'Trend',
  'stat.trendSub': 'prima → ultima',

  'bodyWeight.title': 'Peso corporeo',
  'bodyWeight.weight': 'Peso',
  'bodyWeight.date': 'Data',
  'bodyWeight.note': 'Nota',
  'bodyWeight.notePlaceholder': 'facoltativa',
  'bodyWeight.save': 'Registra',
  'bodyWeight.saving': 'Salvo…',
  'bodyWeight.saved': 'Pesata registrata.',
  'bodyWeight.empty': 'Nessuna pesata registrata. La prima diventa il punto di partenza.',
  'bodyWeight.chartCaption': 'Peso corporeo nel tempo',
  'bodyWeight.history': 'Pesate',
  'bodyWeight.loading': 'Carico le pesate…',
  'bodyWeight.invalid': 'Inserisci un peso fra 20 e 400 kg.',
  'bodyWeight.futureDate': 'La data non può essere nel futuro.',

  'error.history.load': 'Non è stato possibile leggere lo storico. {detail}',
  'error.bodyWeight.load': 'Non è stato possibile leggere le pesate. {detail}',
  'error.bodyWeight.save': 'Non è stato possibile salvare la pesata. {detail}',

  'category.strength_sets': 'Forza (serie × rip)',
  'category.max_reps_10min': 'Max ripetizioni (10 min)',
  'category.time_circuits': 'Circuiti a tempo',
  'category.max_effort': 'Massimali',
  'category.running': 'Corsa',
  'category.other': 'Altro',

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
