import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/lib/server/profile";
import { SESSION_COOKIE, clearSessionCookies, deleteSession } from "@/lib/server/account";

export const dynamic = "force-dynamic";

/** POST /api/account/logout — sessie beëindigen; dit toestel ziet daarna niets meer van het account. */
export async function POST(req: NextRequest) {
  try {
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
    return clearSessionCookies(NextResponse.json({ ok: true }));
  } catch (err) {
    return errorResponse(err);
  }
}
