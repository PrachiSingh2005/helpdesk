import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Ticket, BookOpen, Users, LogOut, ShieldAlert, UserCog, Mail } from 'lucide-react';
import { Role } from '../utils/api';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Ticket Queue', path: '/dashboard/tickets', icon: Ticket },
    { label: 'Knowledge Base', path: '/dashboard/kb', icon: BookOpen },
    { label: 'Email Simulator', path: '/dashboard/email-simulator', icon: Mail },
  ];

  // Restrict agent view access to ADMIN-only pages
  if (user?.role === Role.ADMIN) {
    navItems.push({ label: 'Manage Agents', path: '/dashboard/agents', icon: Users });
    navItems.push({ label: 'Users', path: '/users', icon: UserCog });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-card border-r border-border flex flex-col backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="p-2 bg-muted border border-border rounded-xl">
            <ShieldAlert className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground tracking-wide text-sm">HelpDesk Portal</h2>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{user?.role}</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Highlight link if URL matches path prefix
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? 'bg-neutral-100 text-foreground border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Navigation Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {location.pathname !== '/dashboard' && (
              <h1 className="text-sm font-medium text-muted-foreground">
                {location.pathname.startsWith('/dashboard/tickets')
                  ? 'Ticket Management Queue'
                  : location.pathname.startsWith('/dashboard/kb')
                  ? 'Knowledge Base Editor'
                  : location.pathname.startsWith('/dashboard/agents')
                  ? 'Agent Operations'
                  : location.pathname.startsWith('/dashboard/email-simulator')
                  ? 'Inbound Email Simulator'
                  : location.pathname.startsWith('/users')
                  ? 'Users'
                  : 'Support Dashboard'}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Welcome, {user ? (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)) : ''}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-foreground bg-muted border border-border px-2 py-0.5 rounded-full font-sans">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-neutral-100 text-foreground border border-border rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-8 overflow-y-auto bg-background relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.01),transparent_50%)] pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
