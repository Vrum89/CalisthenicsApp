import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { ConfigErrorScreen } from '@/components/ConfigErrorScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { readEnv } from '@/lib/env';
import { guardStylesheets } from '@/lib/styleGuard';
import '@/index.css';

// Prima di tutto: se il CSS non e' arrivato, l'app va rimessa in piedi — senza
// stile e' illeggibile, e nessuna schermata di errore si vedrebbe comunque.
guardStylesheets();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root non trovato in index.html.');
}

// Le env sono validate qui, prima di montare l'app: senza configurazione
// l'AuthProvider non viene nemmeno creato e il client Supabase non parte.
const envResult = readEnv();

// L'I18nProvider avvolge anche la schermata di configurazione: un'app che non
// parte deve comunque spiegarsi nella lingua giusta.
createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      {envResult.ok ? (
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      ) : (
        <ConfigErrorScreen missing={envResult.missing} />
      )}
    </I18nProvider>
  </StrictMode>,
);
