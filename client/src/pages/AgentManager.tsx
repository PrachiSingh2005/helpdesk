import React, { useState, useEffect } from 'react';
import { api, Role } from '../utils/api';
import type { User } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Trash2, Mail, KeyRound, Loader2 } from 'lucide-react';

export const AgentManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Editor State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.AGENT);
  const [isCreating, setIsCreating] = useState(false);

  const fetchAgents = async () => {
    try {
      const data = await api.agents.list();
      setAgents(data.agents);
    } catch (err: any) {
      setError(err.message || 'Failed to load agents list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsCreating(true);

    try {
      const data = await api.agents.create({ email, password, role });
      setAgents((prev) => [data.agent, ...prev]);
      setEmail('');
      setPassword('');
      setRole(Role.AGENT);
      alert('Agent account created successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to create agent account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (agentId === currentUser?.id) {
      alert('You cannot delete your own admin account.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      await api.agents.delete(agentId);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent account.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Left Column: Create new agent form */}
      <div className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl h-fit shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
          <Plus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Create Agent Account
          </h3>
        </div>

        <form onSubmit={handleCreateAgent} className="space-y-5">
          <div>
            <label className="block text-muted-foreground text-xs font-semibold mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/80">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@helpdesk.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border focus:ring-teal-500/10 focus:border-teal-500 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground text-xs font-semibold mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/80">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border focus:ring-teal-500/10 focus:border-teal-500 rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground text-xs font-semibold mb-2">Access Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none focus:ring-2 transition-all cursor-pointer"
            >
              <option value={Role.AGENT} className="bg-card">Support Agent</option>
              <option value={Role.ADMIN} className="bg-card">System Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isCreating || !email.trim() || !password.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Registered agents list */}
      <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
          <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Registered Agents
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="divide-y divide-border/60">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <span className="text-sm font-bold text-foreground block">{agent.email}</span>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold mt-1 inline-block ${
                  agent.role === Role.ADMIN ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground'
                }`}>
                  {agent.role === Role.ADMIN ? 'Administrator' : 'Agent'}
                </span>
              </div>
              
              {agent.id !== currentUser?.id ? (
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  You
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
