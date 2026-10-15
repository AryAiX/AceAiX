import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { configMissing } from './lib/supabase';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ContentPage from './pages/ContentPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import YouthSafetyPage from './pages/YouthSafetyPage';
import SponsorshipPage from './pages/SponsorshipPage';
import BookingsPage from './pages/BookingsPage';
import AuditPage from './pages/AuditPage';

export default function App() {
  const { loading, me } = useAuth();

  if (configMissing) {
    return (
      <div className="mx-auto max-w-lg p-10 text-sm">
        <h1 className="text-lg font-semibold">Configuration missing</h1>
        <p className="mt-2 text-slate-600">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>).
        </p>
      </div>
    );
  }
  if (loading) return <Loading />;
  if (!me) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="youth-safety" element={<YouthSafetyPage />} />
        <Route path="sponsorship" element={<SponsorshipPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
