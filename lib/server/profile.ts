import { NextResponse, type NextRequest } from "next/server";
import { DatabaseDisabledError, getDb } from "@/lib/db";
import { sessionUser } from "./account";

export const PROFILE_COOKIE = "br_profile";
const ONE_YEAR = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Bepaalt het profiel van deze request:
 *  - ingelogd → het profiel van het account (op elk toestel hetzelfde);
 *  - anders het anonieme profiel uit de httpOnly-cookie. Hoort dat profiel bij een account
 *    (bijv. na uitloggen), dan krijg je zonder geldige sessie een nieuw, leeg profiel.
 * Bestaat er nog geen profiel, dan wordt er één aangemaakt (`isNew`) en moet de route de
 * cookie zetten via `withProfileCookie`.
 */
export async function resolveProfile(req: NextRequest): Promise<{ id: string; isNew: boolean }> {
  const db = getDb();
  const user = await sessionUser(req);
  if (user) return { id: user.profileId, isNew: false };

  const existing = req.cookies.get(PROFILE_COOKIE)?.value;
  if (existing && UUID_RE.test(existing)) {
    const profile = await db.profile.findUnique({ where: { id: existing }, select: { user: { select: { id: true } } } });
    if (!profile) {
      // upsert: gelijktijdige requests mogen het profiel allebei proberen aan te maken
      await db.profile.upsert({ where: { id: existing }, create: { id: existing }, update: {} });
      return { id: existing, isNew: false };
    }
    if (!profile.user) return { id: existing, isNew: false };
    // Profiel van een account zonder geldige sessie: nooit tonen
  }
  const id = crypto.randomUUID();
  await db.profile.create({ data: { id } });
  return { id, isNew: true };
}

export function withProfileCookie<T>(res: NextResponse<T>, profile: { id: string; isNew: boolean }) {
  if (profile.isNew) {
    res.cookies.set(PROFILE_COOKIE, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return res;
}

/** Vertaalt fouten naar consistente JSON-responses. */
export function errorResponse(err: unknown) {
  if (err instanceof DatabaseDisabledError) {
    return NextResponse.json({ enabled: false, error: err.message }, { status: 503 });
  }
  if (err instanceof RequestValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[beursradar] database-fout:", err);
  return NextResponse.json({ error: "Interne databasefout" }, { status: 500 });
}

export class RequestValidationError extends Error {}
