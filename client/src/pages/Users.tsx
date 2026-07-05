import React from 'react';
import { Users as UsersIcon } from 'lucide-react';

export const Users: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl mb-4">
          <UsersIcon className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          User Management
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md text-center leading-relaxed">
          Welcome to the User Administration panel. This area is restricted to administrators.
        </p>
      </div>
    </div>
  );
};
