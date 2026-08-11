import { useEffect, useRef, useState } from 'react';
import type { Candle } from '@/lib/derivTypes';
import { getTicksHistory } from '@/lib/derivApi';

interface CandleChartProps {
  symbol: string;
  granularity?: number;
  height?: number;
  compact?: boolean;
}

const GRANULARITY_OPTIONS = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '1h', value: 3600 },
];

export default function CandleChart({ symbol, granularity = 60, height = 400, compact = false }: CandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gran, setGran] = useState(granularity);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; candle: Candle } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  // Load historical candles
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCandles([]);
    getTicksHistory({
      symbol,
      count: 200,
      style: 'candles',
      granularity: gran,
    })
      .then((resp) => {
        if (cancelled) return;
        if (resp.error) {
          setError(resp.error.message);
          setLoading(false);
          return;
        }
        const data = resp.candles || resp.ohlc || [];
        setCandles(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, gran]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 70, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Price range
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);
    const range = maxPrice - minPrice || 1;
    const pad = range * 0.1;
    maxPrice += pad;
    minPrice -= pad;
    const priceRange = maxPrice - minPrice;

    const candleWidth = chartWidth / candles.length;
    const bodyWidth = Math.max(candleWidth * 0.7, 1);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillStyle = '#64748b';
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      const price = maxPrice - (priceRange / gridLines) * i;
      ctx.fillText(price.toFixed(4), padding.left + chartWidth + 8, y + 4);
    }

    // Candles
    candles.forEach((candle, i) => {
      const x = padding.left + i * candleWidth + candleWidth / 2;
      const isUp = candle.close >= candle.open;
      const color = isUp ? '#10b981' : '#ef4444';

      // Wick
      const yHigh = padding.top + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const yLow = padding.top + ((maxPrice - candle.low) / priceRange) * chartHeight;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const yOpen = padding.top + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const yClose = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyH);
    });

    // Last price line
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const y = padding.top + ((maxPrice - lastCandle.close) / priceRange) * chartHeight;
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(padding.left + chartWidth, y - 10, 62, 20);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px ui-sans-serif, system-ui';
      ctx.fillText(lastCandle.close.toFixed(4), padding.left + chartWidth + 5, y + 4);
    }
  }, [candles, width, height]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (candles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { top: 20, right: 70, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const candleWidth = chartWidth / candles.length;
    const index = Math.floor((x - padding.left) / candleWidth);
    if (index >= 0 && index < candles.length) {
      setHoverInfo({ x: e.clientX - rect.left, y: e.clientY - rect.top, candle: candles[index] });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            {GRANULARITY_OPTIONS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGran(g.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  gran === g.value
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
          Loading chart data...
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center justify-center text-red-400 text-sm" style={{ height }}>
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="relative" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverInfo(null)}>
          <canvas ref={canvasRef} />
          {hoverInfo && (
            <div
              className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl z-10"
              style={{
                left: Math.min(hoverInfo.x + 12, width - 160),
                top: Math.max(hoverInfo.y - 60, 8),
              }}
            >
              <div className="text-slate-400 mb-1">
                {new Date(hoverInfo.candle.epoch * 1000).toLocaleString()}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <span className="text-slate-500">O:</span><span className="text-slate-200">{hoverInfo.candle.open.toFixed(4)}</span>
                <span className="text-slate-500">H:</span><span className="text-emerald-400">{hoverInfo.candle.high.toFixed(4)}</span>
                <span className="text-slate-500">L:</span><span className="text-red-400">{hoverInfo.candle.low.toFixed(4)}</span>
                <span className="text-slate-500">C:</span><span className="text-slate-200">{hoverInfo.candle.close.toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
