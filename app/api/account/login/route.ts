import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { errorResponse, PROFILE_COOKIE } from "@/lib/server/profile";
import {
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
  burnPasswordCheck,
  createSession,
  mergeAnonymousProfile,
  normalizeUsername,
  setSessionCookies,
  verifyPassword,
} from "@/lib/server/account";

export const dynamic = "force-dynamic";

const WRONG = "Gebruikersnaam of wachtwoord klopt niet";
const slow = () => new Promise((r) => setTimeout(r, 600));

/** POST /api/account/login — inloggen; wat je zonder account op dit toestel had, wordt samengevoegd. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
    const username = typeof body?.username === "string" ? normalizeUsername(body.username) : "";
    const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
    if (!username || !password) return NextResponse.json({ error: "Vul je gebruikersnaam en wachtwoord in" }, { status: 400 });

    const db = getDb();
    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
      await burnPasswordCheck(password); // zelfde rekentijd: verraadt niet of de naam bestaat
      await slow();
      return NextResponse.json({ error: WRONG }, { status: 401 });
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return NextResponse.json({ error: `Te veel foute pogingen. Probeer het over ${min} min opnieuw.` }, { status: 429 });
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      const failed = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data:
          failed >= MAX_FAILED_LOGINS
            ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
            : { failedLogins: failed },
      });
      await slow();
      return NextResponse.json({ error: WRONG }, { status: 401 });
    }

    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await mergeAnonymousProfile(req.cookies.get(PROFILE_COOKIE)?.value, user.profileId);
    const session = await createSession(user.id);
    return setSessionCookies(NextResponse.json({ user: { username: user.username } }), session, user.profileId);
  } catch (err) {
    return errorResponse(err);
  }
}
