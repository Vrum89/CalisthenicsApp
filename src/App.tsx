import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { BodyWeightPage } from '@/features/bodyWeight/BodyWeightPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { HomePage } from '@/routes/HomePage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/weight"
        element={
          <RequireAuth>
            <BodyWeightPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
