import { NextResponse, type NextRequest } from "next/server";
import { getQuote, parseAssetList } from "@/lib/api/quotes";

export const dynamic = "force-dynamic";

/** GET /api/quotes?assets=stock:AAPL,crypto:BTC */
export async function GET(req: NextRequest) {
  const assets = parseAssetList(req.nextUrl.searchParams.get("assets"));
  const settled = await Promise.allSettled(assets.map((a) => getQuote(a.symbol, a.type)));
  const quotes = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  return NextResponse.json({ quotes }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
