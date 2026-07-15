import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { user, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect authenticated users to the dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginSchemaType) => {
    setError(null);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Theme toggle button at top right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-card/80 backdrop-blur-md hover:bg-teal-500/10 text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 border border-border hover:border-teal-500/20 rounded-xl transition-all duration-200 cursor-pointer shadow-md"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Decorative ambient glowing backgrounds (Ocean Frost theme) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />

      <Card className="w-full max-w-md border-border bg-card/80 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-teal-500/30 hover:shadow-teal-500/5">
        {/* Top colored accent bar */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-teal-500 to-cyan-500" />
        
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <div className="p-3 bg-teal-500/10 rounded-2xl mb-4 border border-teal-500/20">
            <ShieldCheck className="w-10 h-10 text-teal-600 dark:text-teal-400" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground">HelpDesk Support</CardTitle>
          <CardDescription className="text-muted-foreground text-sm font-medium mt-1.5">
            Agent & Admin Portal Access
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@helpdesk.edu"
                  {...register('email')}
                  className={`pl-10 bg-card border-border text-foreground placeholder-slate-400 focus-visible:ring-teal-500/30 focus-visible:border-teal-500 ${
                    errors.email ? 'border-destructive focus-visible:border-destructive' : ''
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`pl-10 bg-card border-border text-foreground placeholder-slate-400 focus-visible:ring-teal-500/30 focus-visible:border-teal-500 ${
                    errors.password ? 'border-destructive focus-visible:border-destructive' : ''
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold py-6 shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
