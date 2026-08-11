import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader as Loader2, CircleAlert as AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { redirectToDerivLogin } from '@/lib/derivOauth';

export default function Login() {
  const { loading, error, user } = useAuth();
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
        <p className="text-slate-400 text-sm text-center mb-8">
          A trading platform built on the Deriv API. Sign in securely with your Deriv account to start trading.
        </p>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
            <p className="text-slate-400 text-sm">Authenticating...</p>
          </div>
        ) : error ? (
          <div className="w-full flex flex-col gap-4">
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="mb-1">Failed to connect to your Deriv account.</p>
                <p className="text-xs text-red-400/70">{error}</p>
              </div>
            </div>
            <button
              onClick={redirectToDerivLogin}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold transition shadow-lg shadow-emerald-500/20"
            >
              <ShieldCheck className="w-5 h-5" />
              Try Again
            </button>
          </div>
        ) : (
          <button
            onClick={redirectToDerivLogin}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            <ShieldCheck className="w-5 h-5" />
            Login with Deriv
          </button>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          You'll be redirected to deriv.com to authorize securely.
        </div>
      </div>
    </div>
  );
}
