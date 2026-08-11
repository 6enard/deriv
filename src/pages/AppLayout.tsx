import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  CandlestickChart,
  Briefcase,
  History,
  LogOut,
  Wifi,
  WifiOff,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trade', label: 'Trade', icon: CandlestickChart },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/history', label: 'History', icon: History },
];

export default function AppLayout() {
  const { user, logout, connected } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 border-r border-slate-800 fixed h-full">
        <SidebarContent />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <ConnectionStatus connected={connected} />
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-bold text-sm">
                {user?.fullname?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium">{user?.fullname || 'User'}</div>
                <div className="text-xs text-slate-400">{user?.loginid}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">Account Balance</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${user?.is_virtual ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {user?.is_virtual ? 'Demo' : 'Real'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {user ? formatBalance(user.balance, user.currency) : '—'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{user?.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-950/30 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Account
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <TrendingUp className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight">DerivEdge</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 leading-relaxed">
          Trading involves risk. This is a third-party client for the Deriv API.
        </div>
      </div>
    </>
  );
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      {connected ? 'Live' : 'Disconnected'}
    </div>
  );
}

function formatBalance(balance: number, currency: string) {
  return `${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
