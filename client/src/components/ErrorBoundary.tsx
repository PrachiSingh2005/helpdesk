import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Boundary Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100 font-sans">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.05),transparent_50%)] pointer-events-none" />
          
          <div className="w-full max-w-md border border-red-500/20 bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
            <div className="p-3 bg-red-500/10 rounded-2xl mb-4 border border-red-500/20">
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              An unexpected application rendering error occurred. The trace details have been logged.
            </p>
            
            {this.state.error && (
              <pre className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left text-xs font-mono text-red-300/80 mb-6 max-h-40 overflow-y-auto overflow-x-hidden whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            )}
            
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold rounded-xl transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              Reset Application & Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
