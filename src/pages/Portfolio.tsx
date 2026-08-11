import { useEffect, useState, useCallback } from 'react';
import { Briefcase, Loader2, RefreshCw, TrendingUp, TrendingDown, Clock, DollarSign, X } from 'lucide-react';
import { getPortfolio, subscribeAllOpenContracts, sellContract } from '@/lib/derivApi';
import type { PortfolioPosition, OpenContract } from '@/lib/derivTypes';
import { useAuth } from '@/context/AuthContext';

export default function Portfolio() {
  const { user, updateBalance } = useAuth();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [contracts, setContracts] = useState<Record<number, OpenContract>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selling, setSelling] = useState<number | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getPortfolio();
      if (resp.error) throw new Error(resp.error.message);
      setPositions(resp.portfolio?.contracts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();

    // Subscribe to all open contract updates
    let unsub: (() => void) | undefined;
    subscribeAllOpenContracts((data) => {
      if (data.error) return;
      const contract = data.proposal_open_contract;
      if (contract) {
        setContracts((prev) => ({ ...prev, [contract.contract_id]: contract }));
        if (contract.is_sold) {
          setPositions((prev) => prev.filter((p) => p.contract_id !== contract.contract_id));
        }
      }
    }).then((sub) => {
      unsub = sub.unsubscribe;
    }).catch(() => {});

    return () => {
      if (unsub) unsub();
    };
  }, [loadPortfolio]);

  const handleSell = async (contractId: number) => {
    setSelling(contractId);
    try {
      const resp = await sellContract(contractId, 0);
      if (resp.error) throw new Error(resp.error.message);
      updateBalance(resp.sell.balance_after);
      setPositions((prev) => prev.filter((p) => p.contract_id !== contractId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell contract');
    } finally {
      setSelling(null);
    }
  };

  const totalProfit = Object.values(contracts).reduce((sum, c) => sum + (c.profit || 0), 0);
  const totalValue = positions.reduce((sum, p) => sum + p.buy_price, 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Open Positions</span>
            <Briefcase className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold">{positions.length}</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total Stake</span>
            <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {totalValue.toFixed(2)} <span className="text-sm text-slate-500">{user?.currency}</span>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Unrealized P/L</span>
            {totalProfit >= 0 ? <TrendingUp className="w-4.5 h-4.5 text-emerald-400" /> : <TrendingDown className="w-4.5 h-4.5 text-red-400" />}
          </div>
          <div className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} <span className="text-sm text-slate-500">{user?.currency}</span>
          </div>
        </div>
      </div>

      {/* Positions */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold">Open Positions</h2>
          <button
            onClick={loadPortfolio}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading positions...
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-red-400">{error}</div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Briefcase className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No open positions</p>
            <p className="text-xs mt-1">Purchase a contract from the Trade page to see it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {positions.map((pos) => {
              const contract = contracts[pos.contract_id];
              const profit = contract?.profit ?? 0;
              const isExpired = contract?.is_expired === 1;
              const isValidToSell = contract?.is_valid_to_sell === 1;
              const entrySpot = contract?.entry_spot;
              const currentSpot = contract?.exit_tick;

              return (
                <div key={pos.contract_id} className="p-4 hover:bg-slate-800/30 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          pos.contract_type === 'CALL' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {pos.contract_type === 'CALL' ? 'UP' : 'DOWN'}
                        </span>
                        <span className="text-sm font-medium truncate">{pos.display_name}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-xl">{pos.longcode}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                        <span className="text-slate-400">
                          Stake: <span className="font-mono text-slate-300">{pos.buy_price.toFixed(2)} {user?.currency}</span>
                        </span>
                        <span className="text-slate-400">
                          Payout: <span className="font-mono text-slate-300">{pos.payout.toFixed(2)} {user?.currency}</span>
                        </span>
                        {entrySpot !== undefined && (
                          <span className="text-slate-400">
                            Entry: <span className="font-mono text-slate-300">{entrySpot.toFixed(4)}</span>
                          </span>
                        )}
                        {currentSpot !== undefined && (
                          <span className="text-slate-400">
                            Current: <span className="font-mono text-slate-300">{currentSpot.toFixed(4)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Profit/Live */}
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Current P/L</div>
                          <div className={`text-sm font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                          </div>
                        </div>

                      {/* Sell button */}
                      {!isExpired && isValidToSell && (
                        <button
                          onClick={() => handleSell(pos.contract_id)}
                          disabled={selling === pos.contract_id}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition text-xs font-medium disabled:opacity-50"
                        >
                          {selling === pos.contract_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Sell
                        </button>
                      )}
                      {isExpired && (
                        <span className="text-xs text-slate-500 px-3 py-2">
                          <Clock className="w-3.5 h-3.5 inline mr-1" />
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
