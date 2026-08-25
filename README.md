# Workout Diary

PWA personale per registrare allenamenti di calisthenics e visualizzarne i progressi.

Documenti di riferimento:

- [`docs/SPEC-workout-diary.md`](docs/SPEC-workout-diary.md) — specifica autorevole
- [`CLAUDE.md`](CLAUDE.md) — convenzioni e metodo di lavoro

## Stack

React 19 + TypeScript (strict) + Vite + Tailwind CSS v4 + vite-plugin-pwa, con
Supabase (Postgres + Auth magic link) come backend. Hosting su Vercel.

## Setup locale

```bash
npm install
cp .env.example .env.local   # poi riempilo con i valori del tuo progetto Supabase
npm run dev
```

Le due variabili richieste si trovano nella dashboard Supabase, in
**Project Settings → API Keys**:

| Variabile                 | Valore                                              |
| ------------------------- | --------------------------------------------------- |
| `VITE_SUPABASE_URL`       | Project URL                                          |
| `VITE_SUPABASE_ANON_KEY`  | anon / public key (o "Publishable key")              |

Senza queste variabili l'app non crasha: mostra una schermata che dice quali
mancano. La chiave `service_role` non va mai usata qui.

## Comandi

| Comando             | Cosa fa                                        |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Server di sviluppo su <http://localhost:5173>   |
| `npm run build`     | Typecheck + build di produzione in `dist/`      |
| `npm run preview`   | Serve `dist/` in locale                         |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | Solo controllo dei tipi                         |

## Configurazione Supabase

Nella dashboard del progetto:

- **Authentication → Sign In / Providers → Email**: provider attivo. Il magic
  link non ha un interruttore separato, è incluso nel provider Email.
- **Authentication → Sign In / Providers**: `Allow new users to sign up` attivo
  (l'account viene creato al primo login).
- **Authentication → URL Configuration**:
  - _Site URL_: l'URL di produzione (in sviluppo `http://localhost:5173`)
  - _Redirect URLs_: `http://localhost:5173/**` e `https://<dominio-vercel>/**`

Il piano gratuito invia poche email all'ora e mette il progetto in pausa dopo
~7 giorni di inattività (i dati restano, si riattiva con un click).

## Database

Lo schema vive in [`supabase/schema.sql`](supabase/schema.sql): tabelle, indici,
RLS, grant per la Data API e catalogo esercizi di default. Si applica dalla
dashboard (**SQL Editor → New query** → incolla tutto → **Run**) ed è
idempotente, quindi si può rieseguire dopo ogni modifica.

### Dati storici

Gli script SQL vanno eseguiti in quest'ordine, una volta sola:

| File | Cosa fa | Quando |
| ---- | ------- | ------ |
| `supabase/schema.sql` | tabelle, RLS, catalogo di default | sempre per primo, e a ogni modifica dello schema |
| `supabase/migration-history.sql` | 68 allenamenti e 202 voci dal vecchio diario | una volta |
| `supabase/mark-exclusions.sql` | esclude 4 voci non confrontabili dai record | facoltativo |

`migration-history.sql` è **generato**, non scritto a mano:

```bash
npm run migrate:generate
```

Legge l'array `ROWS` di `docs/reference/diario-allenamenti.jsx` e
`seed/seed-workouts-jul-aug-2026.json`, e riscrive il file SQL. La tabella di
corrispondenza fra i vecchi nomi e il catalogo canonico sta in
`scripts/catalog-mapping.ts`: è la parte che va **letta e approvata**, perché un
nome sbagliato lì sposta anni di storico sotto l'esercizio sbagliato.

Ogni riga ha un id deterministico (UUID v5), quindi rieseguire l'SQL non
duplica nulla. Non aggiorna però le righe già presenti: per riapplicare una
correzione, cancella prima gli allenamenti interessati.

### Tipi del database

I tipi in `src/lib/supabase/database.types.ts` rispecchiano lo schema e sono
scritti a mano. Dopo aver applicato lo schema conviene rigenerarli dalla fonte:

```bash
npx supabase login
npx supabase gen types typescript --project-id <project-ref> > src/lib/supabase/database.types.ts
```

## Struttura

```
src/
  domain/      modello di dominio (camelCase), registro metriche, statistiche
  features/    una cartella per area funzionale (auth, dashboard, bodyWeight, …)
  lib/         client Supabase, tipi del database, mapper, i18n, env
  components/  UI condivisa
  routes/      schermate montate dal router
scripts/       strumenti one-off (generatore della migrazione)
supabase/      schema e SQL da eseguire nella dashboard
```

Schermate: `/` smista, `/dashboard` mostra i progressi per esercizio,
`/weight` il registro pesate. Il flusso di logging arriva con la Milestone 5.

### Localizzazione

L'app è in italiano e in inglese. La lingua si sceglie dallo switcher IT/EN in
alto; alla prima apertura segue quella del dispositivo e poi resta memorizzata.

L'ordine è: scelta esplicita → lingua del dispositivo → **inglese**. Il fallback
è l'inglese e non l'italiano perché serve a chi non parla nessuna delle due
lingue supportate; un dispositivo in italiano viene riconosciuto prima e non ci
arriva mai.

`src/lib/i18n/locales/it.ts` è il locale di riferimento: le sue chiavi generano
il tipo `TranslationKey`, su cui `en.ts` è tipizzato. **Una stringa aggiunta solo
in italiano fa fallire il build**, invece di comparire come chiave grezza a
schermo.

I dati dell'utente (nomi degli esercizi, note, varianti) non vengono tradotti:
restano come sono stati scritti. Le **categorie** sono l'eccezione: nel database
contengono una chiave neutra (`strength_sets`, non "Forza"), tradotta a video da
`src/domain/categories.ts`. Una chiave non riconosciuta viene mostrata così
com'è, senza errori.

Tre regole che vale la pena non violare:

- **Il registro metriche** (`src/domain/metrics.ts`) è l'unica fonte della
  semantica di una metrica: best min/max, direzione del trend, formattazione,
  widget di input, tipo di grafico. Nessun altro file deve contenere un
  `Math.max` su valori di metrica o una formattazione `mm:ss`.
- **Lo snake_case si ferma ai mapper** (`src/lib/supabase/mappers.ts`). Fuori dal
  data-access layer esiste solo il modello camelCase di `src/domain/types.ts`.
- **Nessuna stringa visibile scritta nel componente**: tutto passa da `t()`, e
  gli errori viaggiano come `AppError` con una chiave di traduzione.

## Test su mobile

Il device di riferimento è il Motorola Razr 50, con due superfici (spec §2.5).
In DevTools vanno provate entrambe:

- **~360 × 360** — cover display, dove avviene il logging durante l'allenamento
- **~411 × 915** — display principale, per dashboard e creazione schede

L'installazione della PWA richiede HTTPS: in locale funziona solo da
`localhost`, dal telefono serve l'URL di produzione.

## Deploy su Vercel

Import del repository, framework preset **Vite** (build `npm run build`, output
`dist`). Le due variabili d'ambiente vanno impostate in
**Settings → Environment Variables**. `vercel.json` contiene già il rewrite SPA
necessario a servire `/login` e `/auth/callback`.
