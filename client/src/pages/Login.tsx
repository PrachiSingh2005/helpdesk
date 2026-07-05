import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative ambient glowing backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700/50">
        {/* Top colored accent bar */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
        
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <div className="p-3 bg-violet-500/10 rounded-2xl mb-4 border border-violet-500/20">
            <ShieldCheck className="w-10 h-10 text-violet-400" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-white">HelpDesk Support</CardTitle>
          <CardDescription className="text-slate-400 text-sm font-medium mt-1.5">
            Agent & Admin Portal Access
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@helpdesk.edu"
                  {...register('email')}
                  className={`pl-10 bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 ${
                    errors.email ? 'border-destructive focus-visible:border-destructive' : ''
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`pl-10 bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 ${
                    errors.password ? 'border-destructive focus-visible:border-destructive' : ''
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-6 shadow-lg shadow-indigo-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
