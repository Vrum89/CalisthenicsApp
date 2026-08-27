Spec — Workout Diary (PWA)
> Documento di specifica per lo sviluppo. Pensato per essere eseguito da Claude Code, sezione per sezione.
> **Prosa in italiano; tutto il codice in TypeScript; identificatori, tabelle e colonne con naming parlante in inglese.**
> Convenzione naming: DB in `snake_case`, modello TypeScript in `camelCase` (vedi §3.4).
---
1. Obiettivo e contesto
Applicazione personale per registrare allenamenti di calisthenics e visualizzarne i progressi. Nasce come evoluzione di una dashboard React "usa e getta" con dati hardcoded: quel prototipo aveva buone dashboard e un buon modello concettuale delle metriche, ma dati e presentazione erano nello stesso file e la semantica di ogni metrica era sparsa nel codice.
Questo progetto conserva dati normalizzati e modello di dominio del prototipo, e riscrive l'impalcatura su basi pulite: prima il modello dati, poi la logica che lo interpreta, poi la UI.
Requisiti chiave concordati:
Input degli allenamenti (non solo visualizzazione).
Persistenza su database con sincronizzazione automatica tra dispositivi (telefono ↔ computer).
Uso potenzialmente multi-utente (ognuno vede solo i propri dati).
Le dashboard esistenti, alimentate dal database invece che da dati hardcoded.
Filosofia: semplice ma robusto.
---
2. Decisione architetturale
2.1 Piattaforma: PWA (Progressive Web App)
Scelta: PWA, non React Native.
Motivazione: un solo codice serve sia il web sia l'installazione su home di iOS/Android; nessuno store, nessun account sviluppatore, nessuna review; stack già noto (React/TS). Poiché è stato deciso che la connessione a internet è richiesta, l'unico vero punto debole di una PWA (l'offline) non è rilevante. Tutto ciò che serve — grafici, form, checkbox, cronometri, audio — è supportato in PWA.
2.2 Backend: Supabase
Supabase = Postgres gestito + API REST auto-generata + Auth già pronta. Concettualmente è "CAP-as-a-service": si definiscono le entità e si consuma un servizio, senza gestire il database né il deploy. Fornisce la sincronizzazione multi-dispositivo out of the box.
Vincoli noti del piano gratuito (verificare su supabase.com/pricing, cambiano):
Progetto messo in pausa dopo ~7 giorni di inattività → i dati NON si perdono, si riattiva con un click dalla dashboard. Prima riapertura dopo una pausa richiede un risveglio manuale.
Nessun backup automatico sul free tier → il backup è responsabilità dell'app (vedi §7, JSON export).
2.3 Stack tecnico
React + TypeScript + Vite (build tool). Tutto il codice applicativo è TypeScript (`.ts` / `.tsx`), niente JavaScript semplice.
vite-plugin-pwa per service worker, manifest e installabilità.
@supabase/supabase-js per DB e Auth. Generare i tipi del database con `supabase gen types typescript` e usarli al data-access layer, mappandoli sui modelli di dominio (§3.4).
Tailwind CSS per lo stile (il prototipo lo usa già).
recharts per i grafici (riuso della logica esistente).
lucide-react per le icone.
react-router-dom per la navigazione tra schermate.
(Opzionale, consigliato) TanStack Query per la gestione dello stato server (loading/error/refetch/caching): migliora la robustezza della sincronizzazione senza codice custom. Se si preferisce restare minimali in v1, hook + client Supabase diretti sono accettabili.
Config TypeScript in `strict` mode. Variabili d'ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Hosting statico della PWA: Vercel, Netlify o Cloudflare Pages (uno vale l'altro; tutti gratuiti per questo uso). È una decisione indipendente dal database.
2.4 Avvertenza piattaforma
Su iOS/Safari la Vibration API non è supportata. Il feedback del rest timer va quindi affidato a un beep audio (Web Audio API), che funziona ovunque; la vibrazione è un extra opzionale dove disponibile (Android). Le notifiche push non servono e non sono in scope.
2.5 Layout: mobile-first e due superfici del Razr 50
Priorità mobile prima di desktop. Device di riferimento primario: Motorola Razr 50 (flip foldable), che ha due superfici molto diverse, entrambe da supportare:
Display principale (aperto) — 6,9" pOLED, 1080 × 2640 px, ~413 ppi, aspect ratio 22:9 (molto più stretto e lungo di un 20:9 comune), notch a foro, piega orizzontale a metà, 120 Hz. Viewport CSS stimato ~411 × ~915 px, DPR ~2,6. Usato per tutto: creazione schede, dashboard, logging.
Cover display esterno (chiuso) — ~3,63" pOLED, 1066 × 1056 px (quasi quadrato), ~413 ppi. Viewport CSS stimato ~360–390 px quadrato (area utile ridotta dai ritagli fotocamera). Requisito v1: il flusso di logging deve essere pienamente usabile qui, perché è così che l'utente registra oggi (con Keep) durante l'allenamento — comodo e distraction-free. Creazione schede e dashboard non servono sul cover.
> Il Razr 50 consente di eseguire un'app sul cover display via *Impostazioni > Display esterno > App settings > "Allow on external display"* (stesso meccanismo con cui l'utente usa Keep). Una PWA installata compare come app: **da verificare** che sia elencata lì; in caso contrario, fallback = impacchettare la PWA come **TWA** (Trusted Web Activity, es. Bubblewrap) così da renderla un'app Android di prima classe che il launcher del cover elenca. Default resta PWA; TWA solo se necessario.
Conseguenze concrete di layout:
Sempre a colonna singola. Larghezza utile stretta (~360–411 px CSS): niente card affiancate o layout che richiedono larghezza. Le card statistiche vanno impilate.
Il flusso di logging deve stare in ~360×360 px (vincolo del cover). Quindi: un esercizio in focus alla volta (quello corrente), con checkbox grandi + rest timer + chrome minimo, e navigazione tra esercizi per swipe/next. Niente barre di navigazione ingombranti sul logging: solo la card attiva, in stile Keep. Questa stessa vista compatta funziona benissimo anche sul display principale.
Aspetto principale molto alto + uso a una mano. Da svolto, la parte alta è lontana dal pollice: azioni frequenti (spuntare una serie, rest timer, salvare) nel terzo inferiore / barra sticky in basso. Evitare azioni primarie ancorate in alto.
Tap target ≥ 44×44 px e spaziatura generosa (mani sudate). Le checkbox delle serie devono essere grandi — sul cover ne stanno poche in vista, quindi grandezza prima che densità.
Safe areas. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` + padding con `env(safe-area-inset-*)`, sia per notch/piega del principale sia per i ritagli fotocamera del cover.
Grafici responsive (solo display principale): recharts con `ResponsiveContainer` 100%; a ~360–411 px ridurre densità dei tick, evitare overflow della legenda del doppio asse, valutare scroll orizzontale o aggregazione per molte sessioni.
Degradazione graziosa. Non rompersi tra ~320 e ~411 px in entrambe le dimensioni; testo base ≥ 16 px, unità `rem`, icone vettoriali/SVG per la nitidezza ad alta densità.
PWA standalone: `display: standalone`, `theme-color`, manifest completo; gestire gli inset dinamici.
In sviluppo testare a due viewport: ~360×360 quadrato (cover, per il logging) e ~411 × 915 (principale), oltre a un sanity check desktop.
---
3. Modello dati
Principio guida (correzione del difetto principale del prototipo): Program = template, Workout = istanza. Il template dice cosa dovresti fare; il workout registra cosa hai fatto. Lo "scheme" (es. `5x6`) è descrittivo, non prescrittivo: è un punto di partenza editabile, non una gabbia.
3.1 Entità e relazioni
exercise — catalogo canonico. Definisce nome, categoria e tipo di metrica (`metricType`). È il `META` del prototipo promosso a dato.
program (la "scheda") — template con nome e periodo di validità (`startDate`, `endDate` nullable = attiva). Da qui si deriva automaticamente per quanto tempo si tiene una scheda.
programDay — i giorni del programma (es. "A" e "B", per "2 lezioni a settimana"). Ordinati.
programExercise — gli esercizi (slot) di un giorno, con target di partenza (scheme, weight).
workout — allenamento svolto in una data, con un tipo (`workoutType`): `from_program`, `freestyle`, `test`.
workoutExercise — le voci realmente eseguite in un workout: esercizio + valori reali. È l'equivalente delle righe (`ROWS`) del prototipo.
bodyWeight — registro pesate a sé (peso corporeo in una data), scollegato da programmi ed esercizi. Abilita la lettura della forza relativa.
Relazioni: `program 1—N programDay 1—N programExercise`; `workout 1—N workoutExercise`; ogni `workout` di tipo `from_program` punta a un `programDay`. Simmetria voluta: `programDay → programExercise` (lato template) e `workout → workoutExercise` (lato istanza). `bodyWeight` è indipendente (nessuna relazione con programmi/esercizi).
3.2 Il campo del valore metrico
Nel prototipo `v` era polimorfo (a volte ripetizioni, a volte secondi, a volte minuti). Qui si mantiene un unico campo `metricValue` derivato/unificato per far funzionare le dashboard senza modifiche, ma per gli esercizi a serie si conserva anche la struttura in `repsPerSet` (array), da cui `metricValue` è la somma. Così il dato è ricco (si sa a quale serie si è arrivati) invece che opaco.
3.3 Schema Postgres (Supabase)
Multi-utente tramite Row Level Security (RLS): ogni tabella ha `user_id` e le policy garantiscono che ciascuno veda solo i propri dati. `user_id` è denormalizzato anche sulle tabelle figlie per rendere le policy RLS semplici e veloci. Colonne in `snake_case`.
```sql
-- EXERCISES (catalogo per-utente)
create table exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  category     text not null,
  metric_type  text not null check (metric_type in ('sets','reps','minutes','time','note')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- PROGRAMS (schede)
create table programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  start_date  date not null,
  end_date    date,                     -- null = attiva
  notes       text,
  created_at  timestamptz not null default now()
);

-- PROGRAM_DAYS (es. A, B)
create table program_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  program_id  uuid not null references programs(id) on delete cascade,
  name        text not null,
  sort_order  int  not null
);

-- PROGRAM_EXERCISES (slot esercizio + target di partenza)
create table program_exercises (
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
create table workouts (
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
create table workout_exercises (
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
create table body_weights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg   numeric not null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- RLS: abilita e applica "solo i propri dati" su tutte le tabelle
alter table exercises          enable row level security;
alter table programs           enable row level security;
alter table program_days       enable row level security;
alter table program_exercises  enable row level security;
alter table workouts           enable row level security;
alter table workout_exercises  enable row level security;
alter table body_weights       enable row level security;

-- Esempio di policy (ripetere l'equivalente per ogni tabella):
create policy "own rows - exercises" on exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- ... idem per programs, program_days, program_exercises, workouts, workout_exercises, body_weights
```
> Nota Supabase: per progetti creati dopo il 30/05/2026 può servire aggiungere grant Postgres espliciti per l'accesso via Data API (PostgREST). Verificare in fase di setup.
3.4 Tipi TypeScript del dominio
Modello di dominio in `camelCase`. Le colonne DB sono `snake_case`: al data-access layer si usano i tipi generati da Supabase (snake_case) e si mappano su queste interfacce con un thin mapper. Scegliere una convenzione e restare coerenti.
```ts
export type MetricType = 'sets' | 'reps' | 'minutes' | 'time' | 'note';
export type WorkoutType = 'from_program' | 'freestyle' | 'test';

export interface Exercise {
  id: string;
  userId: string;
  name: string;
  category: string;
  metricType: MetricType;
  isActive: boolean;
  createdAt: string; // ISO timestamp
}

export interface Program {
  id: string;
  userId: string;
  name: string;
  startDate: string;       // ISO date
  endDate: string | null;  // null = attiva
  notes: string | null;
  createdAt: string;
}

export interface ProgramDay {
  id: string;
  userId: string;
  programId: string;
  name: string;            // es. "A", "B"
  sortOrder: number;
}

export interface ProgramExercise {
  id: string;
  userId: string;
  programDayId: string;
  exerciseId: string;
  sortOrder: number;
  defaultScheme: string | null;    // es. "5x6"
  defaultWeightKg: number | null;
  supersetKey: string | null;      // esercizi con la stessa chiave = un superset
  supersetOrder: number | null;    // ordine dentro il superset
}

export interface Workout {
  id: string;
  userId: string;
  workoutDate: string;     // ISO date
  workoutType: WorkoutType;
  programDayId: string | null;
  originalDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WorkoutExercise {
  id: string;
  userId: string;
  workoutId: string;
  exerciseId: string;
  sortOrder: number;
  scheme: string | null;         // es. "5x8"
  repsPerSet: number[] | null;   // es. [6, 6, 6, 6, 4]
  metricValue: number | null;    // unificato; per 'sets' = sum(repsPerSet)
  addedWeightKg: number | null;
  variant: string | null;
  notes: string | null;
  isExcluded: boolean;
  exclusionReason: string | null;
  supersetKey: string | null;      // esercizi con la stessa chiave = un superset
  supersetOrder: number | null;    // ordine dentro il superset
}

export interface BodyWeight {
  id: string;
  userId: string;
  measuredOn: string;   // ISO date
  weightKg: number;
  notes: string | null;
  createdAt: string;
}
```
---
4. Il registro delle metriche (dichiarativo, tipizzato)
Questo è il rimedio al difetto principale del vecchio codice. Nel prototipo, il significato di una metrica era codificato in cinque punti diversi (`META`, `CAPTION`, la logica del trend, il calcolo di `best`, `fmtVal`). Qui la semantica di ogni tipo di metrica è descritta una volta sola, in un oggetto di configurazione tipizzato; tutto il resto (widget di input, formattazione, `best` = min/max, direzione del trend, tipo di grafico, didascalia) deriva da qui.
```ts
export interface MetricConfig {
  label: string;                              // etichetta UI (IT ammesso)
  unit: string;                               // es. "reps", "min", "s"
  inputKind: 'set-checkboxes' | 'number' | 'stopwatch' | 'text';
  higherIsBetter: boolean;                    // true → best = max; false → best = min (time)
  formatValue: (value: number) => string;     // es. mm:ss per 'time'
  deriveValue?: (repsPerSet: number[]) => number; // per 'sets': somma
  caption: string;
  chartKind: 'bars-plus-weight-line' | 'line' | 'none';
}

export const METRIC_CONFIG: Record<MetricType, MetricConfig> = {
  sets:    { /* higherIsBetter: true,  inputKind: 'set-checkboxes', chartKind: 'bars-plus-weight-line', deriveValue: sum ... */ },
  reps:    { /* higherIsBetter: true,  inputKind: 'number',         chartKind: 'line' ... */ },
  minutes: { /* higherIsBetter: true,  inputKind: 'number',         chartKind: 'line' ... */ },
  time:    { /* higherIsBetter: false, inputKind: 'stopwatch',      chartKind: 'line', formatValue: mmss ... */ },
  note:    { /* inputKind: 'text',     chartKind: 'none' ... */ },
};
```
Riepilogo (i valori dettagliati vivono nel codice sopra):
metricType	unit	inputKind	higherIsBetter	formatValue	chartKind
`sets`	reps	set-checkboxes	true	numero	bars-plus-weight-line
`reps`	reps	number	true	numero	line
`minutes`	min	number	true	`N min`	line
`time`	s	stopwatch	false	`mm:ss`	line
`note`	—	text	—	—	none
Da `higherIsBetter` discendono sia il `best` (`Math.max` se true, `Math.min` se false) sia il segno/colore del trend (verde = miglioramento). Aggiungere una metrica nuova = aggiungere una entry qui, e basta.
---
5. Flussi di input
Regola generale sulla progressione (pattern "batti l'ultima" / progressive overload): quando si apre un workout, gli esercizi sono precompilati con l'ultima performance di quell'esercizio (l'ultima `workoutExercise` per quell'`exerciseId`), e tutti i valori restano liberi da editare. Mentre si edita, mostrare accanto il valore precedente come riferimento ("ultima: 5x7 · +5 kg").

Precedenza (correzione del 27/08/2026, sostituisce il "fallback" scritto qui sopra in origine): **in un workout `from_program` i valori scritti nella scheda vincono sull'ultima performance**, campo per campo; l'ultima performance riempie solo i campi che la scheda lascia vuoti (`defaultScheme`/`defaultWeightKg` a `null`). Motivo: scrivere `5x5` in una scheda e ritrovarsi `5x8` perché l'altra volta era andata così rende il campo inutile e la scheda non governabile. La progressione resta visibile come riferimento accanto al campo, ed è comunque quella a comandare nei workout `freestyle` e `test`, dove non c'è una scheda che dica altro.
5.1 Workout da scheda (flusso principale) — `from_program`
L'app individua il programma attivo (`endDate` null o che copre oggi) e propone il giorno "giusto": alternando i `programDay` per `sortOrder` (A→B→A) in base a quale giorno è stato usato nell'ultimo workout `from_program` di quel programma. Se nessun workout ancora registrato, propone il primo giorno.
La proposta è solo un suggerimento: l'utente può scegliere l'altro giorno, ripescare un programma vecchio, oppure passare a workout `freestyle`. Nessuna costrizione.
Gli esercizi del giorno vengono mostrati precompilati (vedi regola progressione). Per ciascuno, l'input dipende dal `metricType` (vedi §5.4).
5.2 Workout libero — `freestyle`
Costruzione ad-hoc: si aggiungono esercizi uno a uno dal catalogo. Ogni esercizio aggiunto è precompilabile con la sua ultima performance. Stessi widget di input per tipo. Questo flusso copre il desiderio "pescare singoli allenamenti da giorni passati" — non serve una funzione "copia" separata, è un effetto del modello.
5.3 Check / massimali — `test`
Workout di tipo `test`. Per ogni esercizio da testare, l'app mostra il massimale precedente (best/last) come valore da battere, e si inserisce il nuovo massimale (ripetizioni e kg). È lo stesso pattern "valore precedente mostrato", portato in primo piano — come faceva il vecchio file con "Migliore" e badge PR, ma nel momento dell'input.
5.4 Widget di input per tipo di metrica
sets — dallo `scheme` corrente (es. `5x6`) si generano N checkbox (N = numero di serie), ognuna del valore di ripetizioni previsto (6). Comportamento:
Tap sulla checkbox = serie completata → avvia il rest timer (vedi §5.5).
Ogni checkbox è editabile: toccandola si può correggere le ripetizioni di quella serie (es. 4 invece di 6) per registrare una serie incompleta. Tap secco quando fila liscio; correzione quando una serie va storta.
Lo scheme è editabile: alzarlo (5x7 → 5x8) cambia il valore delle checkbox; aggiungere una serie aggiunge una checkbox. Questo È il "ripetizioni libere".
Il totale (`metricValue`) è derivato dalla somma di `repsPerSet` (es. `[6,6,6,6,4]` → 28) tramite `deriveValue` del registro. Le dashboard leggono `metricValue` e funzionano identiche.
`addedWeightKg` (zavorra) editabile, con valore precedente mostrato come riferimento.
Due modalità (dettaglio in §5.6): fissa se lo scheme è "NxM"; aperta (serie illimitate, a sfinimento) se lo scheme è vuoto o non-"NxM".
reps — un solo numero (quante ripetizioni in 10 min).
time — il cronometro del circuito (count-up): parte all'inizio del circuito, si ferma alla fine, il tempo finale è il `metricValue` (in secondi). Elimina la trascrizione manuale del tempo (fonte storica di errori).
minutes — numero di minuti (EMOM).
note — testo libero.
5.5 Rest timer
Distinto dal cronometro del circuito. Il cronometro del circuito conta in su ed è un dato salvato. Il rest timer conta alla rovescia ed è solo un aiuto dal vivo, non salvato.
Comportamento (progettato per non essere rigido):
Parte al tap della checkbox di una serie (spuntare = serie finita = inizio riposo). Nessun gesto extra.
Non blocca nulla: si può spuntare la serie successiva prima o dopo la fine del countdown. È un suggerimento visivo, non un semaforo.
Overtime: arrivato a 0:00 dà un beep audio (Web Audio; vibrazione extra dove supportata, disattivabile) e prosegue contando in su, così si vede se il riposo è durato di più. Informa senza sgridare.
Durata: default sensato (1:30) con preset a un tap (1:00 / 1:30 / 2:00) più custom. Modificabile al volo, senza menù.
Skip/reset immediati. Spuntare la serie successiva resetta il timer per il riposo seguente.
Non registrato come dato. (Il tempo di riposo per-serie NON è una metrica del progetto — deciso esplicitamente.)
5.6 Modalità serie aperta e superset
Due estensioni della logica a serie, ortogonali tra loro (indipendenti) e senza nuovi tipi di metrica né modifiche pesanti allo schema.
Modalità aperta (serie a sfinimento / piramidi). Il widget `set-checkboxes` ha due modi, decisi dal dato:
Fissa: `scheme` = "NxM" → N caselle da M pre-generate (comportamento base).
Aperta: `scheme` vuoto o non-"NxM" (es. "progressive") → si parte con una serie e un bottone "+ aggiungi serie" ne appende quante se ne vogliono, illimitate; in ognuna si scrive il numero di ripetizioni e si spunta quando conclusa (avvia il rest timer). Copre le piramidi a sfinimento (es. 1→8 = `repsPerSet [1,2,3,4,5,6,7,8]`, `metricValue` 36). Il modello dati non cambia: è sempre `sets` con array libero e totale derivato; le dashboard leggono `metricValue` identiche.
Superset (gruppo di esercizi = "scheda nella scheda"). Un superset è composto da due o più esercizi eseguiti in sequenza, seguiti da un riposo, ripetuti per N round. Gli esercizi restano distinti (voce di catalogo, `repsPerSet` e linea in dashboard separati), ma sono legati da `supersetKey` (stessa chiave = stesso superset) e ordinati da `supersetOrder`. Il raggruppamento guida due comportamenti:
Input: gli esercizi del gruppo sono mostrati insieme (bracket visivo) e l'inserimento alterna round per round (serie es.1 → serie es.2 → riposo → round successivo). Il rest timer parte dopo l'ultimo esercizio del round, non dopo ogni singola serie — perché il riposo è "dopo averli fatti entrambi".
Round: il numero di round = numero di serie per esercizio (uguale tra gli esercizi del gruppo). Esempio "5 pull + 10 piegamenti ×5" = due esercizi, Pull up `[5,5,5,5,5]`→25 e Piegamenti `[10,10,10,10,10]`→50, `supersetKey` condivisa: 5 round, 10 serie totali.
Dove si dichiara: un superset si può creare al volo mentre si registra ("aggancia un esercizio a questo"), oppure una volta per tutte nella scheda, agganciando due slot consecutivi di un giorno (`program_exercises.superset_key`). Un giorno di scheda con slot agganciati si apre nel logging già come circuito a round, con i round pareggiati fra i suoi esercizi. Nella scheda un superset è un tratto *contiguo* di slot: spostare, sganciare o cancellare uno slot rinormalizza le chiavi del giorno (un superset di uno non è un superset).
> Questo è un raggruppamento *leggero* (due colonne nullable, nessuna tabella nuova). Un sistema di "blocchi" generico e annidato (riposo prescritto per-blocco, round come attributo esplicito, blocchi arbitrari) è deliberatamente rimandato al backlog.
5.7 Registro pesate (peso corporeo)
Input minimale e indipendente dai workout: un campo numero (kg) + data (default oggi) + nota opzionale, che aggiunge una riga a `body_weights`. Accessibile in qualsiasi momento. Nudge all'avvio di un nuovo programma ("registri il peso di oggi?") per garantire una baseline per mesociclo — mai obbligatorio, nessuna cadenza forzata.
---
6. Dashboard
Riuso delle dashboard del prototipo, ora alimentate da Supabase invece che da dati hardcoded. Componenti:
Tab delle categorie (scrollabili).
Select dell'esercizio (filtrato per categoria).
Card statistiche: Prima / Migliore / Ultima / Trend. `best` e direzione del trend derivano da `higherIsBetter` del registro metriche (per `time`, più basso è meglio).
Grafico (`ComposedChart` recharts): barre + linea kg per `sets`, linea per gli altri, asse in `mm:ss` per `time`.
Elenco voci in ordine cronologico inverso, con badge PR sul record.
Trend peso corporeo: grafico a linea del peso nel tempo (da `body_weights`), come sezione a sé rispetto alle metriche per-esercizio.
Le voci con `isExcluded = true` (allenamento fatto sotto infortunio, non al massimo) sono mostrate ma escluse dai calcoli di best/trend/PR, e visualizzate attenuate con l'`exclusionReason`.
---
7. Backup / JSON export
Rete di sicurezza contro la pausa/perdita del progetto Supabase free tier (nessun backup automatico lato Supabase). L'app esporta tutti i dati dell'utente (exercises, programs + days + exercises, workouts + exercises, body_weights) in un unico file JSON scaricabile su richiesta. Quel file è il backup: vive indipendente da Supabase e permette di ripartire su qualsiasi altro database. Zero lock-in.
(Opzionale) Mantenere anche l'export CSV del prototipo (separatore `;` + BOM per Excel) come comodità secondaria.
---
8. Migrazione dati esistenti
Il prototipo contiene 200+ righe già normalizzate a mano (refusi, date sballate, tempi anomali, duplicati già risolti). Questo lavoro si migra, non si riscrive.
Script one-off (TypeScript) che legge l'array `ROWS` del vecchio file e popola Supabase:
Vecchio `META` → tabella exercises. Tradurre i tipi metrica del prototipo → nuovi: `serie`→`sets`, `rip`→`reps`, `min`→`minutes`, `tempo`→`time`, `nota`→`note`. Riempire `category` e `metric_type`.
Righe raggruppate per data (`d`) → un workout ciascuna, con le relative workout_exercises.
Inferenza `workout_type`: se la data contiene esercizi "Massimale: …" → `test`; altrimenti `freestyle` (in migrazione non è necessario ricostruire i programmi storici).
Mappatura campi (sorgente prototipo → nuova colonna): `sc` → `scheme`, `kg` → `added_weight_kg`, `v` → `metric_value`, `va` → `variant`, `no` → `notes`, `od` → `original_date`. Le voci con `fl=1` e le note di anomalia (dalla vecchia lista `ANOM`) confluiscono in `notes`.
Per gli esercizi `sets`, se possibile derivare `reps_per_set` dallo `scheme` (es. `5x6` → `[6,6,6,6,6]`); dove il totale storico differisce dallo scheme pieno, mantenere `metric_value` come da dato originale.
I superset storici (es. "5 pull + 10 piegamenti ×5") diventano due esercizi distinti con la stessa `superset_key` e `superset_order` 0/1, ciascuno con le proprie 5 serie (Pull `[5,5,5,5,5]`, Piegamenti `[10,10,10,10,10]`). Il riposo (es. 2:00) e la struttura vanno in `notes`.
Le serie a sfinimento/progressive (es. "da 1 a 8") diventano `sets` con `reps_per_set` esplicito (`[1,2,3,4,5,6,7,8]`) e `scheme` descrittivo ("progressive").
Il peso corporeo (`body_weights`) non ha storico da migrare: parte vuoto, si popola dal primo inserimento.
---
9. Scope v1 (checklist)
[ ] Scaffold PWA (Vite + React + TypeScript + Tailwind + vite-plugin-pwa), installabile su iOS/Android, connessione richiesta, TS `strict`.
[ ] Logging usabile sul cover display del Razr 50 (~360×360, un esercizio in focus, checkbox grandi, distraction-free); dashboard/creazione solo su display principale (§2.5).
[ ] Connessione Supabase + Auth via magic link (email; nessuna password gestita).
[ ] Schema Postgres + RLS + policy "solo i propri dati".
[ ] Tipi TS del dominio (§3.4) + tipi Supabase generati e mapper al data-access layer.
[ ] Seed del catalogo `exercises` di default (calisthenics) per un nuovo utente; possibilità di aggiungerne.
[ ] Registro metriche dichiarativo e tipizzato (§4) come unica fonte della semantica.
[ ] CRUD programs (schede) con date di validità, program_days e program_exercises (esercizio + target).
[ ] Logging workout: `from_program` (con suggerimento a rotazione + override), `freestyle`, `test`.
[ ] Widget di input per tipo: set checkboxes con override della singola serie + totale derivato, cronometro circuito, number, text.
[ ] Modalità serie aperta (serie illimitate / a sfinimento) del widget set checkboxes (§5.6).
[ ] Superset: raggruppamento leggero via `supersetKey`/`supersetOrder`, input alternato a round, rest timer dopo il round, esercizi distinti (§5.6).
[ ] Rest timer (§5.5): countdown al tap della checkbox, non bloccante, overtime con beep, preset editabili, non salvato.
[ ] Progressione "batti l'ultima": precompilazione dalla performance precedente, valori editabili, riferimento mostrato.
[ ] Flag `isExcluded` (infortunio) + `exclusionReason`, con esclusione dai calcoli in dashboard.
[ ] Dashboard (§6) alimentate da Supabase.
[ ] Registro pesate (peso corporeo): tabella `body_weights`, input minimo indipendente, nudge a inizio scheda, grafico di trend (§5.7, §6).
[ ] JSON export completo (backup).
[ ] Migrazione dei dati esistenti (§8).
---
10. Backlog (esplicitamente fuori dalla v1)
Login con Google (provider aggiuntivo; Supabase permette più metodi in parallelo).
Timer EMOM a conto alla rovescia con beep / input EMOM "una checkbox per minuto".
Vista forza relativa / carico totale (combina `body_weights` + `added_weight_kg` per esercizio e data). Il registro pesate base è già in v1.
Backup JSON automatico e schedulato (es. GitHub Actions + storage esterno).
Durata del riposo memorizzata per esercizio (i dati storici mostrano riposi diversi per esercizio).
Log serie-per-serie anche per metric_type diversi da `sets`.
Sistema di blocchi generico e annidato per superset/circuiti (riposo prescritto per-blocco, round come attributo esplicito, blocchi arbitrari). In v1 il superset è un raggruppamento leggero (`supersetKey`), sufficiente per il caso reale.
Superset come condizione automatica in dashboard: far sì che le sessioni eseguite in superset finiscano in un chip a parte, separate da quelle isolate — 25 trazioni alternate ai piegamenti non sono 25 trazioni fresche. Oggi il legame si vede come contesto sulla riga dello storico ("in superset con …") ma non entra nei calcoli. Rimandato perché sovrascriverebbe le condizioni scritte a mano, ed è una decisione da prendere dopo aver visto qualche mese di dati.
Modalità offline-first con coda di sincronizzazione (non necessaria finché la connessione è requisito).
Wrapper TWA (Bubblewrap) come contingenza, solo se la PWA installata non risultasse eseguibile sul cover display del Razr 50 (vedi §2.5). Non necessario se la PWA compare nell'elenco app del display esterno.
> **Fuori scope permanente (deciso):** registrazione del *tempo di riposo tra le serie come metrica*. Il rest timer resta un assistente dal vivo, non un dato.
---
11. Ordine di build consigliato
Per procedere in modo incrementale (spec-driven): costruire verso lo spec, non intorno al vecchio file.
Scaffold PWA + TypeScript + connessione Supabase + Auth magic link (uno scheletro che si installa e fa login).
Schema + RLS (incl. `body_weights`) + seed catalogo `exercises` + tipi TS/mapper.
Script di migrazione (così ci sono dati reali su cui lavorare).
Dashboard sui dati reali (riuso del prototipo) + registro pesate e grafico del peso.
Logging workout `from_program` con i widget di input + rest timer.
Workout `freestyle` e `test`.
CRUD programs (schede).
JSON export.
