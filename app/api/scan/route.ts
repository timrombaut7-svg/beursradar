import { NextResponse } from "next/server";
import { scanUniverse } from "@/lib/engine/signals";
import { cached } from "@/lib/api/http";

export const dynamic = "force-dynamic";
// De eerste scan analyseert de hele catalogus; daarna komt alles uit de cache
export const maxDuration = 60;

/** GET /api/scan — koopkansen in de hele catalogus (aandelen + crypto). */
export async function GET() {
  try {
    // Elke minuut opnieuw berekend met de nieuwste live koersen
    const result = await cached("scan:universe", 60, scanUniverse);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
