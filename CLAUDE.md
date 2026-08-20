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

- **DB `snake_case`, TypeScript `camelCase`**, con un mapper al data-access layer. Nomi parlanti in inglese; prosa/UI in italiano vanno bene.
- **TypeScript strict.** Niente `any` non giustificato.
- **Il registro metriche (§4 dello spec) è l'UNICA fonte della semantica delle metriche**: best (min/max), direzione del trend, formatter, widget di input, tipo di grafico. **Non spargere** questa logica altrove — era il difetto centrale del prototipo.
- **Program = template, Workout = istanza.** Non mescolarli.
- **Multi-utente via RLS**: ogni tabella ha `user_id`, ogni accesso è già scoperto per utente.

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
