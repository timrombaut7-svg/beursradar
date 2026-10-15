import type { AssetType, Candle, CryptoFundamentals, FearGreed, MacroData, NewsItem, StockFundamentals } from "@/types";
import { findInUniverse, type UniverseEntry } from "./universe";
import { scoreText } from "@/lib/nlp/sentiment";

/**
 * Deterministische, realistische mock-data. Dezelfde ticker levert binnen een dag
 * altijd dezelfde reeks op, zodat analyses reproduceerbaar zijn.
 */

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Laatst bekende live prijzen. Mock-reeksen worden hierop verankerd, zodat een
 * fallback-grafiek aansluit op de echte koers i.p.v. op de indicatieve catalogusprijs.
 */
const knownPrices = new Map<string, number>();

export function rememberPrice(symbol: string, type: AssetType, price: number) {
  if (Number.isFinite(price) && price > 0) knownPrices.set(`${type}:${symbol.toUpperCase()}`, price);
}

export function knownPrice(symbol: string, type: AssetType): number | undefined {
  return knownPrices.get(`${type}:${symbol.toUpperCase()}`);
}

function profileFor(symbol: string, type: AssetType): UniverseEntry {
  const known = findInUniverse(symbol, type);
  const anchor = knownPrice(symbol, type);
  if (known) return anchor ? { ...known, basePrice: anchor } : known;
  const h = hashString(symbol);
  return {
    symbol,
    name: symbol,
    type,
    basePrice: anchor ?? (type === "crypto" ? 0.5 + (h % 5000) / 10 : 20 + (h % 400)),
    vol: type === "crypto" ? 0.9 : 0.35,
    drift: ((h % 40) - 15) / 100,
  };
}

const DAY = 86400;

/**
 * Genereert OHLCV-candles met een geometrische Brownse beweging plus
 * regime-wisselingen (trendfases) zodat indicatoren realistisch reageren.
 * De reeks eindigt precies op `profile.basePrice`.
 */
export function mockCandles(
  symbol: string,
  type: AssetType,
  opts: { bars: number; intervalSeconds: number; endTime?: number } = { bars: 730, intervalSeconds: DAY },
): Candle[] {
  const profile = profileFor(symbol, type);
  const { bars, intervalSeconds } = opts;
  const now = opts.endTime ?? Math.floor(Date.now() / 1000);
  const end = Math.floor(now / intervalSeconds) * intervalSeconds;
  const dayStamp = Math.floor(now / DAY);
  const rand = rng(hashString(`${symbol}:${type}:${intervalSeconds}:${dayStamp}`));

  const periodsPerYear = (365 * DAY) / intervalSeconds;
  const dt = 1 / periodsPerYear;
  const sigma = profile.vol;

  // Genereer relatieve log-prijzen, schaal daarna zodat de laatste close = basePrice
  const logs: number[] = [0];
  let regimeDrift = profile.drift;
  let regimeLeft = 0;
  for (let i = 1; i < bars; i++) {
    if (regimeLeft <= 0) {
      regimeDrift = profile.drift + gaussian(rand) * sigma * 0.9;
      regimeLeft = Math.floor((30 + rand() * 90) * (DAY / intervalSeconds));
    }
    regimeLeft--;
    const shock = gaussian(rand) * sigma * Math.sqrt(dt);
    logs.push(logs[i - 1] + (regimeDrift - 0.5 * sigma * sigma) * dt + shock);
  }
  const offset = Math.log(profile.basePrice) - logs[logs.length - 1];

  const candles: Candle[] = [];
  let prevClose = Math.exp(logs[0] + offset);
  for (let i = 0; i < bars; i++) {
    const close = Math.exp(logs[i] + offset);
    const open = i === 0 ? close * (1 + gaussian(rand) * 0.003) : prevClose * (1 + gaussian(rand) * sigma * Math.sqrt(dt) * 0.15);
    const range = Math.abs(gaussian(rand)) * sigma * Math.sqrt(dt) * 0.8 + sigma * Math.sqrt(dt) * 0.25;
    const high = Math.max(open, close) * (1 + range * rand());
    const low = Math.min(open, close) * (1 - range * rand());
    const baseVolume = type === "crypto" ? 5e8 / Math.max(profile.basePrice, 0.01) * 50 : 3e7 * (200 / profile.basePrice);
    const volume = baseVolume * (0.6 + rand() * 0.8) * (1 + Math.abs(close / prevClose - 1) * 20);
    candles.push({
      time: end - (bars - 1 - i) * intervalSeconds,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round(volume),
    });
    prevClose = close;
  }
  return candles;
}

function round(v: number) {
  if (v >= 1000) return Math.round(v * 100) / 100;
  if (v >= 1) return Math.round(v * 10000) / 10000;
  return Math.round(v * 1e8) / 1e8;
}

export function mockStockFundamentals(symbol: string, price: number): StockFundamentals {
  const rand = rng(hashString(`fa:${symbol}`));
  const profile = findInUniverse(symbol, "stock");
  const growthy = (profile?.drift ?? 0.1) > 0.15;
  const pe = growthy ? 30 + rand() * 40 : 10 + rand() * 20;
  const revenueGrowth = growthy ? 0.12 + rand() * 0.4 : -0.03 + rand() * 0.12;
  const eps = price / pe;
  const peg = pe / Math.max(1, revenueGrowth * 100);
  const rec = 1.6 + rand() * 1.8;
  const n = 15 + Math.floor(rand() * 30);
  const sb = Math.floor(n * Math.max(0, (3 - rec) / 3));
  const b = Math.floor(n * 0.3);
  const s = rec > 3 ? Math.floor(n * 0.2) : Math.floor(rand() * 2);
  return {
    kind: "stock",
    peRatio: pe,
    forwardPe: pe * (0.8 + rand() * 0.15),
    pegRatio: peg,
    eps,
    revenueGrowthYoY: revenueGrowth,
    earningsGrowthYoY: revenueGrowth * (1 + rand()),
    debtToEquity: 20 + rand() * 180,
    freeCashFlow: (rand() > 0.12 ? 1 : -1) * (1e9 + rand() * 6e10),
    dividendYield: profile?.sector === "Technology" && growthy ? rand() * 0.004 : rand() * 0.035,
    profitMargin: 0.05 + rand() * 0.4,
    marketCap: price * (1e9 + rand() * 1.5e10),
    beta: 0.6 + rand() * 1.4,
    sector: profile?.sector ?? null,
    analyst: {
      consensus: rec < 1.8 ? "strong_buy" : rec < 2.5 ? "buy" : rec < 3.3 ? "hold" : "sell",
      recommendationMean: rec,
      targetMeanPrice: price * (0.9 + (3.5 - rec) * 0.12 + rand() * 0.08),
      numberOfAnalysts: n,
      strongBuy: sb,
      buy: b,
      hold: Math.max(0, n - sb - b - s),
      sell: s,
      strongSell: rec > 3.4 ? 1 : 0,
    },
    source: "mock",
  };
}

const MOCK_RANKS = ["BTC", "ETH", "XRP", "BNB", "SOL", "DOGE", "ADA", "TON", "LINK", "AVAX", "LTC", "DOT", "UNI", "MATIC"];

export function mockCryptoFundamentals(symbol: string, price: number, mvrvZ: number | null): CryptoFundamentals {
  const rand = rng(hashString(`fa:${symbol}`));
  const p = findInUniverse(symbol, "crypto");
  const circulating = p?.circulating ?? 1e9 * (1 + rand() * 10);
  const maxSupply = p?.maxSupply === undefined ? circulating * (1.2 + rand()) : p.maxSupply;
  const marketCap = circulating * price;
  const fdv = maxSupply ? maxSupply * price : marketCap * 1.05;
  return {
    kind: "crypto",
    marketCap,
    fullyDilutedValuation: fdv,
    marketCapRank: MOCK_RANKS.indexOf(symbol) + 1 || 120,
    circulatingSupply: circulating,
    totalSupply: maxSupply ?? circulating * 1.02,
    maxSupply: maxSupply ?? null,
    supplyRatio: maxSupply ? circulating / maxSupply : null,
    annualInflation: p?.inflation ?? 0.03 + rand() * 0.05,
    totalValueLocked: ["ETH", "SOL", "BNB", "AVAX", "TON"].includes(symbol) ? marketCap * (0.02 + rand() * 0.15) : null,
    athChangePct: -(rand() * 60),
    network: mockNetwork(symbol),
    mvrvZScore: mvrvZ,
    source: "mock",
  };
}

export function mockNetwork(symbol: string): CryptoFundamentals["network"] {
  const rand = rng(hashString(`net:${symbol}:${Math.floor(Date.now() / 86400000)}`));
  const base = symbol === "BTC" ? 850_000 : symbol === "ETH" ? 520_000 : 50_000 + rand() * 400_000;
  return {
    activeAddresses: Math.round(base * (0.85 + rand() * 0.3)),
    activeAddressesChangePct: (rand() - 0.45) * 30,
    dailyTxVolumeUsd: base * (2000 + rand() * 20000),
    source: "mock",
  };
}

export function mockFearGreed(kind: "crypto" | "stock"): FearGreed {
  const rand = rng(hashString(`fg:${kind}:${Math.floor(Date.now() / 86400000)}`));
  const value = Math.round(20 + rand() * 60);
  return {
    value,
    label: fearGreedLabel(value),
    previousClose: Math.round(value + (rand() - 0.5) * 8),
    weekAgo: Math.round(value + (rand() - 0.5) * 25),
    source: "mock",
  };
}

export function fearGreedLabel(v: number): string {
  if (v < 25) return "Extreme Fear";
  if (v < 45) return "Fear";
  if (v <= 55) return "Neutral";
  if (v <= 75) return "Greed";
  return "Extreme Greed";
}

export function mockMacro(): MacroData {
  return {
    fedFundsRate: 4.0,
    rateTrend: "falling",
    inflationYoY: 2.9,
    inflationTrend: "stable",
    us10y: 4.1,
    btcDominance: 57.5,
    btcDominanceTrend: "stable",
    source: "mock",
  };
}

const BULL_TEMPLATES = [
  "{name} beats quarterly expectations as revenue growth accelerates",
  "Analysts upgrade {name} citing strong demand and record margins",
  "{name} rallies after announcing expanded partnership",
  "Institutional inflows into {symbol} surge to multi-month high",
  "{name} breaks out above key resistance on strong volume",
];
const BEAR_TEMPLATES = [
  "{name} slides as regulators open investigation",
  "Analysts warn of slowing growth at {name} amid weak guidance",
  "{symbol} drops after large holder sells stake",
  "{name} faces lawsuit over disclosure concerns",
];
const NEUTRAL_TEMPLATES = [
  "{name} to present at upcoming industry conference",
  "What to watch for {symbol} this week",
  "{name} announces date for next earnings report",
];

export function mockNews(symbol: string, name: string, type: AssetType): NewsItem[] {
  const day = Math.floor(Date.now() / 86400000);
  const rand = rng(hashString(`news:${symbol}:${day}`));
  const publishers = type === "crypto" ? ["CoinDesk", "The Block", "Cointelegraph", "Decrypt"] : ["Reuters", "Bloomberg", "MarketWatch", "Yahoo Finance"];
  const items: NewsItem[] = [];
  for (let i = 0; i < 8; i++) {
    const r = rand();
    const pool = r < 0.42 ? BULL_TEMPLATES : r < 0.72 ? BEAR_TEMPLATES : NEUTRAL_TEMPLATES;
    const title = pool[Math.floor(rand() * pool.length)].replace("{name}", name).replace("{symbol}", symbol);
    const { label, score } = scoreText(title);
    items.push({
      id: `mock-${symbol}-${i}`,
      title,
      url: "#",
      publisher: publishers[Math.floor(rand() * publishers.length)],
      publishedAt: Date.now() - Math.floor(rand() * 72) * 3600_000 - i * 1800_000,
      sentiment: label,
      sentimentScore: score,
      source: "mock",
    });
  }
  return items.sort((a, b) => b.publishedAt - a.publishedAt);
}
