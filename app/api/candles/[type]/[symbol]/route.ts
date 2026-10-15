import { AssetNotFoundError, assertResolvable } from "@/lib/api/guard";
import { NextResponse, type NextRequest } from "next/server";
import { getCandles } from "@/lib/engine/analyze";
import { computeSeries } from "@/lib/engine/technical";
import { TIMEFRAMES, isTimeframe } from "@/lib/timeframes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string; symbol: string }> }) {
  const { type, symbol } = await ctx.params;
  const tf = req.nextUrl.searchParams.get("tf") ?? "1D";
  if ((type !== "stock" && type !== "crypto") || !isTimeframe(tf)) {
    return NextResponse.json({ error: "ongeldige parameters" }, { status: 400 });
  }
  const sym = decodeURIComponent(symbol).toUpperCase();
  if (!/^[A-Z0-9.\-^=]{1,15}$/.test(sym)) return NextResponse.json({ error: "ongeldig symbool" }, { status: 400 });

  const spec = TIMEFRAMES[tf];
  try {
    const { candles, live } = await getCandles(sym, type, spec);
    assertResolvable(sym, type, live);
    const s = computeSeries(candles);
    return NextResponse.json(
      {
        timeframe: tf,
        live,
        visibleBars: spec.visibleBars ?? null,
        candles,
        overlays: {
          ema20: s.ema20,
          ema50: s.ema50,
          ema200: s.ema200,
          bbUpper: s.bbUpper,
          bbLower: s.bbLower,
          rsi: s.rsi,
          macd: s.macd,
          macdSignal: s.macdSignal,
          macdHist: s.macdHist,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } },
    );
  } catch (err) {
    const status = err instanceof AssetNotFoundError ? 404 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
