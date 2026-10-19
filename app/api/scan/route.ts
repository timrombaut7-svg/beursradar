import { NextResponse } from "next/server";
import { scanUniverse } from "@/lib/engine/signals";
import { cached, mockMode } from "@/lib/api/http";
import { recordTips } from "@/lib/server/tips";

export const dynamic = "force-dynamic";
// De eerste scan analyseert de hele catalogus; daarna komt alles uit de cache
export const maxDuration = 60;

async function scanAndRecord() {
  const result = await scanUniverse();
  // Elke getoonde tip wordt bewaard voor het scorebord (nooit op basis van demo-data)
  if (!mockMode()) {
    await recordTips([...result.short, ...result.long]).catch((err) => console.warn("[tips] opslaan mislukt:", (err as Error).message));
  }
  return result;
}

/** GET /api/scan — koopkansen in de hele catalogus (aandelen + crypto). */
export async function GET() {
  try {
    // Elke minuut opnieuw berekend met de nieuwste live koersen
    const result = await cached("scan:universe", 60, scanAndRecord);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
