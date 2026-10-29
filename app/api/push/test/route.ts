import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { sendToProfile } from "@/lib/server/push";

export const dynamic = "force-dynamic";

/** POST: stuur een testmelding naar de toestellen van dit profiel. */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const sent = await sendToProfile(profile.id, {
      title: "Beursradar meldingen staan aan ✅",
      body: "Je krijgt een bericht zodra een aandeel of crypto in je portfolio verkocht moet worden.",
      url: "/portfolio",
      tag: "test",
    });
    return withProfileCookie(NextResponse.json({ sent }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
