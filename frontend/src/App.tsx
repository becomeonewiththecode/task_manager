import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SharePage } from '@/pages/SharePage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { useAuthStore } from '@/store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Public share page — no auth required */}
        <Route path="/share/:token" element={<SharePage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
