import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Ticket, BookOpen, Users, LogOut, ShieldAlert, UserCog } from 'lucide-react';
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
  ];

  // Restrict agent view access to ADMIN-only pages
  if (user?.role === Role.ADMIN) {
    navItems.push({ label: 'Manage Agents', path: '/dashboard/agents', icon: Users });
    navItems.push({ label: 'Users', path: '/users', icon: UserCog });
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-slate-900/40 border-r border-slate-800/80 flex flex-col backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="p-2 bg-violet-600/10 border border-violet-500/20 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="font-bold text-white tracking-wide text-sm">HelpDesk Portal</h2>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{user?.role}</span>
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
                    ? 'bg-violet-600/20 text-violet-300 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.07)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-violet-300' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-500/20 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Navigation Bar */}
        <header className="h-16 bg-slate-900/20 border-b border-slate-800/80 flex items-center justify-between px-8 backdrop-blur-md">
          <h1 className="text-lg font-semibold text-white">
            {location.pathname === '/dashboard'
              ? 'Performance Overview'
              : location.pathname.startsWith('/dashboard/tickets')
              ? 'Ticket Management Queue'
              : location.pathname.startsWith('/dashboard/kb')
              ? 'Knowledge Base Editor'
              : location.pathname.startsWith('/dashboard/agents')
              ? 'Agent Operations'
              : location.pathname.startsWith('/users')
              ? 'User Administration'
              : 'Support Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Welcome, {user ? (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)) : ''}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-sans">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-950 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.03),transparent_50%)] pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
