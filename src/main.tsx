import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { ConfigErrorScreen } from '@/components/ConfigErrorScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { readEnv } from '@/lib/env';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root non trovato in index.html.');
}

// Le env sono validate qui, prima di montare l'app: senza configurazione
// l'AuthProvider non viene nemmeno creato e il client Supabase non parte.
const envResult = readEnv();

createRoot(rootElement).render(
  <StrictMode>
    {envResult.ok ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <ConfigErrorScreen missing={envResult.missing} />
    )}
  </StrictMode>,
);
