import { NextResponse } from "next/server";
import { getNewspaper } from "@/lib/server/newspaper";

export const dynamic = "force-dynamic";

/** GET /api/krant — de krant van dit moment: markten, hoofdartikel, stijgers/dalers en nieuws. */
export async function GET() {
  try {
    return NextResponse.json(await getNewspaper(), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
