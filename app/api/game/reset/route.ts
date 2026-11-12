import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { resetGame } from "@/lib/server/game";

export const dynamic = "force-dynamic";

/** POST /api/game/reset — opnieuw beginnen met €100.000. */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    await resetGame(profile.id);
    return withProfileCookie(NextResponse.json({ ok: true }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
