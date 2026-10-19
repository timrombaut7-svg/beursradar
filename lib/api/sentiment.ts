import type { Candle, FearGreed } from "@/types";
import { cached, fetchJson, withFallback } from "./http";
import { fearGreedLabel, mockFearGreed } from "./mock";
import { rsi, sma, last, historicalVolatility } from "@/lib/indicators";

/** Crypto Fear & Greed Index van alternative.me (gratis, geen key nodig). */
export async function getCryptoFearGreed(): Promise<FearGreed> {
  return cached("fng:crypto", 300, () =>
    withFallback(
      [
        async () => {
          const res = await fetchJson<{ data: { value: string; value_classification: string }[] }>(
            "https://api.alternative.me/fng/?limit=8",
          );
          const [today, yesterday] = res.data;
          return {
            value: +today.value,
            label: today.value_classification,
            previousClose: yesterday ? +yesterday.value : undefined,
            weekAgo: res.data[7] ? +res.data[7].value : undefined,
            source: "live" as const,
          };
        },
      ],
      () => mockFearGreed("crypto"),
      "crypto fear & greed",
    ),
  );
}

/**
 * Aandelen Fear & Greed. Probeert de (ongedocumenteerde) CNN dataviz-endpoint;
 * valt terug op een zelf berekende proxy uit S&P 500-data (momentum t.o.v. 125d SMA,
 * RSI en volatiliteit) — dezelfde componenten die CNN deels gebruikt.
 */
export async function getStockFearGreed(sp500?: { candles: Candle[]; live: boolean }): Promise<FearGreed> {
  return cached("fng:stock", 300, () =>
    withFallback(
      [
        async () => {
          const res = await fetchJson<{
            fear_and_greed: { score: number; rating: string; previous_close: number; previous_1_week: number };
          }>("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
            headers: { Referer: "https://edition.cnn.com/", Origin: "https://edition.cnn.com" },
          });
          const f = res.fear_and_greed;
          const value = Math.round(f.score);
          return {
            value,
            label: fearGreedLabel(value),
            previousClose: Math.round(f.previous_close),
            weekAgo: Math.round(f.previous_1_week),
            source: "live" as const,
          };
        },
      ],
      () => (sp500 && sp500.candles.length > 130 ? fearGreedFromIndex(sp500.candles, sp500.live) : mockFearGreed("stock")),
      "stock fear & greed",
    ),
  );
}

export function fearGreedFromIndex(candles: Candle[], live = true): FearGreed {
  const closes = candles.map((c) => c.close);
  const compute = (cl: number[]) => {
    const price = cl[cl.length - 1];
    const ma125 = last(sma(cl, 125)) ?? price;
    const momentum = clamp(50 + ((price - ma125) / ma125) * 500, 0, 100); // ±10% → 0..100
    const r = last(rsi(cl, 14)) ?? 50;
    const vol = historicalVolatility(cl, 20);
    const volScore = clamp(100 - (vol - 0.1) * 400, 0, 100); // 10% vol = hebzucht, 35% = angst
    return Math.round(momentum * 0.4 + r * 0.35 + volScore * 0.25);
  };
  const value = compute(closes);
  return {
    value,
    label: fearGreedLabel(value),
    previousClose: compute(closes.slice(0, -1)),
    weekAgo: compute(closes.slice(0, -5)),
    source: live ? "derived" : "mock",
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
