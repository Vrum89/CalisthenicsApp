# CLAUDE.md — Workout Diary (PWA)

Regole durature del progetto. Concise per scelta: ogni riga deve cambiare come lavori.
Il dettaglio vive nello spec — qui stanno solo convenzioni, metodo e trappole.

## Fonti di verità (leggile PRIMA di scrivere codice)

- `docs/SPEC-workout-diary.md` — **specifica autorevole**. In caso di dubbio, ambiguità o contraddizione: **chiedi, non indovinare.**
- `seed/seed-workouts-jul-aug-2026.json` — dati reali da caricare (Milestone 3).
- `docs/reference/diario-allenamenti.jsx` — **riferimento SOLO per le dashboard** (logica grafici, calcolo PR/trend, estetica slate/ambra). **NON** è un riferimento architetturale: non copiarne la struttura (dati+presentazione mischiati, campo `v` opaco). Quei difetti sono ciò che stiamo correggendo.

> Lo spec è lungo: **leggilo dal file quando ti serve**, non tenerlo tutto in contesto. Consultalo per intero all'inizio e poi la sezione pertinente a ogni milestone.

## Stack

PWA **React + TypeScript (strict)** + Vite + Tailwind; **Supabase** (Postgres + REST auto + Auth **magic link**); recharts; lucide-react; react-router; vite-plugin-pwa. Hosting statico (Vercel/Netlify/Cloudflare).
Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Mai committare segreti**; `.env` in `.gitignore`.

## Convenzioni non negoziabili

- **DB `snake_case`, TypeScript `camelCase`**, con un mapper al data-access layer. Nomi parlanti in inglese.
- **L'app è bilingue: italiano e inglese.** Sostituisce la vecchia regola "UI in italiano" (e §3 dello spec). Vedi la sezione qui sotto.
- **TypeScript strict.** Niente `any` non giustificato.
- **Il registro metriche (§4 dello spec) è l'UNICA fonte della semantica delle metriche**: best (min/max), direzione del trend, formatter, widget di input, tipo di grafico. **Non spargere** questa logica altrove — era il difetto centrale del prototipo.
- **Program = template, Workout = istanza.** Non mescolarli.
- **Multi-utente via RLS**: ogni tabella ha `user_id`, ogni accesso è già scoperto per utente.

## Localizzazione (IT / EN)

- **Nessuna stringa visibile all'utente scritta nel componente.** Ogni testo passa da `t('chiave')` (`src/lib/i18n/`). Vale anche per messaggi di errore, `aria-label`, `title` e `placeholder`.
- **`src/lib/i18n/locales/it.ts` è il locale di riferimento**: le sue chiavi definiscono `TranslationKey`, e `en.ts` è tipizzato su quello. Aggiungere una stringa solo in italiano **rompe il build** — è voluto.
- **Gli errori viaggiano come `AppError` con una chiave**, non come frase già scritta: il livello dati non conosce la lingua. La vista traduce con `describeError(error, t)`. Così cambiare lingua ridipinge anche gli errori già a schermo.
- **Il registro metriche espone `labelKey`/`unitKey`/`captionKey`**, non stringhe. Resta l'unica fonte della semantica: dice *quale* etichetta, l'i18n dice *come si scrive*.
- **I dati dell'utente non si traducono**: nomi esercizi, note e varianti restano come sono stati scritti. **Eccezione: `category`**, che nel DB contiene una chiave neutra (`strength_sets`, non "Forza") tradotta a video da `src/domain/categories.ts`. Una chiave sconosciuta si mostra grezza, non fa errore.
- Testa entrambe le lingue: l'inglese è mediamente più corto, l'italiano più lungo — è l'italiano che fa scoppiare i layout a 360 px.

## Metodo di lavoro

- Segui l'**ordine di build (§11 dello spec)**, **una milestone alla volta**.
- A fine di ogni milestone: **riassumi cosa hai fatto**, **spiega come testarla**, e **fermati** per una mia conferma prima di passare alla successiva.
- Resta nello **scope v1 (§9)**. **Ignora il backlog (§10).** Niente gold-plating.
- Le cose che non puoi fare tu — dashboard Supabase, `.env`, applicare lo schema SQL, abilitare il magic link, test sul telefono — **delegale a me** con istruzioni precise, passo-passo.

## Mobile prima di tutto (§2.5 dello spec)

- Il Razr 50 ha **due superfici**: **cover display ~360×360** (dove registro DURANTE l'allenamento, oggi con Keep) e **display principale ~411×915**.
- Il **flusso di logging deve funzionare in ~360×360**: **un esercizio in focus alla volta**, checkbox grandi, rest timer, chrome minimo, **distraction-free**. Dashboard e creazione schede solo sul display principale.
- Tap target ≥ 44px; safe-area insets (notch/piega e ritagli fotocamera del cover); testa a **~360×360** e **~411×915**.
- **Subito dopo la Milestone 1**, fammi provare l'installazione della PWA sul cover display: se non risulta eseguibile lì, valutiamo il wrapper TWA (backlog §10).

## Git

Commit piccoli e frequenti, uno per unità di lavoro; messaggi chiari. Il repo è la fonte di verità: tienilo sempre allineato.
