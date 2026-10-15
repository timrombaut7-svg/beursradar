import YahooFinance from "yahoo-finance2";
import type { Candle, Quote, SearchResult, StockFundamentals } from "@/types";
import { cached, isHostCoolingDown, coolDownHost, mockMode, withFallback } from "./http";
import { findInUniverse } from "./universe";
import { mockCandles, mockStockFundamentals, rememberPrice } from "./mock";
import { quoteFromCandles } from "./crypto";

/**
 * Yahoo Finance via `yahoo-finance2`. Yahoo verandert regelmatig zijn schema's;
 * we schakelen strikte validatie uit en lezen velden defensief uit.
 */

interface YahooChartQuote {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}
interface LooseYahoo {
  chart(symbol: string, opts: { period1: Date; interval: string }, mod?: object): Promise<{ meta: Record<string, unknown>; quotes: YahooChartQuote[] }>;
  quoteSummary(symbol: string, opts: { modules: string[] }, mod?: object): Promise<Record<string, Record<string, unknown> | undefined>>;
  search(q: string, opts?: object, mod?: object): Promise<{ quotes: Record<string, unknown>[] }>;
  quote(symbol: string, opts?: object, mod?: object): Promise<Record<string, unknown>>;
}

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  validation: { logErrors: false, logOptionsErrors: false },
  versionCheck: false,
}) as unknown as LooseYahoo;

const NO_VALIDATE = { validateResult: false };
const YAHOO_HOST = "https://query1.finance.yahoo.com";

/** Voert een Yahoo-call uit met circuit breaker (Yahoo rate-limit agressief). */
async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  if (mockMode()) throw new Error("mock mode actief");
  if (isHostCoolingDown(YAHOO_HOST)) throw new Error("Yahoo in cooldown");
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Yahoo timeout")), 9000)),
    ]);
  } catch (err) {
    const msg = String((err as Error).message ?? err);
    coolDownHost(YAHOO_HOST, /429|Too Many/i.test(msg) ? 120 : 30);
    throw err;
  }
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in v) return num((v as { raw: unknown }).raw);
  return null;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  return cached(`yf:search:${query.toLowerCase()}`, 3600, () =>
    guarded(async () => {
      const res = await yf.search(query, { quotesCount: 8, newsCount: 0 }, NO_VALIDATE);
      return res.quotes
        .filter((q) => ["EQUITY", "ETF", "INDEX"].includes(String(q.quoteType)))
        .map((q) => ({
          symbol: String(q.symbol),
          name: String(q.longname ?? q.shortname ?? q.symbol),
          type: "stock" as const,
          exchange: String(q.exchDisp ?? q.exchange ?? ""),
        }));
    }),
  );
}

interface IntervalSpec {
  yahoo: string;
  seconds: number;
  bars: number;
}

export async function getStockCandles(symbol: string, spec: IntervalSpec): Promise<{ candles: Candle[]; live: boolean }> {
  return cached(`yf:candles:${symbol}:${spec.yahoo}:${spec.bars}`, spec.seconds >= 86400 ? 900 : 120, () =>
    withFallback<{ candles: Candle[]; live: boolean }>(
      [
        async () => {
          // Handelsdagen ≈ 252/jaar → ruimere kalenderperiode opvragen
          const calendarFactor = spec.seconds >= 86400 ? 1.5 : 3.5;
          const period1 = new Date(Date.now() - spec.bars * spec.seconds * 1000 * calendarFactor);
          const res = await guarded(() => yf.chart(symbol, { period1, interval: spec.yahoo }, NO_VALIDATE));
          const candles = res.quotes
            .filter((q) => q.open !== null && q.close !== null && q.high !== null && q.low !== null)
            .map((q) => ({
              time: Math.floor(new Date(q.date).getTime() / 1000),
              open: q.open as number,
              high: q.high as number,
              low: q.low as number,
              close: q.close as number,
              volume: q.volume ?? 0,
            }))
            .slice(-spec.bars);
          if (candles.length < Math.min(30, spec.bars)) throw new Error("te weinig Yahoo-data");
          rememberPrice(symbol, "stock", candles[candles.length - 1].close);
          return { candles, live: true };
        },
      ],
      () => {
        // Aandelen handelen ~5/7 dagen; mock-data gebruikt doorlopende bars
        return { candles: mockCandles(symbol, "stock", { bars: spec.bars, intervalSeconds: spec.seconds }), live: false };
      },
      `stock candles ${symbol}`,
    ),
  );
}

const SUMMARY_MODULES = [
  "price",
  "summaryDetail",
  "defaultKeyStatistics",
  "financialData",
  "recommendationTrend",
  "assetProfile",
];

async function summary(symbol: string) {
  return cached(`yf:summary:${symbol}`, 1800, () =>
    guarded(() => yf.quoteSummary(symbol, { modules: SUMMARY_MODULES }, NO_VALIDATE)),
  );
}

export async function getStockQuote(symbol: string, candles: Candle[], candlesLive: boolean): Promise<Quote> {
  const entry = findInUniverse(symbol, "stock");
  return withFallback(
    [
      async () => {
        const s = await summary(symbol);
        const p = s.price ?? {};
        const price = num(p.regularMarketPrice);
        if (price === null) throw new Error("geen prijs");
        rememberPrice(symbol, "stock", price);
        return {
          symbol: symbol.toUpperCase(),
          name: String(p.longName ?? p.shortName ?? entry?.name ?? symbol),
          type: "stock" as const,
          price,
          change24h: num(p.regularMarketChange) ?? 0,
          // yahoo-finance2 levert percentages als fractie
          changePct24h: (num(p.regularMarketChangePercent) ?? 0) * 100,
          high24h: num(p.regularMarketDayHigh) ?? undefined,
          low24h: num(p.regularMarketDayLow) ?? undefined,
          volume24h: num(p.regularMarketVolume) ?? undefined,
          marketCap: num(p.marketCap) ?? undefined,
          currency: String(p.currency ?? "USD"),
          source: "live" as const,
          updatedAt: Date.now(),
        };
      },
    ],
    () =>
      quoteFromCandles(
        symbol,
        entry?.name ?? symbol,
        "stock",
        candles,
        candlesLive,
        symbol.endsWith(".AS") ? "EUR" : "USD",
      ),
    `stock quote ${symbol}`,
  );
}

export async function getStockFundamentals(symbol: string, price: number): Promise<StockFundamentals> {
  return withFallback(
    [
      async () => {
        const s = await summary(symbol);
        const sd = s.summaryDetail ?? {};
        const ks = s.defaultKeyStatistics ?? {};
        const fd = s.financialData ?? {};
        const ap = s.assetProfile ?? {};
        const trend = ((s.recommendationTrend?.trend as Record<string, unknown>[] | undefined) ?? [])[0] ?? {};
        const eps = num(ks.trailingEps);
        const pe = num(sd.trailingPE) ?? (eps && eps > 0 ? price / eps : null);
        return {
          kind: "stock" as const,
          peRatio: pe,
          forwardPe: num(sd.forwardPE) ?? num(ks.forwardPE),
          pegRatio: num(ks.pegRatio) ?? num(ks.trailingPegRatio),
          eps,
          revenueGrowthYoY: num(fd.revenueGrowth),
          earningsGrowthYoY: num(fd.earningsGrowth),
          debtToEquity: num(fd.debtToEquity),
          freeCashFlow: num(fd.freeCashflow),
          dividendYield: num(sd.dividendYield) ?? num(sd.trailingAnnualDividendYield),
          profitMargin: num(fd.profitMargins),
          marketCap: num(sd.marketCap),
          beta: num(sd.beta),
          sector: (ap.sector as string | undefined) ?? null,
          analyst: {
            consensus: (fd.recommendationKey as string | undefined) ?? null,
            recommendationMean: num(fd.recommendationMean),
            targetMeanPrice: num(fd.targetMeanPrice),
            numberOfAnalysts: num(fd.numberOfAnalystOpinions),
            strongBuy: num(trend.strongBuy) ?? 0,
            buy: num(trend.buy) ?? 0,
            hold: num(trend.hold) ?? 0,
            sell: num(trend.sell) ?? 0,
            strongSell: num(trend.strongSell) ?? 0,
          },
          source: "live" as const,
        };
      },
    ],
    () => mockStockFundamentals(symbol, price),
    `stock fundamentals ${symbol}`,
  );
}

export async function getStockQuotes(symbols: string[]): Promise<Quote[]> {
  const out: Quote[] = [];
  for (const s of symbols) {
    const { candles, live } = await getStockCandles(s, { yahoo: "1d", seconds: 86400, bars: 30 });
    out.push(await getStockQuote(s, candles, live));
  }
  return out;
}
