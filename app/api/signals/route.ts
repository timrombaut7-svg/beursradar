import { NextResponse, type NextRequest } from "next/server";
import { parseAssetList } from "@/lib/api/quotes";
import { getSignals } from "@/lib/engine/signals";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/signals?assets=stock:AAPL,crypto:BTC — actueel signaal per asset (voor verkoopadvies). */
export async function GET(req: NextRequest) {
  const assets = parseAssetList(req.nextUrl.searchParams.get("assets"), 30);
  const signals = await getSignals(assets);
  return NextResponse.json({ signals }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
}
