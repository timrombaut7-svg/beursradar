import { NextResponse } from "next/server";
import type { MarketOverview, Quote } from "@/types";
import { getCryptoFearGreed, getStockFearGreed } from "@/lib/api/sentiment";
import { getMacro } from "@/lib/api/macro";
import { getStockCandles } from "@/lib/api/stocks";
import { getQuote } from "@/lib/api/quotes";

export const dynamic = "force-dynamic";

const MOVERS: { symbol: string; type: "stock" | "crypto" }[] = [
  { symbol: "BTC", type: "crypto" },
  { symbol: "ETH", type: "crypto" },
  { symbol: "SOL", type: "crypto" },
  { symbol: "XRP", type: "crypto" },
  { symbol: "NVDA", type: "stock" },
  { symbol: "AAPL", type: "stock" },
  { symbol: "ASML", type: "stock" },
  { symbol: "TSLA", type: "stock" },
  { symbol: "MSFT", type: "stock" },
  { symbol: "SPY", type: "stock" },
];

export async function GET() {
  const spy = await getStockCandles("SPY", { yahoo: "1d", seconds: 86400, bars: 300 });
  const [cryptoFearGreed, stockFearGreed, macro, quotes] = await Promise.all([
    getCryptoFearGreed(),
    getStockFearGreed(spy),
    getMacro(),
    Promise.allSettled(MOVERS.map((m) => getQuote(m.symbol, m.type))),
  ]);
  const movers = quotes.flatMap((q) => (q.status === "fulfilled" ? [q.value] : [])) as Quote[];
  const body: MarketOverview = { cryptoFearGreed, stockFearGreed, macro, movers };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
}
