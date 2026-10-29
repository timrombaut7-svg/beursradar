import { NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { checkSellAlerts } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Elk half uur aangeroepen (GitHub Actions, zie .github/workflows/sell-alerts.yml): stuurt verkoopmeldingen.
 * Zonder geheim: het geeft alleen aantallen terug, en dubbele meldingen worden in de database tegengehouden.
 */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ error: "geen database" }, { status: 503 });
  try {
    return NextResponse.json(await checkSellAlerts(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
