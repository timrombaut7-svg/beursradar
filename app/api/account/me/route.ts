import { NextResponse, type NextRequest } from "next/server";
import { dbEnabled, getDb } from "@/lib/db";
import { errorResponse } from "@/lib/server/profile";
import { sessionUser } from "@/lib/server/account";

export const dynamic = "force-dynamic";

/** GET /api/account/me — wie is er ingelogd? */
export async function GET(req: NextRequest) {
  if (!dbEnabled()) return NextResponse.json({ enabled: false, user: null });
  try {
    const user = await sessionUser(req);
    if (!user) return NextResponse.json({ enabled: true, user: null }, { headers: { "Cache-Control": "no-store" } });
    const [watchlist, positions] = await Promise.all([
      getDb().watchlistItem.count({ where: { profileId: user.profileId } }),
      getDb().position.count({ where: { profileId: user.profileId } }),
    ]);
    return NextResponse.json(
      { enabled: true, user: { username: user.username, watchlist, positions } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
