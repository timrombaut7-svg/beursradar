import { NextResponse } from "next/server";
import { cached } from "@/lib/api/http";
import { getTrackRecord } from "@/lib/server/tips";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/track-record — hoe pakten de tips van de app achteraf uit? */
export async function GET() {
  try {
    const result = await cached("track-record", 300, getTrackRecord);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
