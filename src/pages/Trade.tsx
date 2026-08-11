import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Search,
  Wallet,
} from 'lucide-react';
import { getActiveSymbols, getProposal, buyContract, subscribeProposal } from '@/lib/derivApi';
import type { ActiveSymbol, ProposalResponse } from '@/lib/derivTypes';
import { useAuth } from '@/context/AuthContext';
import { useLivePrice } from '@/hooks/useLivePrice';
import CandleChart from '@/components/CandleChart';

type TradeType = 'CALL' | 'PUT';
type DurationUnit = 't' | 's' | 'm' | 'h';

const DURATION_UNITS: { label: string; value: DurationUnit }[] = [
  { label: 'Ticks', value: 't' },
  { label: 'Seconds', value: 's' },
  { label: 'Minutes', value: 'm' },
  { label: 'Hours', value: 'h' },
];

export default function Trade() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<ActiveSymbol[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolDropdown, setSymbolDropdown] = useState(false);

  const selectedSymbol = searchParams.get('symbol') || 'R_100';

  const [tradeType, setTradeType] = useState<TradeType>('CALL');
  const [stake, setStake] = useState('10');
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('t');

  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string; contractId?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveSymbols()
      .then((resp) => {
        if (resp.active_symbols) {
          setSymbols(resp.active_symbols.sort((a, b) => a.display_name.localeCompare(b.display_name)));
        }
        setLoadingSymbols(false);
      })
      .catch(() => setLoadingSymbols(false));
  }, []);

  const currentSymbol = useMemo(
    () => symbols.find((s) => s.symbol === selectedSymbol),
    [symbols, selectedSymbol]
  );

  const { price, direction } = useLivePrice(currentSymbol?.exchange_is_open ? selectedSymbol : null);

  // Subscribe to live proposal updates
  useEffect(() => {
    if (!currentSymbol || !stake || !duration) return;
    let unsub: (() => void) | undefined;
    setProposalLoading(true);
    setError(null);
    setBuyResult(null);

    const stakeNum = parseFloat(stake);
    const durNum = parseInt(duration);
    if (isNaN(stakeNum) || stakeNum <= 0 || isNaN(durNum) || durNum <= 0) {
      setProposalLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      subscribeProposal(
        {
          contract_type: tradeType,
          amount: stakeNum,
          basis: 'stake',
          duration: durNum,
          duration_unit: durationUnit,
          symbol: selectedSymbol,
          currency: user?.currency || 'USD',
        },
        (data: ProposalResponse) => {
          if (data.error) {
            setError(data.error.message);
            setProposalLoading(false);
            return;
          }
          setProposal(data);
          setProposalLoading(false);
        }
      ).then((sub) => {
        unsub = sub.unsubscribe;
      }).catch((err) => {
        setError(err.message);
        setProposalLoading(false);
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      if (unsub) unsub();
    };
  }, [selectedSymbol, tradeType, stake, duration, durationUnit, currentSymbol, user?.currency]);

  const handleBuy = async () => {
    if (!proposal?.proposal?.id) return;
    setBuying(true);
    setError(null);
    setBuyResult(null);
    try {
      const resp = await buyContract(proposal.proposal.id, parseFloat(stake));
      setBuyResult({
        success: true,
        message: `Contract purchased: ${resp.buy.longcode}`,
        contractId: resp.buy.contract_id,
      });
    } catch (err) {
      setBuyResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to purchase contract',
      });
    } finally {
      setBuying(false);
    }
  };

  const filteredSymbols = useMemo(() => {
    if (!symbolSearch) return symbols;
    return symbols.filter((s) =>
      s.display_name.toLowerCase().includes(symbolSearch.toLowerCase()) ||
      s.symbol.toLowerCase().includes(symbolSearch.toLowerCase())
    );
  }, [symbols, symbolSearch]);

  return (
    <div className="space-y-5">
      {/* Symbol selector + live price */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative">
            <button
              onClick={() => setSymbolDropdown(!symbolDropdown)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition min-w-[240px]"
            >
              <div className="text-left flex-1">
                <div className="text-sm font-semibold">{currentSymbol?.display_name || selectedSymbol}</div>
                <div className="text-xs text-slate-500">{currentSymbol?.market_display_name}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {symbolDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSymbolDropdown(false)} />
                <div className="absolute top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filteredSymbols.map((sym) => (
                      <button
                        key={sym.symbol}
                        onClick={() => {
                          setSearchParams({ symbol: sym.symbol });
                          setSymbolDropdown(false);
                          setSymbolSearch('');
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-700/50 transition ${
                          sym.symbol === selectedSymbol ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium">{sym.display_name}</div>
                          <div className="text-xs text-slate-500">{sym.submarket_display_name}</div>
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full ${sym.exchange_is_open ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500">Live Price</div>
              <div className={`text-xl font-mono font-bold flex items-center gap-1.5 justify-end ${
                direction === 'up' ? 'text-emerald-400' : direction === 'down' ? 'text-red-400' : 'text-slate-200'
              }`}>
                {direction === 'up' && <ArrowUp className="w-4 h-4" />}
                {direction === 'down' && <ArrowDown className="w-4 h-4" />}
                {price !== null ? price.toFixed(4) : '—'}
              </div>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-xs text-slate-500">Balance</div>
              <div className="text-sm font-mono font-medium text-slate-200">
                {user ? `${user.balance.toFixed(2)} ${user.currency}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Trade panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">
              {currentSymbol?.display_name || selectedSymbol}
            </h2>
            {currentSymbol && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                currentSymbol.exchange_is_open ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {currentSymbol.exchange_is_open ? 'Market Open' : 'Market Closed'}
              </span>
            )}
          </div>
          <CandleChart symbol={selectedSymbol} height={420} />
        </div>

        {/* Trade panel */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col">
          <h2 className="text-base font-semibold mb-4">Place Contract</h2>

          {/* Up / Down */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => setTradeType('CALL')}
              className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition ${
                tradeType === 'CALL'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-semibold">Higher / Up</span>
            </button>
            <button
              onClick={() => setTradeType('PUT')}
              className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition ${
                tradeType === 'PUT'
                  ? 'bg-red-500/15 border-red-500 text-red-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm font-semibold">Lower / Down</span>
            </button>
          </div>

          {/* Stake */}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5">Stake (amount)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                min="0.35"
                step="0.01"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-12 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{user?.currency || 'USD'}</span>
            </div>
          </div>

          {/* Duration */}
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-1.5">Duration</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                {DURATION_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Proposal summary */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-4 space-y-2">
            {proposalLoading ? (
              <div className="flex items-center justify-center py-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Getting price...
              </div>
            ) : proposal ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Payout</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {proposal.proposal.payout.toFixed(2)} {user?.currency || 'USD'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Potential profit</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {(proposal.proposal.payout - parseFloat(stake)).toFixed(2)} {user?.currency || 'USD'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Spot</span>
                  <span className="font-mono text-slate-300">{proposal.proposal.spot?.toFixed(4)}</span>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 text-sm py-2">Enter trade parameters</div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs mb-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Buy result */}
          {buyResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-xs mb-3 ${
              buyResult.success
                ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border border-red-800/60 text-red-300'
            }`}>
              {buyResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <div>
                <span>{buyResult.message}</span>
                {buyResult.contractId && (
                  <button
                    onClick={() => navigate('/portfolio')}
                    className="block mt-1 text-emerald-400 underline hover:text-emerald-300"
                  >
                    View in portfolio
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Buy button */}
          <button
            onClick={handleBuy}
            disabled={buying || !proposal || proposalLoading}
            className={`w-full py-3.5 rounded-xl font-semibold transition mt-auto ${
              tradeType === 'CALL'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
          >
            {buying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Purchasing...
              </span>
            ) : (
              `Buy ${tradeType === 'CALL' ? 'Up' : 'Down'} Contract`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
