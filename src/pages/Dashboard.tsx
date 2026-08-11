import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Search, Activity, Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { getActiveSymbols } from '@/lib/derivApi';
import type { ActiveSymbol } from '@/lib/derivTypes';
import { useAuth } from '@/context/AuthContext';
import { useLivePrice } from '@/hooks/useLivePrice';
import CandleChart from '@/components/CandleChart';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<ActiveSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('R_100');

  useEffect(() => {
    getActiveSymbols()
      .then((resp) => {
        if (resp.active_symbols) {
          // Sort: synthetic indices first, then by display name
          const sorted = [...resp.active_symbols].sort((a, b) => {
            const aSyn = a.market === 'synthetic_index' ? 0 : 1;
            const bSyn = b.market === 'synthetic_index' ? 0 : 1;
            if (aSyn !== bSyn) return aSyn - bSyn;
            return a.display_name.localeCompare(b.display_name);
          });
          setSymbols(sorted);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredSymbols = useMemo(() => {
    if (!search) return symbols;
    return symbols.filter(
      (s) =>
        s.display_name.toLowerCase().includes(search.toLowerCase()) ||
        s.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [symbols, search]);

  // Group by market
  const grouped = useMemo(() => {
    const groups: Record<string, ActiveSymbol[]> = {};
    filteredSymbols.forEach((s) => {
      const key = s.market_display_name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filteredSymbols]);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Wallet}
          label="Account Balance"
          value={user ? `${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${user.currency}` : '—'}
          accent="emerald"
        />
        <StatCard
          icon={Activity}
          label="Account Type"
          value={user?.is_virtual ? 'Demo Account' : 'Real Account'}
          accent={user?.is_virtual ? 'amber' : 'sky'}
        />
        <StatCard
          icon={TrendingUp}
          label="Available Markets"
          value={symbols.length.toString()}
          accent="violet"
        />
      </div>

      {/* Main chart */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {symbols.find((s) => s.symbol === selectedSymbol)?.display_name || selectedSymbol}
            </h2>
            <p className="text-xs text-slate-500">Live price chart</p>
          </div>
          <button
            onClick={() => navigate(`/trade?symbol=${selectedSymbol}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition text-sm font-medium"
          >
            Trade this market
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <CandleChart symbol={selectedSymbol} height={380} />
      </div>

      {/* Symbol list */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Markets</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm w-48 sm:w-64 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading markets...
          </div>
        ) : (
          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(grouped).map(([market, items]) => (
              <div key={market}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">{market}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((sym) => (
                    <SymbolCard
                      key={sym.symbol}
                      symbol={sym}
                      selected={sym.symbol === selectedSymbol}
                      onClick={() => setSelectedSymbol(sym.symbol)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SymbolCard({ symbol, selected, onClick }: { symbol: ActiveSymbol; selected: boolean; onClick: () => void }) {
  const { price, direction } = useLivePrice(symbol.exchange_is_open ? symbol.symbol : null);
  const isOpen = symbol.exchange_is_open === 1;

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between p-3.5 rounded-xl border transition text-left ${
        selected
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{symbol.display_name}</div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          {isOpen ? 'Open' : 'Closed'}
        </div>
      </div>
      <div className="text-right">
        {price !== null ? (
          <>
            <div className={`text-sm font-mono font-medium flex items-center gap-1 justify-end ${
              direction === 'up' ? 'text-emerald-400' : direction === 'down' ? 'text-red-400' : 'text-slate-200'
            }`}>
              {direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              {price.toFixed(4)}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </div>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: 'emerald' | 'amber' | 'sky' | 'violet' }) {
  const colors = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20',
    sky: 'from-sky-500/10 to-sky-500/5 text-sky-400 border-sky-500/20',
    violet: 'from-violet-500/10 to-violet-500/5 text-violet-400 border-violet-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} rounded-2xl border p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  );
}
