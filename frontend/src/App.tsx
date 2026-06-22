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
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminRoute from '@/components/Admin/AdminRoute';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import AdminUserDetailPage from '@/pages/AdminUserDetailPage';
import AdminMailPage from '@/pages/AdminMailPage';
import AdminHealthPage from '@/pages/AdminHealthPage';
import AdminMonitoringPage from '@/pages/AdminMonitoringPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import AdminBackupPage from '@/pages/AdminBackupPage';
import AdminAuditPage from '@/pages/AdminAuditPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function IndexRedirect() {
  const user = useAuthStore((s) => s.user);
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((e: string) => e.trim().toLowerCase()) || [];
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase());
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
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
          <Route index element={<IndexRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="monitoring" element={<AdminMonitoringPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="backup" element={<AdminBackupPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="mail" element={<AdminMailPage />} />
          <Route path="health" element={<AdminHealthPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
