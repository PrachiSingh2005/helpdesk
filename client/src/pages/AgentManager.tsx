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
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Left Column: Create new agent form */}
      <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl h-fit">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
          <Plus className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Create Agent Account
          </h3>
        </div>

        <form onSubmit={handleCreateAgent} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@helpdesk.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Access Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={Role.AGENT}>Support Agent</option>
              <option value={Role.ADMIN}>System Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isCreating || !email.trim() || !password.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
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
      <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
          <Users className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Registered Agents
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="divide-y divide-slate-800/50">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <span className="text-sm font-bold text-slate-200 block">{agent.email}</span>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold mt-1 inline-block ${
                  agent.role === Role.ADMIN ? 'text-violet-400 animate-pulse' : 'text-slate-400'
                }`}>
                  {agent.role === Role.ADMIN ? 'Administrator' : 'Agent'}
                </span>
              </div>
              
              {agent.id !== currentUser?.id ? (
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/20 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-xs text-slate-500 italic bg-slate-900 border border-slate-800/50 px-3 py-1 rounded-full font-semibold">
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
