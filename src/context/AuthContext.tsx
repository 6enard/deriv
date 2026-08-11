import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authorize, onConnectionChange, subscribeBalance } from '@/lib/derivApi';
import type { AuthorizeResponse } from '@/lib/derivTypes';

interface AuthUser {
  loginid: string;
  email: string;
  fullname: string;
  balance: number;
  currency: string;
  is_virtual: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  token: string | null;
  updateBalance: (balance: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DERIV_API_TOKEN = 'pat_82f13659db9f231d89c67606411b4a3edcd0acdc05a608587161d1ed4d2575af';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState<string | null>(DERIV_API_TOKEN);

  useEffect(() => {
    const unsub = onConnectionChange((c) => setConnected(c));
    return unsub;
  }, []);

  const login = useCallback(async (apiToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp: AuthorizeResponse = await authorize(apiToken);
      if (resp.error) throw new Error(resp.error.message);
      const a = resp.authorize;
      setToken(apiToken);
      setUser({
        loginid: a.loginid,
        email: a.email,
        fullname: a.fullname,
        balance: a.balance,
        currency: a.currency,
        is_virtual: a.is_virtual,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authorization failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateBalance = useCallback((balance: number) => {
    setUser((prev) => (prev ? { ...prev, balance } : prev));
  }, []);

  // Auto-login on mount using the hardcoded token
  useEffect(() => {
    if (token && !user) {
      login(token).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to balance updates when logged in
  useEffect(() => {
    if (!token || !user) return;
    let unsub: (() => void) | undefined;
    subscribeBalance((data) => {
      if (data.balance) updateBalance(data.balance.balance);
    }).then((u) => {
      unsub = u.unsubscribe;
    });
    return () => {
      if (unsub) unsub();
    };
  }, [token, user, updateBalance]);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, connected, login, logout, token, updateBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
