import { NextResponse } from "next/server";
import { scanUniverse } from "@/lib/engine/signals";
import { cached } from "@/lib/api/http";

export const dynamic = "force-dynamic";
// De eerste scan analyseert de hele catalogus; daarna komt alles uit de cache
export const maxDuration = 60;

/** GET /api/scan — koopkansen in de hele catalogus (aandelen + crypto). */
export async function GET() {
  try {
    const result = await cached("scan:universe", 600, scanUniverse);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
