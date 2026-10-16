import { NextResponse, type NextRequest } from "next/server";
import { parseAssetList } from "@/lib/api/quotes";
import { getLivePrices, universeAssets } from "@/lib/api/livePrices";

export const dynamic = "force-dynamic";

/**
 * GET /api/prices — live koersen van de hele catalogus.
 * GET /api/prices?assets=stock:AAPL,crypto:BTC — alleen deze assets.
 * 15 s server-cache + 10 s CDN-cache: veel kijkers = nog steeds weinig API-calls.
 */
export async function GET(req: NextRequest) {
  const requested = parseAssetList(req.nextUrl.searchParams.get("assets"), 60);
  const prices = await getLivePrices(requested.length ? requested : universeAssets());
  return NextResponse.json(
    { prices, generatedAt: Date.now() },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } },
  );
}
