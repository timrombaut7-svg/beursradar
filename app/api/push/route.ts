import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { errorResponse, resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { parseBody } from "@/lib/server/schemas";
import { vapidKeys } from "@/lib/server/push";

export const dynamic = "force-dynamic";

const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** GET: de publieke sleutel voor de browser, en of dit toestel al meldingen krijgt (?endpoint=…). */
export async function GET(req: NextRequest) {
  try {
    const { publicKey } = await vapidKeys();
    const endpoint = req.nextUrl.searchParams.get("endpoint");
    const profile = await resolveProfile(req);
    const subscribed = endpoint
      ? Boolean(await getDb().pushSubscription.findFirst({ where: { endpoint, profileId: profile.id } }))
      : false;
    return withProfileCookie(NextResponse.json({ publicKey, subscribed }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST: dit toestel wil meldingen voor het portfolio van dit profiel. */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const sub = await parseBody(req, subscription);
    await getDb().pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { profileId: profile.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { profileId: profile.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return withProfileCookie(NextResponse.json({ ok: true }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE: meldingen uit voor dit toestel. */
export async function DELETE(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const { endpoint } = await parseBody(req, z.object({ endpoint: z.string().max(1000) }));
    await getDb().pushSubscription.deleteMany({ where: { endpoint, profileId: profile.id } });
    return withProfileCookie(NextResponse.json({ ok: true }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
