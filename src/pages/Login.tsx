import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { login, loading, error, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, #10b981 0%, transparent 40%), radial-gradient(circle at 80% 70%, #0ea5e9 0%, transparent 40%)',
      }} />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
          <TrendingUp className="w-9 h-9 text-slate-900" strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">DerivEdge</h1>

        {loading && (
          <>
            <p className="text-slate-400 text-sm mb-6">Connecting to Deriv API...</p>
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </>
        )}

        {error && !loading && (
          <div className="w-full mt-4 flex items-start gap-2.5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
            <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="mb-1">Failed to connect to your Deriv account.</p>
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <p className="text-slate-400 text-sm">Redirecting...</p>
        )}
      </div>
    </div>
  );
}
