import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Download, AlertTriangle, Trophy, ChevronDown, Dumbbell } from "lucide-react";

/* ============================================================
   DATI NORMALIZZATI — una riga = un esercizio eseguito in una data
   d  = data ISO           od = data originale (se corretta)
   ex = esercizio canonico sc = schema (es. "5x6")
   v  = valore metrico     kg = zavorra in kg
        · rip / serie -> ripetizioni (totali per le serie)
        · tempo       -> secondi
        · min         -> minuti (EMOM)
   va = variante           no = nota          fl = anomalia
   Per aggiungere sessioni: appendi righe in fondo a ROWS.
   ============================================================ */
const ROWS = [
  // ottobre 2025
  { d: "2025-10-06", ex: "Pull up – 10 min", v: 31, no: "chiudere gomiti" },
  { d: "2025-10-06", ex: "Dip – serie", sc: "5x3", v: 15, kg: 0, va: "3s discesa" },
  { d: "2025-10-06", ex: "Chin up – serie", sc: "4x4", v: 16, kg: 0, no: "aprire petto in salita" },
  { d: "2025-10-11", ex: "Chin up – serie", sc: "1x10", v: 10, kg: 0, no: "petto aperto, gambe unite" },
  { d: "2025-10-11", ex: "HSPU – 10 min", v: 30, va: "con rialzo", no: "durata 10 min non esplicitata", fl: 1 },
  { d: "2025-10-11", ex: "Chin up – serie", sc: "4x4", v: 16, kg: 0 },
  { d: "2025-10-13", ex: "Pull up – 10 min", v: 37 },
  { d: "2025-10-13", ex: "Chin up – serie", sc: "5x3", v: 15, kg: 0, va: "3s discesa" },
  { d: "2025-10-13", ex: "Circuito: 25 chin up", v: 469, no: "petto in fuori, gambe unite" },
  { d: "2025-10-18", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 0, no: "riposo 1:30" },
  { d: "2025-10-18", ex: "HSPU – 10 min", v: 30 },
  { d: "2025-10-18", ex: "Circuito: 40 bar dip + 25 chin up", v: 510, va: "chin a metà dal basso" },
  { d: "2025-10-23", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 0 },
  { d: "2025-10-23", ex: "Dip – serie", sc: "3 rip", v: 3, kg: 0, va: "3s salita / 3s discesa", no: "annotazione ambigua" },
  { d: "2025-10-23", ex: "Pull up – 10 min", v: 31 },
  { d: "2025-10-23", ex: "Altro / note", no: "Appeso ginocchia al petto 10x4 («co kn 30»)" },
  { d: "2025-10-24", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 0 },
  { d: "2025-10-24", ex: "HSPU – 10 min", v: 28 },
  { d: "2025-10-24", ex: "Circuito: 40 bar dip + 25 chin up", v: 760, no: "dovevo fare mezzi chin up" },
  { d: "2025-10-28", ex: "Pull up – 10 min", v: 35 },
  { d: "2025-10-28", ex: "Chin up – serie", sc: "5x3", v: 15, kg: 0, va: "3s discesa", no: "easy" },
  { d: "2025-10-28", ex: "Circuito: 25 chin up", v: 116, no: "1:56 — anomalo vs 7:49 e 6:00, possibile refuso", fl: 1 },
  { d: "2025-10-30", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 0 },
  { d: "2025-10-30", ex: "HSPU – 10 min", v: 34 },
  { d: "2025-10-30", ex: "Circuito: 40 bar dip + 25 chin up", v: 1120, no: "dovevo fare mezzi chin up" },
  // novembre 2025
  { d: "2025-11-03", ex: "Pull up – 10 min", v: 40 },
  { d: "2025-11-03", ex: "Chin up – serie", sc: "5x3", v: 15, kg: 0, va: "3s discesa", no: "easy" },
  { d: "2025-11-03", ex: "Circuito: 25 chin up", v: 360 },
  { d: "2025-11-06", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 0 },
  { d: "2025-11-06", ex: "HSPU – 10 min", v: 30 },
  { d: "2025-11-06", ex: "Circuito: 40 bar dip + 25 chin up", v: 540, va: "mezzi chin up" },
  { d: "2025-11-13", ex: "Massimale: Pull up", v: 11, kg: 0 },
  { d: "2025-11-13", ex: "Massimale: HSPU", v: 13, va: "rialzo + disco da 5" },
  { d: "2025-11-13", ex: "Massimale: Chin up", v: 9, kg: 4 },
  // nuova scheda dal 17/11/25
  { d: "2025-11-17", ex: "Pull up – serie", sc: "6x5", v: 30, kg: 0, no: "nuova scheda" },
  { d: "2025-11-17", ex: "Dip – 10 min", v: 55 },
  { d: "2025-11-17", ex: "Circuito: 60 push up + 30 chin up", v: 532 },
  { d: "2025-11-21", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2025-11-21", ex: "HSPU – 10 min", v: 27, va: "rialzo + disco da 5" },
  { d: "2025-11-21", ex: "Circuito: 60 bar dip (larga) + 30 pull up", v: 889 },
  { d: "2025-11-25", ex: "Pull up – serie", sc: "6x5", v: 30, kg: 0 },
  { d: "2025-11-25", ex: "Dip – 10 min", v: 55 },
  { d: "2025-11-25", ex: "Circuito: 60 push up + 30 chin up", v: 532 },
  // dicembre 2025
  { d: "2025-12-01", od: "01/11/25", fl: 1, ex: "Pull up – serie", sc: "6x5", v: 30, kg: 0 },
  { d: "2025-12-01", od: "01/11/25", fl: 1, ex: "Dip – 10 min", v: 55 },
  { d: "2025-12-01", od: "01/11/25", fl: 1, ex: "Circuito: 60 push up + 30 chin up", v: 463 },
  { d: "2025-12-10", od: "10/11/25", fl: 1, ex: "Pull up – serie", sc: "6x5", v: 30, kg: 0 },
  { d: "2025-12-10", od: "10/11/25", fl: 1, ex: "Dip – 10 min", v: 57 },
  { d: "2025-12-10", od: "10/11/25", fl: 1, ex: "Circuito: 60 push up + 30 chin up", v: 583 },
  { d: "2025-12-12", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2025-12-12", ex: "HSPU – 10 min", v: 20, va: "rialzo + disco da 5" },
  { d: "2025-12-12", ex: "Circuito: 60 bar dip (larga) + 30 pull up", v: 687 },
  { d: "2025-12-15", ex: "Pull up – serie", sc: "6x5", v: 30, kg: 0 },
  { d: "2025-12-15", ex: "Dip – 10 min", v: 65 },
  { d: "2025-12-15", ex: "Circuito: 60 push up + 30 chin up", v: 534 },
  { d: "2025-12-17", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2025-12-17", ex: "HSPU – 10 min", v: 27, va: "rialzo + disco da 5" },
  { d: "2025-12-17", ex: "Circuito: 60 bar dip (larga) + 30 pull up", v: 510 },
  { d: "2025-12-22", ex: "Massimale: Push up", v: 12, kg: 5, no: "possibile refuso per «pull up»", fl: 1 },
  { d: "2025-12-22", ex: "Massimale: HSPU", v: 10, va: "solo tappetino" },
  { d: "2025-12-22", ex: "Massimale: Chin up", v: 15, kg: 0, va: "2s fermo" },
  { d: "2025-12-29", ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2025-12-29", ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2025-12-29", ex: "Circuito: 35 chin up + 50 push up strette", v: 750 },
  { d: "2025-12-30", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 5 },
  { d: "2025-12-30", ex: "HSPU – 10 min", v: 20, va: "solo materassino" },
  { d: "2025-12-30", ex: "Circuito: 25 chin up + 50 dip", v: 863 },
  // gennaio 2026
  { d: "2026-01-02", ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-01-02", ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2026-01-02", ex: "Circuito: 35 chin up + 50 push up strette", v: 570 },
  { d: "2026-01-05", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 5 },
  { d: "2026-01-05", ex: "HSPU – 10 min", v: 28, va: "solo materassino" },
  { d: "2026-01-05", ex: "Circuito: 25 chin up + 50 dip", v: 505 },
  { d: "2026-01-08", ex: "Altro / note", no: "Strength & conditioning class" },
  { d: "2026-01-09", od: "02/01/26 (duplicata)", fl: 1, ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-01-09", od: "02/01/26 (duplicata)", fl: 1, ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2026-01-09", od: "02/01/26 (duplicata)", fl: 1, ex: "Circuito: 35 chin up + 50 push up strette", v: 440 },
  { d: "2026-01-12", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 5 },
  { d: "2026-01-12", ex: "HSPU – 10 min", v: 30, va: "solo materassino" },
  { d: "2026-01-12", ex: "Circuito: 25 chin up + 50 dip", v: 557 },
  { d: "2026-01-15", ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-01-15", ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2026-01-15", ex: "Circuito: 35 chin up + 50 push up strette", v: 585 },
  { d: "2026-01-17", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 5 },
  { d: "2026-01-17", ex: "HSPU – 10 min", v: 32, va: "solo materassino" },
  { d: "2026-01-17", ex: "Circuito: 25 chin up + 50 dip", v: 545 },
  { d: "2026-01-20", ex: "Altro / note", no: "Strength & conditioning class" },
  { d: "2026-01-21", ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-01-21", ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2026-01-21", ex: "Circuito: 35 chin up + 50 push up strette", v: 620 },
  { d: "2026-01-27", ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-01-27", ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2026-01-27", ex: "Circuito: 35 chin up + 50 push up strette", v: 581 },
  { d: "2026-01-28", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 5 },
  { d: "2026-01-28", ex: "HSPU – 10 min", v: 31, va: "solo materassino" },
  { d: "2026-01-28", ex: "Circuito: 25 chin up + 50 dip", v: 492 },
  // febbraio 2026
  { d: "2026-02-02", ex: "Pull up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-02-02", ex: "Dip – serie", sc: "5x7", v: 35, kg: 0, va: "2s fermo" },
  { d: "2026-02-02", ex: "Circuito: 35 chin up + 50 push up strette", v: 518 },
  { d: "2026-02-04", ex: "Massimale: Pull up", v: 11, kg: 5 },
  { d: "2026-02-04", ex: "Massimale: HSPU", v: 11, va: "disco da 10" },
  { d: "2026-02-04", ex: "Massimale: Dip", v: 16, kg: 10 },
  { d: "2026-02-04", ex: "Pull up – 10 min", v: 30, no: "test massimale" },
  { d: "2026-02-10", ex: "Chin up EMOM 3 rip @5kg", v: 8, kg: 5 },
  { d: "2026-02-10", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10 },
  { d: "2026-02-10", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: 580 },
  { d: "2026-02-12", ex: "Chin up – serie", sc: "5x7", v: 35, kg: 5 },
  { d: "2026-02-12", ex: "HSPU – 10 min", v: 30, va: "disco da 5" },
  { d: "2026-02-12", ex: "Circuito: 35 dip in buca (2s) + 30 pull up", v: 560, no: "(forse)" },
  { d: "2026-02-17", ex: "Chin up EMOM 3 rip @5kg", v: 9, kg: 5 },
  { d: "2026-02-17", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10 },
  { d: "2026-02-17", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: 489 },
  { d: "2026-02-18", ex: "Chin up – serie", sc: "5x7", v: 35, kg: 5 },
  { d: "2026-02-18", ex: "HSPU – 10 min", v: 25, va: "disco da 5" },
  { d: "2026-02-18", ex: "Circuito: 35 dip in buca (2s) + 30 pull up", v: 585 },
  { d: "2026-02-24", ex: "Chin up EMOM 3 rip @5kg", v: 10, kg: 5 },
  { d: "2026-02-24", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10 },
  { d: "2026-02-24", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: 520 },
  // marzo 2026
  { d: "2026-03-02", ex: "Chin up EMOM 3 rip @5kg", v: 11, kg: 5 },
  { d: "2026-03-02", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10 },
  { d: "2026-03-02", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: 741 },
  { d: "2026-03-03", ex: "Chin up – serie", sc: "5x7", v: 35, kg: 5 },
  { d: "2026-03-03", ex: "HSPU – 10 min", v: 17, va: "disco da 5" },
  { d: "2026-03-03", ex: "Circuito: 35 dip in buca (2s) + 30 pull up", v: 690 },
  { d: "2026-03-10", ex: "Chin up EMOM 3 rip @5kg", v: 12, kg: 5 },
  { d: "2026-03-10", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10, no: "spalle lontane dalle orecchie, petto chiuso" },
  { d: "2026-03-10", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: null, no: "non fatto — dolore spalla" },
  { d: "2026-03-12", ex: "Chin up – serie", sc: "5x7", v: 35, kg: 5 },
  { d: "2026-03-12", ex: "HSPU – 10 min", v: 22, va: "disco da 5" },
  { d: "2026-03-12", ex: "Circuito: 35 dip in buca (2s) + 30 pull up", v: 717 },
  { d: "2026-03-16", ex: "Chin up EMOM 3 rip @5kg", v: 12, kg: 5, no: "annotato «+1» ma pari al 10/03" },
  { d: "2026-03-16", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10 },
  { d: "2026-03-16", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: 364 },
  { d: "2026-03-17", od: "17/03/25", fl: 1, ex: "Massimale: Push up", v: 11, va: "anelli", no: "petto in fuori, negativa controllata" },
  { d: "2026-03-17", od: "17/03/25", fl: 1, ex: "Massimale: HSPU", v: 6, va: "senza peso" },
  { d: "2026-03-17", od: "17/03/25", fl: 1, ex: "Dip anelli – 10 min", v: 16, no: "test massimale — bloccare presa, scendere paralleli" },
  { d: "2026-03-24", ex: "Chin up – serie", sc: "5x7", v: 35, kg: 5 },
  { d: "2026-03-24", ex: "HSPU – 10 min", v: 21, va: "disco da 5" },
  { d: "2026-03-24", ex: "Circuito: 35 dip in buca (2s) + 30 pull up", v: 556 },
  { d: "2026-03-25", ex: "Chin up EMOM 3 rip @5kg", v: 13, kg: 5 },
  { d: "2026-03-25", ex: "Dip – serie", sc: "5x5", v: 25, kg: 10 },
  { d: "2026-03-25", ex: "Circuito: 20 chin up (2s) + 50 bar dip", v: 297, no: "annotazione «4 57 06:04» — letta 4:57", fl: 1 },
  { d: "2026-03-27", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0, va: "anelli" },
  { d: "2026-03-27", ex: "Dip anelli – 10 min", v: 30 },
  { d: "2026-03-27", ex: "Circuito: 20 chin up + 20 dip @5kg", v: null, no: "da rifare" },
  { d: "2026-03-31", ex: "Chin up – serie", sc: "5x8", v: 40, kg: 5 },
  { d: "2026-03-31", ex: "V push up – 10 min", v: 50, no: "sostituzione HSPU per dolore spalla" },
  { d: "2026-03-31", ex: "Superset 5 trazioni + 10 spinte x5", no: "5 pull up + 10 dip — riposo 1:30" },
  // aprile 2026
  { d: "2026-04-08", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0, va: "anelli" },
  { d: "2026-04-08", ex: "Dip anelli – 10 min", v: 30 },
  { d: "2026-04-08", ex: "Circuito: 20 chin up + 20 dip @5kg", v: null, no: "da rifare" },
  { d: "2026-04-25", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0, va: "anelli" },
  { d: "2026-04-25", ex: "Dip anelli – 10 min", v: 20, no: "eseguiti NO anelli", fl: 1 },
  { d: "2026-04-25", ex: "Circuito: 20 chin up + 20 dip @5kg", v: 288, no: "SENZA peso — non confrontabile col target 5 kg", fl: 1 },
  // maggio 2026
  { d: "2026-05-11", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0 },
  { d: "2026-05-11", ex: "Dip – 10 min", v: 35 },
  { d: "2026-05-11", ex: "Circuito: 25 chin up + 50 push up (manicotti)", v: null, no: "tempo non dichiarato" },
  { d: "2026-05-14", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-05-14", ex: "HSPU – 10 min", v: 20, va: "disco da 10", no: "carico aumentato" },
  { d: "2026-05-14", ex: "Superset 5 trazioni + 10 spinte x5", no: "5 pull + 10 piegamenti — riposo 2:00" },
  { d: "2026-05-18", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0 },
  { d: "2026-05-18", ex: "Dip – 10 min", v: 45 },
  { d: "2026-05-18", ex: "Circuito: 25 chin up + 50 push up (manicotti)", v: 475 },
  { d: "2026-05-19", ex: "Altro / note", no: "Tecnica saltelli: appoggio su pianta centrale, punte piatte al salto" },
  { d: "2026-05-21", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-05-21", ex: "HSPU – 10 min", v: 22, va: "disco da 5" },
  { d: "2026-05-21", ex: "Superset 5 trazioni + 10 spinte x5", no: "riposo 2:00" },
  { d: "2026-05-25", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0 },
  { d: "2026-05-25", ex: "Dip – 10 min", v: 50 },
  { d: "2026-05-25", ex: "Circuito: 25 chin up + 50 push up (manicotti)", v: 646 },
  { d: "2026-05-27", ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-05-27", ex: "HSPU – 10 min", v: 18, va: "disco da 5" },
  { d: "2026-05-27", ex: "Superset 5 trazioni + 10 spinte x5", no: "riposo 2:00" },
  // giugno–luglio 2026
  { d: "2026-06-05", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0 },
  { d: "2026-06-05", ex: "Dip – 10 min", v: 45 },
  { d: "2026-06-05", ex: "Circuito: 25 chin up + 50 push up (manicotti)", v: 548 },
  { d: "2026-06-11", od: "11/05/26", fl: 1, ex: "Chin up – serie", sc: "5x5", v: 25, kg: 5 },
  { d: "2026-06-11", od: "11/05/26", fl: 1, ex: "HSPU – 10 min", v: 18, va: "disco da 5" },
  { d: "2026-06-11", od: "11/05/26", fl: 1, ex: "Superset 5 trazioni + 10 spinte x5", no: "riposo 2:00" },
  { d: "2026-06-12", ex: "Corsa 1 km", v: 310 },
  { d: "2026-06-23", ex: "Corsa 1 km", v: 280, no: "−30 s rispetto al 12/06" },
  { d: "2026-07-02", ex: "Chin up – serie", sc: "5x6", v: 30, kg: 0 },
  { d: "2026-07-02", ex: "Dip – 10 min", v: 50 },
  { d: "2026-07-02", ex: "Circuito: 25 chin up + 50 push up (manicotti)", v: 461 },
];

/* esercizio -> categoria + tipo di metrica */
const META = {
  "Chin up – serie": { cat: "Forza (serie × rip)", m: "serie" },
  "Pull up – serie": { cat: "Forza (serie × rip)", m: "serie" },
  "Dip – serie": { cat: "Forza (serie × rip)", m: "serie" },
  "Chin up EMOM 3 rip @5kg": { cat: "Forza (serie × rip)", m: "min" },
  "Pull up – 10 min": { cat: "Max ripetizioni (10 min)", m: "rip" },
  "Dip – 10 min": { cat: "Max ripetizioni (10 min)", m: "rip" },
  "Dip anelli – 10 min": { cat: "Max ripetizioni (10 min)", m: "rip" },
  "HSPU – 10 min": { cat: "Max ripetizioni (10 min)", m: "rip" },
  "V push up – 10 min": { cat: "Max ripetizioni (10 min)", m: "rip" },
  "Circuito: 25 chin up + 50 push up (manicotti)": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 25 chin up + 50 dip": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 35 chin up + 50 push up strette": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 20 chin up (2s) + 50 bar dip": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 35 dip in buca (2s) + 30 pull up": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 60 push up + 30 chin up": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 60 bar dip (larga) + 30 pull up": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 40 bar dip + 25 chin up": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 25 chin up": { cat: "Circuiti a tempo", m: "tempo" },
  "Circuito: 20 chin up + 20 dip @5kg": { cat: "Circuiti a tempo", m: "tempo" },
  "Massimale: Pull up": { cat: "Massimali", m: "rip" },
  "Massimale: Chin up": { cat: "Massimali", m: "rip" },
  "Massimale: Dip": { cat: "Massimali", m: "rip" },
  "Massimale: HSPU": { cat: "Massimali", m: "rip" },
  "Massimale: Push up": { cat: "Massimali", m: "rip" },
  "Corsa 1 km": { cat: "Corsa", m: "tempo" },
  "Superset 5 trazioni + 10 spinte x5": { cat: "Altro", m: "nota" },
  "Altro / note": { cat: "Altro", m: "nota" },
};

const CATS = [
  "Forza (serie × rip)",
  "Max ripetizioni (10 min)",
  "Circuiti a tempo",
  "Massimali",
  "Corsa",
  "Altro",
];

const ANOM = [
  "«17/03/25» interpretata come 17/03/26: massimali in mezzo alle sessioni di marzo 2026.",
  "«01/11/25» e «10/11/25» interpretate come 01/12 e 10/12/25: posizione nel file e progressione dip (55 → 57 → 65) coerenti solo così.",
  "Prima occorrenza di «11/05/26» (tra 23/06 e 05/06) interpretata come 11/06/26.",
  "«02/01/26» compare due volte con tempi diversi: la voce da 7:20 è stata stimata al 09/01/26 (tra 08/01 e 12/01).",
  "«12/06/2026» è fuori ordine nel file ma coerente con la corsa del 23/06 (5:10 → 4:40): mantenuta.",
  "«25 chin up in 1:56» (28/10) è anomalo rispetto a 7:49 e 6:00 — possibile refuso, tenuto com'è.",
  "«in 4 57 06:04» (25/03) letta come 4:57.",
  "«12 push up con 5 kg» nei massimali del 22/12: possibile refuso per pull up.",
  "Senza tempo: 10/03 (dolore spalla), 27/03 e 08/04 («da rifare»), 11/05 («non dichiarato»). Il 4:48 del 25/04 è senza peso, quindi non confrontabile col target a 5 kg.",
];

/* helpers */
const mmss = (s) =>
  s == null ? "—" : Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const fmtD = (iso) => {
  const p = iso.split("-");
  return p[2] + "/" + p[1] + "/" + p[0].slice(2);
};
const shortD = (iso) => {
  const p = iso.split("-");
  return p[2] + "/" + p[1];
};
const fmtVal = (m, v) =>
  v == null ? "—" : m === "tempo" ? mmss(v) : m === "min" ? v + " min" : String(v);

const CAPTION = {
  serie: "Barre: ripetizioni totali · linea azzurra: zavorra (kg)",
  rip: "Ripetizioni completate — più in alto è meglio",
  min: "Durata EMOM in minuti — più in alto è meglio",
  tempo: "Tempo totale — più in basso è meglio",
};

function Tip({ active, payload, m }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
      <div className="text-slate-400">{p.full}</div>
      <div className="font-semibold text-amber-400 tabular-nums">
        {p.disp}
        {p.sc ? " · " + p.sc : ""}
      </div>
      {m === "serie" && p.kg != null && (
        <div className="text-sky-400">zavorra {p.kg} kg</div>
      )}
      {p.va && <div className="text-slate-300">{p.va}</div>}
      {p.no && <div className="mt-0.5 max-w-xs text-slate-500">{p.no}</div>}
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={"mt-0.5 text-lg font-bold tabular-nums " + (accent || "text-slate-100")}>
        {value}
      </div>
      {sub ? (
        <div className="truncate text-xs text-slate-500">{sub}</div>
      ) : (
        <div className="text-xs text-transparent">·</div>
      )}
    </div>
  );
}

export default function App() {
  const [cat, setCat] = useState("Circuiti a tempo");
  const [ex, setEx] = useState("Circuito: 25 chin up + 50 push up (manicotti)");
  const [showAnom, setShowAnom] = useState(false);

  const exList = useMemo(
    () => Object.keys(META).filter((e) => META[e].cat === cat),
    [cat]
  );
  const m = META[ex].m;
  const rows = useMemo(
    () => ROWS.filter((r) => r.ex === ex).sort((a, b) => a.d.localeCompare(b.d)),
    [ex]
  );
  const chartRows = rows.filter((r) => r.v != null);
  const nSess = useMemo(() => new Set(ROWS.map((r) => r.d)).size, []);

  const vals = chartRows.map((r) => r.v);
  const best = vals.length
    ? m === "tempo"
      ? Math.min.apply(null, vals)
      : Math.max.apply(null, vals)
    : null;
  const bestRow = chartRows.find((r) => r.v === best);
  const first = chartRows[0];
  const last = chartRows[chartRows.length - 1];

  let deltaTxt = "—";
  let deltaAccent = "text-slate-100";
  if (chartRows.length >= 2) {
    const delta = m === "tempo" ? first.v - last.v : last.v - first.v;
    if (delta === 0) deltaTxt = "±0";
    else {
      const abs = Math.abs(delta);
      deltaTxt =
        m === "tempo"
          ? (delta > 0 ? "−" : "+") + mmss(abs)
          : (delta > 0 ? "+" : "−") + abs;
      deltaAccent = delta > 0 ? "text-emerald-400" : "text-rose-400";
    }
  }

  const chartData = chartRows.map((r) => ({
    lbl: shortD(r.d),
    full: fmtD(r.d) + (r.od ? " (orig. " + r.od + ")" : ""),
    v: r.v,
    kg: r.kg == null ? null : r.kg,
    disp: fmtVal(m, r.v),
    sc: r.sc,
    va: r.va,
    no: r.no,
  }));

  const pickCat = (c) => {
    setCat(c);
    const list = Object.keys(META).filter((e) => META[e].cat === c);
    setEx(list[0]);
  };

  const downloadCsv = () => {
    const head = [
      "data",
      "data_originale",
      "categoria",
      "esercizio",
      "schema",
      "zavorra_kg",
      "valore",
      "tempo_mmss",
      "variante",
      "nota",
      "anomalia",
    ];
    const lines = ROWS.map((r) => {
      const mm = META[r.ex];
      return [
        r.d,
        r.od || "",
        mm.cat,
        r.ex,
        r.sc || "",
        r.kg == null ? "" : r.kg,
        r.v == null ? "" : r.v,
        mm.m === "tempo" && r.v != null ? mmss(r.v) : "",
        r.va || "",
        (r.no || "").split(";").join(","),
        r.fl ? "SI" : "",
      ].join(";");
    });
    const blob = new Blob(["\uFEFF" + [head.join(";")].concat(lines).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allenamenti_normalizzati.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartable = m !== "nota" && chartRows.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* header */}
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
                <Dumbbell size={14} /> Diario allenamenti
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Progressi per esercizio
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                ott 2025 → lug 2026 · {nSess} sessioni · dati normalizzati dal diario
              </p>
            </div>
            <button
              onClick={downloadCsv}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </header>

        {/* categorie */}
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => pickCat(c)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (c === cat
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500")
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* esercizio */}
        <div className="relative mb-4">
          <select
            value={ex}
            onChange={(e) => setEx(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 pr-9 text-sm font-medium text-slate-100"
          >
            {exList.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-3 text-slate-400"
          />
        </div>

        {/* statistiche */}
        {chartable && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Prima" value={fmtVal(m, first.v)} sub={fmtD(first.d)} />
            <Stat
              label="Migliore"
              value={fmtVal(m, best)}
              sub={bestRow ? fmtD(bestRow.d) : ""}
              accent="text-amber-400"
            />
            <Stat label="Ultima" value={fmtVal(m, last.v)} sub={fmtD(last.d)} />
            <Stat label="Trend" value={deltaTxt} sub="prima → ultima" accent={deltaAccent} />
          </div>
        )}

        {/* grafico */}
        {chartable ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
            {m === "serie" ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="lbl"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: "#475569" }}
                  />
                  <YAxis
                    yAxisId="rep"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, "auto"]}
                  />
                  <YAxis
                    yAxisId="kg"
                    orientation="right"
                    width={28}
                    tick={{ fill: "#38bdf8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 12]}
                  />
                  <Tooltip content={<Tip m={m} />} cursor={{ fill: "#33415555" }} />
                  <Bar
                    yAxisId="rep"
                    dataKey="v"
                    fill="#fbbf24"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                  <Line
                    yAxisId="kg"
                    dataKey="kg"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#38bdf8" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: m === "tempo" ? -8 : -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="lbl"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: "#475569" }}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={m === "tempo" ? mmss : undefined}
                    domain={m === "tempo" ? ["auto", "auto"] : [0, "auto"]}
                  />
                  <Tooltip content={<Tip m={m} />} />
                  <Line
                    dataKey="v"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#fbbf24", stroke: "#0f172a", strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            <p className="mt-2 text-center text-xs text-slate-500">{CAPTION[m]}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-400">
            {m === "nota"
              ? "Voce di solo diario: nessuna metrica da graficare, sotto trovi le annotazioni."
              : "Nessun valore misurato per questa voce."}
          </div>
        )}

        {/* elenco voci */}
        <div className="mt-4 space-y-1.5">
          {rows
            .slice()
            .reverse()
            .map((r, i) => {
              const isPr =
                m !== "nota" && r.v != null && r.v === best && chartRows.length > 1;
              return (
                <div
                  key={i}
                  className={
                    "flex items-start gap-3 rounded-lg border px-3 py-2 " +
                    (isPr
                      ? "border-amber-400/40 bg-amber-400/5"
                      : "border-slate-800 bg-slate-800/40")
                  }
                >
                  <div className="w-16 shrink-0 pt-0.5 text-xs text-slate-500 tabular-nums">
                    {fmtD(r.d)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      {m !== "nota" && (
                        <span className="font-semibold tabular-nums">
                          {fmtVal(m, r.v)}
                        </span>
                      )}
                      {r.sc && <span className="text-xs text-slate-400">{r.sc}</span>}
                      {r.kg != null && r.kg > 0 && (
                        <span className="text-xs font-medium text-sky-400">+{r.kg} kg</span>
                      )}
                      {r.va && <span className="text-xs text-slate-400">· {r.va}</span>}
                      {isPr && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
                          <Trophy size={11} /> PR
                        </span>
                      )}
                    </div>
                    {(r.no || r.od) && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {r.od && (
                          <span className="text-amber-500">
                            ⚠ data originale {r.od} ·{" "}
                          </span>
                        )}
                        {r.no}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* anomalie */}
        <div className="mt-5">
          <button
            onClick={() => setShowAnom(!showAnom)}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5 text-left text-sm font-medium text-slate-200"
          >
            <AlertTriangle size={15} className="text-amber-400" />
            Anomalie e correzioni applicate ({ANOM.length})
            <ChevronDown
              size={16}
              className={
                "ml-auto text-slate-400 transition-transform " +
                (showAnom ? "rotate-180" : "")
              }
            />
          </button>
          {showAnom && (
            <ul className="mt-2 space-y-2 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 text-xs leading-relaxed text-slate-300">
              {ANOM.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-400">⚠</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Le righe con ⚠ riportano la data originale del diario · CSV con separatore «;» per Excel
        </p>
      </div>
    </div>
  );
}
