import type { AssetType, Quote } from "@/types";
import { cached } from "./http";
import { getCryptoCandles, getCryptoQuote } from "./crypto";
import { getStockCandles, getStockQuote } from "./stocks";
import { assertResolvable } from "./guard";

const DAILY = { yahoo: "1d", binance: "1d", seconds: 86400, bars: 30 };

/** Actuele koers voor één asset met automatische fallback naar candle-data/mock. */
export async function getQuote(symbol: string, type: AssetType): Promise<Quote> {
  const s = symbol.toUpperCase();
  return cached(`quote:${type}:${s}`, 60, async () => {
    if (type === "crypto") {
      const { candles, live } = await getCryptoCandles(s, DAILY);
      const q = await getCryptoQuote(s, candles, live);
      assertResolvable(s, type, q.source !== "mock");
      return q;
    }
    const { candles, live } = await getStockCandles(s, DAILY);
    const q = await getStockQuote(s, candles, live);
    assertResolvable(s, type, q.source !== "mock");
    return q;
  });
}

export function parseAssetList(raw: string | null, max = 40): { symbol: string; type: AssetType }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((x) => {
      const [t, sym] = x.includes(":") ? x.split(":") : ["stock", x];
      return { type: (t === "crypto" ? "crypto" : "stock") as AssetType, symbol: sym.toUpperCase() };
    })
    .filter((a) => /^[A-Z0-9.\-^=]{1,15}$/.test(a.symbol));
}
