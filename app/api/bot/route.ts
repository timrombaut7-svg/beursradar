import { NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { getBotState } from "@/lib/server/bot";

export const dynamic = "force-dynamic";

/** GET /api/bot — portfolio, trades en grafiek van de trading bot. */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ error: "geen database" }, { status: 503 });
  try {
    return NextResponse.json(await getBotState(), { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=20" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
