import type { MarketTick, Mover, Newspaper } from "@/types";
import { cached } from "@/lib/api/http";
import { getLivePrices, universeAssets } from "@/lib/api/livePrices";
import { findInUniverse } from "@/lib/api/universe";
import { getCryptoFearGreed, getStockFearGreed } from "@/lib/api/sentiment";
import { getMacro } from "@/lib/api/macro";
import { getStockCandles } from "@/lib/api/stocks";
import { getMarketNews } from "@/lib/api/news";
import { writeLead } from "@/lib/engine/newspaper";

/** De markten bovenaan de krant (Yahoo-symbolen; crypto via CoinGecko). */
export const MARKETS: { symbol: string; name: string; group: MarketTick["group"]; type: "stock" | "crypto" }[] = [
  { symbol: "^AEX", name: "AEX", group: "index", type: "stock" },
  { symbol: "^GSPC", name: "S&P 500", group: "index", type: "stock" },
  { symbol: "^IXIC", name: "Nasdaq", group: "index", type: "stock" },
  { symbol: "^DJI", name: "Dow Jones", group: "index", type: "stock" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50", group: "index", type: "stock" },
  { symbol: "BTC", name: "Bitcoin", group: "crypto", type: "crypto" },
  { symbol: "ETH", name: "Ethereum", group: "crypto", type: "crypto" },
  { symbol: "GC=F", name: "Goud", group: "commodity", type: "stock" },
  { symbol: "CL=F", name: "Olie", group: "commodity", type: "stock" },
  { symbol: "EURUSD=X", name: "Euro/dollar", group: "fx", type: "stock" },
];

const MOVERS_PER_SIDE = 5;

async function build(): Promise<Newspaper> {
  // Eén batch voor de markten en één voor de hele catalogus (die is meestal al gecachet)
  const [marketPrices, universePrices, cryptoFg, stockFg, macro, news] = await Promise.all([
    getLivePrices(MARKETS.map((m) => ({ symbol: m.symbol, type: m.type }))),
    getLivePrices(universeAssets()),
    getCryptoFearGreed(),
    getStockCandles("SPY", { yahoo: "1d", seconds: 86400, bars: 300 }).then(getStockFearGreed, () => getStockFearGreed()),
    getMacro(),
    getMarketNews(),
  ]);

  const markets: MarketTick[] = MARKETS.flatMap((m) => {
    const p = marketPrices.find((x) => x.symbol === m.symbol.toUpperCase() && x.type === m.type);
    return p ? [{ symbol: m.symbol, name: m.name, group: m.group, price: p.price, changePct: p.changePct, currency: p.currency, marketState: p.marketState }] : [];
  });

  // Grootste stijgers en dalers: losse aandelen en crypto (ETF's bewegen te weinig)
  const movers: Mover[] = universePrices.flatMap((p) => {
    const u = findInUniverse(p.symbol, p.type);
    if (!u || u.etf || !Number.isFinite(p.changePct)) return [];
    return [{ symbol: p.symbol, name: u.name, type: p.type, price: p.price, changePct: p.changePct, currency: p.currency }];
  });
  const sorted = [...movers].sort((a, b) => b.changePct - a.changePct);
  const up = sorted.filter((m) => m.changePct > 0).slice(0, MOVERS_PER_SIDE);
  const down = sorted.filter((m) => m.changePct < 0).reverse().slice(0, MOVERS_PER_SIDE);

  const fearGreed = { stock: stockFg, crypto: cryptoFg };
  return {
    generatedAt: Date.now(),
    lead: writeLead({ markets, movers: { up, down }, fearGreed, macro }),
    markets,
    movers: { up, down },
    fearGreed,
    macro,
    news,
    live: markets.length > 0,
  };
}

/** De krant, elke minuut opnieuw samengesteld. */
export function getNewspaper(): Promise<Newspaper> {
  return cached("newspaper", 60, build);
}
