import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/features/auth/useAuth';

/** Guardia di rotta: tutto cio' che tocca dati dell'utente sta dietro questa. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;

  return <>{children}</>;
}
