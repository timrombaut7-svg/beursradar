import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { getGame } from "@/lib/server/game";

export const dynamic = "force-dynamic";

/** GET /api/game — het €100.000-spel van dit profiel. */
export async function GET(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    return withProfileCookie(NextResponse.json(await getGame(profile.id)), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
