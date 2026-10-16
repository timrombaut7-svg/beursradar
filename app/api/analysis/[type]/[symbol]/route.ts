import { AssetNotFoundError } from "@/lib/api/guard";
import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/engine/analyze";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ type: string; symbol: string }> }) {
  const { type, symbol } = await ctx.params;
  if (type !== "stock" && type !== "crypto") {
    return NextResponse.json({ error: "type moet 'stock' of 'crypto' zijn" }, { status: 400 });
  }
  const sym = decodeURIComponent(symbol).toUpperCase();
  if (!/^[A-Z0-9.\-^=]{1,15}$/.test(sym)) {
    return NextResponse.json({ error: "ongeldig symbool" }, { status: 400 });
  }
  try {
    const analysis = await getAnalysis(sym, type);
    return NextResponse.json(analysis, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    const status = err instanceof AssetNotFoundError ? 404 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
