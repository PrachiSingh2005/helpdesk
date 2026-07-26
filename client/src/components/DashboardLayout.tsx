import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Ticket, BookOpen, Users, LogOut, ShieldAlert, UserCog, Mail, Sun, Moon, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { Role } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    navItems.push({ label: 'Admin Settings', path: '/dashboard/settings', icon: SettingsIcon });
  }

  const renderNavContent = () => (
    <>
      <div className="p-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl shadow-sm">
            <ShieldAlert className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="font-bold tracking-wide text-sm bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              HelpDesk Portal
            </h2>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest font-extrabold">{user?.role}</span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="p-2 lg:hidden text-muted-foreground hover:text-foreground rounded-xl"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                isActive
                  ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-teal-500/5 hover:border-teal-500/10 border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground group-hover:text-foreground'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-red-600 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-red-500/70" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans max-w-[100vw] overflow-x-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-in Drawer Sidebar */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col backdrop-blur-xl shadow-2xl transition-transform duration-300 lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent()}
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card/70 border-r border-border flex-col backdrop-blur-xl shrink-0">
        {renderNavContent()}
      </aside>

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Header Navigation Bar */}
        <header className="h-16 bg-card/85 border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile/Tablet */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 lg:hidden text-muted-foreground hover:text-foreground rounded-xl border border-border bg-card"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {location.pathname !== '/dashboard' && (
              <h1 className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-tight truncate max-w-[160px] sm:max-w-xs md:max-w-none">
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

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-foreground truncate max-w-[100px] sm:max-w-none">
                {user ? (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)) : ''}
              </span>
              <span className="hidden xs:inline-flex text-[10px] uppercase tracking-wider font-extrabold text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-sans">
                {user?.role}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 bg-secondary hover:bg-teal-500/10 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 border border-border hover:border-teal-500/20 rounded-xl transition-all duration-200 cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-secondary hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 border border-border hover:border-teal-500/20 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-background relative max-w-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.02),transparent_50%)] pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

