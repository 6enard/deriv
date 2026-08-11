import { useEffect, useState, useCallback } from 'react';
import { History, Loader2, RefreshCw, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { getProfitTable } from '@/lib/derivApi';
import type { ProfitTableEntry } from '@/lib/derivTypes';
import { useAuth } from '@/context/AuthContext';

type FilterType = 'all' | 'win' | 'loss';

export default function HistoryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ProfitTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getProfitTable({ limit: 100, sort: 'DESC' });
      if (resp.error) throw new Error(resp.error.message);
      setEntries(resp.profit_table?.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredEntries = entries.filter((e) => {
    if (filter === 'win') return e.profit > 0;
    if (filter === 'loss') return e.profit < 0;
    return true;
  });

  const totalProfit = entries.reduce((sum, e) => sum + (e.profit || 0), 0);
  const wins = entries.filter((e) => e.profit > 0).length;
  const losses = entries.filter((e) => e.profit < 0).length;
  const winRate = entries.length > 0 ? (wins / entries.length) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total Trades</span>
            <History className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold">{entries.length}</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Win Rate</span>
            <span className="text-xs text-slate-500">{wins}W / {losses}L</span>
          </div>
          <div className={`text-2xl font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Net Profit/Loss</span>
            {totalProfit >= 0 ? <TrendingUp className="w-4.5 h-4.5 text-emerald-400" /> : <TrendingDown className="w-4.5 h-4.5 text-red-400" />}
          </div>
          <div className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total Volume</span>
            <span className="text-xs text-slate-500">{user?.currency}</span>
          </div>
          <div className="text-2xl font-bold font-mono">
            {entries.reduce((sum, e) => sum + e.buy_price, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold">Trading History</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex gap-1">
                {(['all', 'win', 'loss'] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition capitalize ${
                      filter === f
                        ? 'bg-slate-700 text-slate-200'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'win' ? 'Wins' : 'Losses'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={loadHistory}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading history...
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-red-400">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <History className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No trading history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500">
                  <th className="text-left font-medium px-5 py-3">Contract</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Purchase Time</th>
                  <th className="text-right font-medium px-5 py-3">Stake</th>
                  <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">Payout</th>
                  <th className="text-right font-medium px-5 py-3">Sell Price</th>
                  <th className="text-right font-medium px-5 py-3">Profit/Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredEntries.map((entry) => (
                  <tr key={entry.contract_id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-slate-300 truncate max-w-xs">{entry.longcode}</div>
                      <div className="text-xs text-slate-500 sm:hidden mt-0.5">
                        {new Date(entry.purchase_time * 1000).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="text-sm text-slate-300">
                        {new Date(entry.purchase_time * 1000).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(entry.purchase_time * 1000).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-mono text-slate-300">
                      {entry.buy_price.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-mono text-slate-400 hidden sm:table-cell">
                      {entry.payout.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-mono text-slate-300">
                      {entry.sell_price.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm font-mono font-semibold inline-flex items-center gap-1 ${
                        entry.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {entry.profit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
