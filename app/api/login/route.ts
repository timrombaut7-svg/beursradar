import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, AUTH_MAX_AGE, appPassword, safeEqual, sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

/** POST /api/login — controleert het wachtwoord en zet de sessiecookie. */
export async function POST(request: NextRequest) {
  const password = appPassword();
  if (!password) return NextResponse.json({ ok: true, open: true });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !safeEqual(parsed.data.password, password)) {
    // Even wachten maakt gokken naar het wachtwoord onpraktisch traag
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Verkeerd wachtwoord" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}
