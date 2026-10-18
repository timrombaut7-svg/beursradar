import YahooFinance from "yahoo-finance2";
import type { AssetType, LivePrice, MarketState } from "@/types";
import { cached, coolDownHost, isHostCoolingDown, mockMode } from "./http";
import { getCryptoMarkets, coingeckoIdFor } from "./crypto";
import { rememberPrice } from "./mock";
import { UNIVERSE, findInUniverse } from "./universe";

/**
 * Live koersen in batch: één Yahoo-call voor alle aandelen en één CoinGecko-call
 * voor alle crypto, 15 seconden gecachet. Zo blijven we ruim binnen de gratis
 * rate limits, ook als veel mensen tegelijk kijken. Er is bewust géén mock-fallback:
 * een live koers is live of ontbreekt.
 */

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | string | number;
  marketState?: string;
  currency?: string;
}
interface LooseYahoo {
  quote(symbols: string[], opts: object, mod: object): Promise<YahooQuote[] | YahooQuote>;
}

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  validation: { logErrors: false, logOptionsErrors: false },
  versionCheck: false,
}) as unknown as LooseYahoo;

const YAHOO_HOST = "https://query1.finance.yahoo.com";
const TTL_SECONDS = 15;

function marketStateOf(s: string | undefined): MarketState {
  switch (s) {
    case "REGULAR":
      return "open";
    case "PRE":
    case "PREPRE":
      return "pre";
    case "POST":
      return "post";
    default:
      return "closed";
  }
}

async function stockPrices(symbols: string[]): Promise<LivePrice[]> {
  if (!symbols.length || isHostCoolingDown(YAHOO_HOST)) return [];
  try {
    const res = await Promise.race([
      yf.quote(
        symbols,
        { fields: ["regularMarketPrice", "regularMarketChange", "regularMarketChangePercent", "regularMarketTime", "marketState", "currency"] },
        { validateResult: false },
      ),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Yahoo timeout")), 8000)),
    ]);
    const rows = Array.isArray(res) ? res : [res];
    return rows.flatMap((q) => {
      if (typeof q.regularMarketPrice !== "number") return [];
      const t = q.regularMarketTime ? new Date(q.regularMarketTime).getTime() : Date.now();
      return [
        {
          symbol: q.symbol.toUpperCase(),
          type: "stock" as const,
          price: q.regularMarketPrice,
          change: q.regularMarketChange ?? 0,
          changePct: q.regularMarketChangePercent ?? 0,
          time: Number.isFinite(t) ? t : Date.now(),
          marketState: marketStateOf(q.marketState),
          currency: q.currency ?? "USD",
        },
      ];
    });
  } catch (err) {
    coolDownHost(YAHOO_HOST, /429|Too Many/i.test(String(err)) ? 120 : 30);
    return [];
  }
}

async function cryptoPrices(symbols: string[]): Promise<LivePrice[]> {
  if (!symbols.length) return [];
  try {
    const ids = symbols.map((s) => coingeckoIdFor(s));
    const quotes = await getCryptoMarkets(ids, TTL_SECONDS);
    return quotes.map((q) => ({
      symbol: q.symbol,
      type: "crypto" as const,
      price: q.price,
      change: q.change24h,
      changePct: q.changePct24h,
      time: q.updatedAt,
      marketState: "24/7" as const,
      currency: "USD",
    }));
  } catch {
    return [];
  }
}

export async function getLivePrices(assets: { symbol: string; type: AssetType }[]): Promise<LivePrice[]> {
  if (mockMode()) return [];
  const stocks = [...new Set(assets.filter((a) => a.type === "stock").map((a) => a.symbol.toUpperCase()))].sort();
  const cryptos = [...new Set(assets.filter((a) => a.type === "crypto").map((a) => a.symbol.toUpperCase()))].sort();
  const [s, c] = await Promise.all([
    cached(`live:stock:${stocks.join(",")}`, TTL_SECONDS, () => stockPrices(stocks)),
    cached(`live:crypto:${cryptos.join(",")}`, TTL_SECONDS, () => cryptoPrices(cryptos)),
  ]);
  const out = [...s, ...c];
  out.forEach((p) => rememberPrice(p.symbol, p.type, p.price));
  return out;
}

const UNIVERSE_ASSETS = UNIVERSE.map((u) => ({ symbol: u.symbol, type: u.type }));

/** Live koers voor één asset; catalogus-assets delen één batch-request. */
export async function getLivePrice(symbol: string, type: AssetType): Promise<LivePrice | null> {
  const s = symbol.toUpperCase();
  const batch = findInUniverse(s, type) ? UNIVERSE_ASSETS : [{ symbol: s, type }];
  const prices = await getLivePrices(batch);
  return prices.find((p) => p.symbol === s && p.type === type) ?? null;
}

export function universeAssets() {
  return UNIVERSE_ASSETS;
}

/**
 * Wisselkoersen naar euro (hoeveel euro is 1 eenheid van de valuta), 10 minuten gecachet.
 * Zonder live koers ontbreekt de valuta: dan rekent de app geen aantal stuks uit.
 */
export async function getRatesToEur(): Promise<Record<string, number>> {
  if (mockMode()) return { EUR: 1 };
  return cached("fx:eur", 600, async () => {
    const [eurusd] = await stockPrices(["EURUSD=X"]);
    if (!eurusd || !(eurusd.price > 0)) throw new Error("geen EUR/USD-koers");
    return { EUR: 1, USD: 1 / eurusd.price };
  }).catch(() => ({ EUR: 1 }));
}
