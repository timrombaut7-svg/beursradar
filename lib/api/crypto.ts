import type { Candle, CryptoFundamentals, Quote, SearchResult } from "@/types";
import { cached, fetchJson, withFallback } from "./http";
import { findInUniverse } from "./universe";
import { mockCandles, mockCryptoFundamentals, mockNetwork, rememberPrice } from "./mock";

const CG = "https://api.coingecko.com/api/v3";
const BINANCE = "https://api.binance.com/api/v3";

function cgHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

export function coingeckoIdFor(symbol: string): string {
  return findInUniverse(symbol, "crypto")?.coingeckoId ?? symbol.toLowerCase();
}

export async function searchCrypto(query: string): Promise<SearchResult[]> {
  return cached(`cg:search:${query.toLowerCase()}`, 3600, async () => {
    const data = await fetchJson<{ coins: { id: string; symbol: string; name: string; market_cap_rank: number | null }[] }>(
      `${CG}/search?query=${encodeURIComponent(query)}`,
      { headers: cgHeaders() },
    );
    return data.coins.slice(0, 8).map((c) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      type: "crypto" as const,
      exchange: c.market_cap_rank ? `Crypto #${c.market_cap_rank}` : "Crypto",
      coingeckoId: c.id,
    }));
  });
}

interface IntervalSpec {
  binance: string;
  seconds: number;
  bars: number;
}

/**
 * Haalt OHLCV-candles op. Volgorde: Binance klines (echte OHLC) → CoinGecko
 * market_chart (close-reeks, OHLC gereconstrueerd) → mock.
 */
export async function getCryptoCandles(symbol: string, spec: IntervalSpec): Promise<{ candles: Candle[]; live: boolean }> {
  const entry = findInUniverse(symbol, "crypto");
  const pair = entry?.binance ?? `${symbol.toUpperCase()}USDT`;
  return cached(`crypto:candles:${symbol}:${spec.binance}:${spec.bars}`, spec.seconds >= 86400 ? 900 : 120, () =>
    withFallback<{ candles: Candle[]; live: boolean }>(
      [
        async () => remember(symbol, await binanceKlines(pair, spec)),
        async () => remember(symbol, await coingeckoCandles(coingeckoIdFor(symbol), spec)),
      ],
      () => ({ candles: mockCandles(symbol, "crypto", { bars: spec.bars, intervalSeconds: spec.seconds }), live: false }),
      `crypto candles ${symbol}`,
    ),
  );
}

function remember(symbol: string, candles: Candle[]) {
  rememberPrice(symbol, "crypto", candles[candles.length - 1].close);
  return { candles, live: true };
}

/** Minimaal aantal bars om een reeks als bruikbaar te beschouwen. */
const minBars = (spec: IntervalSpec) => (spec.seconds >= 7 * 86400 ? 10 : 50);

async function binanceKlines(pair: string, spec: IntervalSpec): Promise<Candle[]> {
  const candles: Candle[] = [];
  let endTime: number | undefined;
  // Binance levert max 1000 bars per request
  while (candles.length < spec.bars) {
    const limit = Math.min(1000, spec.bars - candles.length);
    const url = `${BINANCE}/klines?symbol=${pair}&interval=${spec.binance}&limit=${limit}${endTime ? `&endTime=${endTime}` : ""}`;
    const rows = await fetchJson<[number, string, string, string, string, string][]>(url);
    if (!rows.length) break;
    const batch = rows.map((r) => ({
      time: Math.floor(r[0] / 1000),
      open: +r[1],
      high: +r[2],
      low: +r[3],
      close: +r[4],
      volume: +r[5] * +r[4],
    }));
    candles.unshift(...batch);
    endTime = rows[0][0] - 1;
    if (rows.length < limit) break;
  }
  if (candles.length < minBars(spec)) throw new Error("te weinig Binance-data");
  return candles;
}

async function coingeckoCandles(id: string, spec: IntervalSpec): Promise<Candle[]> {
  const days = Math.min(365, Math.ceil((spec.bars * spec.seconds) / 86400));
  const data = await fetchJson<{ prices: [number, number][]; total_volumes: [number, number][] }>(
    `${CG}/coins/${id}/market_chart?vs_currency=usd&days=${days}${spec.seconds >= 86400 ? "&interval=daily" : ""}`,
    { headers: cgHeaders() },
  );
  // Reconstrueer OHLC uit opeenvolgende closes per bucket
  const buckets = new Map<number, { prices: number[]; volume: number }>();
  data.prices.forEach(([t, p], i) => {
    const key = Math.floor(t / 1000 / spec.seconds) * spec.seconds;
    const b = buckets.get(key) ?? { prices: [], volume: 0 };
    b.prices.push(p);
    b.volume = data.total_volumes[i]?.[1] ?? b.volume;
    buckets.set(key, b);
  });
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  let prevClose: number | null = null;
  const candles = keys.map((k) => {
    const b = buckets.get(k)!;
    const close = b.prices[b.prices.length - 1];
    const open = prevClose ?? b.prices[0];
    const high = Math.max(open, ...b.prices);
    const low = Math.min(open, ...b.prices);
    prevClose = close;
    return { time: k, open, high, low, close, volume: b.volume };
  });
  if (candles.length < minBars(spec)) throw new Error("te weinig CoinGecko-data");
  return candles;
}

interface CgCoin {
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  market_data: {
    current_price: { usd: number };
    price_change_24h: number;
    price_change_percentage_24h: number;
    high_24h: { usd: number };
    low_24h: { usd: number };
    total_volume: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number | null };
    circulating_supply: number | null;
    total_supply: number | null;
    max_supply: number | null;
    ath_change_percentage: { usd: number };
    total_value_locked: { usd: number } | null;
  };
}

async function coingeckoCoin(id: string): Promise<CgCoin> {
  return cached(`cg:coin:${id}`, 300, () =>
    fetchJson<CgCoin>(
      `${CG}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
      { headers: cgHeaders() },
    ),
  );
}

export async function getCryptoQuote(symbol: string, lastCandles: Candle[], candlesLive: boolean): Promise<Quote> {
  const entry = findInUniverse(symbol, "crypto");
  return withFallback(
    [
      async () => {
        const c = await coingeckoCoin(coingeckoIdFor(symbol));
        const m = c.market_data;
        rememberPrice(symbol, "crypto", m.current_price.usd);
        return {
          symbol: symbol.toUpperCase(),
          name: c.name,
          type: "crypto" as const,
          price: m.current_price.usd,
          change24h: m.price_change_24h,
          changePct24h: m.price_change_percentage_24h,
          high24h: m.high_24h.usd,
          low24h: m.low_24h.usd,
          volume24h: m.total_volume.usd,
          marketCap: m.market_cap.usd,
          currency: "USD",
          source: "live" as const,
          updatedAt: Date.now(),
        };
      },
    ],
    () => quoteFromCandles(symbol, entry?.name ?? symbol, "crypto", lastCandles, candlesLive, "USD"),
    `crypto quote ${symbol}`,
  );
}

export function quoteFromCandles(
  symbol: string,
  name: string,
  type: "crypto" | "stock",
  candles: Candle[],
  live: boolean,
  currency: string,
): Quote {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  return {
    symbol: symbol.toUpperCase(),
    name,
    type,
    price: last.close,
    change24h: last.close - prev.close,
    changePct24h: ((last.close - prev.close) / prev.close) * 100,
    high24h: last.high,
    low24h: last.low,
    volume24h: last.volume,
    currency,
    source: live ? "derived" : "mock",
    updatedAt: Date.now(),
  };
}

/**
 * MVRV Z-score proxy. Echte gerealiseerde waarde vereist on-chain UTXO-data
 * (betaalde API's); als benadering gebruiken we de 365-daagse gemiddelde prijs
 * × circulerend aanbod als "gerealiseerde waarde" — gangbaar in publieke dashboards.
 */
export function mvrvZProxy(dailyCloses: number[]): number | null {
  if (dailyCloses.length < 200) return null;
  const window = dailyCloses.slice(-365);
  const realized = window.reduce((s, v) => s + v, 0) / window.length;
  const mean = realized;
  const sd = Math.sqrt(window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length);
  if (sd === 0) return 0;
  return (dailyCloses[dailyCloses.length - 1] - realized) / sd;
}

export async function getCryptoFundamentals(symbol: string, price: number, dailyCloses: number[]): Promise<CryptoFundamentals> {
  const mvrv = mvrvZProxy(dailyCloses);
  const entry = findInUniverse(symbol, "crypto");
  return withFallback(
    [
      async () => {
        const c = await coingeckoCoin(coingeckoIdFor(symbol));
        const m = c.market_data;
        const circ = m.circulating_supply;
        const max = m.max_supply;
        return {
          kind: "crypto" as const,
          marketCap: m.market_cap.usd,
          fullyDilutedValuation: m.fully_diluted_valuation?.usd ?? null,
          marketCapRank: c.market_cap_rank,
          circulatingSupply: circ,
          totalSupply: m.total_supply,
          maxSupply: max,
          supplyRatio: circ && max ? circ / max : null,
          // Uitgifte-schema's staan niet in de CoinGecko-API → indicatieve tabel uit de catalogus
          annualInflation: entry?.inflation ?? null,
          totalValueLocked: m.total_value_locked?.usd ?? null,
          athChangePct: m.ath_change_percentage.usd,
          // Netwerkactiviteit vereist betaalde on-chain API's → geschatte waarden
          network: mockNetwork(symbol),
          mvrvZScore: mvrv,
          source: "live" as const,
        };
      },
    ],
    () => mockCryptoFundamentals(symbol, price, mvrv),
    `crypto fundamentals ${symbol}`,
  );
}

/** Top-markten voor het dashboard (movers). */
export async function getCryptoMarkets(ids: string[], ttlSeconds = 120): Promise<Quote[]> {
  return cached(`cg:markets:${ids.join(",")}:${ttlSeconds}`, ttlSeconds, async () => {
    const rows = await fetchJson<
      { id: string; symbol: string; name: string; current_price: number; price_change_24h: number; price_change_percentage_24h: number; total_volume: number; market_cap: number; high_24h: number; low_24h: number }[]
    >(`${CG}/coins/markets?vs_currency=usd&ids=${ids.join(",")}`, { headers: cgHeaders() });
    rows.forEach((r) => rememberPrice(r.symbol, "crypto", r.current_price));
    return rows.map((r) => ({
      symbol: r.symbol.toUpperCase(),
      name: r.name,
      type: "crypto" as const,
      price: r.current_price,
      change24h: r.price_change_24h,
      changePct24h: r.price_change_percentage_24h,
      high24h: r.high_24h,
      low24h: r.low_24h,
      volume24h: r.total_volume,
      marketCap: r.market_cap,
      currency: "USD",
      source: "live" as const,
      updatedAt: Date.now(),
    }));
  });
}

export async function getBtcDominance(): Promise<number> {
  return cached("cg:global", 600, async () => {
    const g = await fetchJson<{ data: { market_cap_percentage: { btc: number } } }>(`${CG}/global`, { headers: cgHeaders() });
    return g.data.market_cap_percentage.btc;
  });
}
