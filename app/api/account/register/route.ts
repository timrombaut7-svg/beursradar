import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { errorResponse, PROFILE_COOKIE } from "@/lib/server/profile";
import { createSession, hashPassword, setSessionCookies } from "@/lib/server/account";
import { credentialsSchema } from "@/lib/server/accountSchemas";

export const dynamic = "force-dynamic";

/** POST /api/account/register — maak een account; wat je op dit toestel al had, gaat mee. */
export async function POST(req: NextRequest) {
  try {
    const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" }, { status: 400 });
    const { username, password } = parsed.data;
    const db = getDb();
    if (await db.user.findUnique({ where: { username }, select: { id: true } })) {
      return NextResponse.json({ error: "Deze gebruikersnaam bestaat al" }, { status: 409 });
    }

    // Het huidige anonieme profiel (met portfolio en watchlist) wordt het profiel van het account
    const current = req.cookies.get(PROFILE_COOKIE)?.value;
    const anon = current
      ? await db.profile.findUnique({ where: { id: current }, select: { id: true, user: { select: { id: true } } } })
      : null;
    const profileId = anon && !anon.user ? anon.id : crypto.randomUUID();
    if (!anon || anon.user) await db.profile.create({ data: { id: profileId } });

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({ data: { username, passwordHash, profileId } }).catch((err: unknown) => {
      // Twee keer tegelijk dezelfde naam: de tweede krijgt een nette melding
      if ((err as { code?: string }).code === "P2002") return null;
      throw err;
    });
    if (!user) return NextResponse.json({ error: "Deze gebruikersnaam bestaat al" }, { status: 409 });

    const session = await createSession(user.id);
    return setSessionCookies(NextResponse.json({ user: { username: user.username } }, { status: 201 }), session, profileId);
  } catch (err) {
    return errorResponse(err);
  }
}
