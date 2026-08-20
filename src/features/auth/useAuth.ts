import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthContext';

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth deve essere usato dentro <AuthProvider>.');
  }
  return value;
}
