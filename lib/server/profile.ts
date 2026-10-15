import { NextResponse, type NextRequest } from "next/server";
import { DatabaseDisabledError, getDb } from "@/lib/db";

export const PROFILE_COOKIE = "br_profile";
const ONE_YEAR = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Bepaalt het anonieme profiel van deze browser. Het id staat in een httpOnly-cookie;
 * bestaat het nog niet, dan wordt er één aangemaakt (`isNew`) en moet de route de
 * cookie zetten via `withProfileCookie`.
 */
export async function resolveProfile(req: NextRequest): Promise<{ id: string; isNew: boolean }> {
  const db = getDb();
  const existing = req.cookies.get(PROFILE_COOKIE)?.value;
  if (existing && UUID_RE.test(existing)) {
    await db.profile.upsert({ where: { id: existing }, create: { id: existing }, update: {} });
    return { id: existing, isNew: false };
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
