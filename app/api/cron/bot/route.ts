import { NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { mockMode } from "@/lib/api/http";
import { runBot } from "@/lib/server/bot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Eén ronde van de trading bot, elk half uur aangeroepen door GitHub Actions (.github/workflows/sell-alerts.yml).
 * Openbaar maar onschuldig: hooguit één ronde per 10 minuten, en nooit op voorbeeldkoersen.
 */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ error: "geen database" }, { status: 503 });
  if (mockMode()) return NextResponse.json({ ran: false, reason: "demo-modus" });
  try {
    return NextResponse.json(await runBot(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
