import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { TicketsList } from './pages/TicketsList';
import { TicketDetail } from './pages/TicketDetail';
import { KBManager } from './pages/KBManager';
import { AgentManager } from './pages/AgentManager';
import { Users } from './pages/Users';
import { EmailSimulator } from './pages/EmailSimulator';
import { Loader2 } from 'lucide-react';
import { Role } from './utils/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});


/**
 * Route authorization protector. Evaluates login status and role privileges.
 */
const ProtectedRoute: React.FC<{ allowedRoles?: Array<Role> }> = ({
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="text-sm font-semibold tracking-wider text-slate-400 font-medium">
            Verifying Portal Access...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public login route */}
            <Route path="/login" element={<Login />} />

            {/* Secure authenticated dashboard routes */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.AGENT]} />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="tickets" element={<TicketsList />} />
                <Route path="tickets/:id" element={<TicketDetail />} />
                <Route path="kb" element={<KBManager />} />
                <Route path="email-simulator" element={<EmailSimulator />} />
                {/* Admin only subroute */}
                <Route path="agents" element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
                  <Route index element={<AgentManager />} />
                </Route>
              </Route>
            </Route>

            {/* Admin only page at /users */}
            <Route path="/users" element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Users />} />
              </Route>
            </Route>

            {/* Root redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

