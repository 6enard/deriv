import { useEffect, useRef, useState } from 'react';
import { subscribeTicks } from '@/lib/derivApi';
import type { TicksHistoryResponse } from '@/lib/derivTypes';

export function useLivePrice(symbol: string | null) {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setPrice(null);
    setPrevPrice(null);
    setHistory([]);

    subscribeTicks(symbol, (data: TicksHistoryResponse) => {
      if (cancelled) return;
      // tick stream response
      const tick = (data as unknown as { tick: { quote: number; epoch: number } }).tick;
      if (tick) {
        setPrevPrice((p) => {
          if (p !== null && tick.quote !== p) {
            setHistory((h) => [...h.slice(-49), tick.quote]);
          }
          return price;
        });
        setPrice(tick.quote);
      }
    }).then((sub) => {
      if (cancelled) {
        sub.unsubscribe();
        return;
      }
      unsubRef.current = sub.unsubscribe;
    });

    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const direction = price !== null && prevPrice !== null ? (price > prevPrice ? 'up' : price < prevPrice ? 'down' : 'flat') : 'flat';

  return { price, prevPrice, direction, history };
}
