import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Accounts met gebruikersnaam en wachtwoord.
 *  - Wachtwoorden: scrypt met een eigen salt per gebruiker; nooit het wachtwoord zelf opslaan.
 *  - Sessies: een willekeurig token in een httpOnly-cookie; in de database staat alleen de SHA-256 ervan.
 *  - Een account bezit precies één profiel (portfolio + watchlist).
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = "br_session";
export const SESSION_DAYS = 180;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(name: string): string {
  return name.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, saltB64, hashB64] = stored.split("$");
  if (kind !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Een vaste hash om ook bij onbekende gebruikersnamen evenveel rekentijd te gebruiken
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Maakt een nieuwe sessie en geeft het token voor de cookie terug. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await getDb().session.create({ data: { id: sha256(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await getDb().session.deleteMany({ where: { id: sha256(token) } });
}

/** De ingelogde gebruiker bij deze request, of null. Verlopen sessies tellen niet. */
export async function sessionUser(req: NextRequest): Promise<{ id: string; username: string; profileId: string } | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await getDb().session.findUnique({
    where: { id: sha256(token) },
    include: { user: { select: { id: true, username: true, profileId: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.user;
}

const cookieBase = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

export function setSessionCookies<T>(res: NextResponse<T>, session: { token: string; expiresAt: Date }, profileId: string) {
  res.cookies.set(SESSION_COOKIE, session.token, { ...cookieBase(), expires: session.expiresAt });
  // Het profiel volgt het account, zodat portfolio en watchlist meteen kloppen
  res.cookies.set("br_profile", profileId, { ...cookieBase(), maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export function clearSessionCookies<T>(res: NextResponse<T>) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase(), maxAge: 0 });
  res.cookies.set("br_profile", "", { ...cookieBase(), maxAge: 0 });
  return res;
}

/**
 * Zet de watchlist en posities van een anoniem profiel over naar het profiel van het account
 * (bij inloggen op een toestel waar je al iets bewaard had) en ruimt het anonieme profiel op.
 */
export async function mergeAnonymousProfile(fromProfileId: string | undefined, toProfileId: string) {
  if (!fromProfileId || fromProfileId === toProfileId) return;
  const db = getDb();
  const from = await db.profile.findUnique({ where: { id: fromProfileId }, include: { user: { select: { id: true } }, watchlist: true } });
  if (!from || from.user) return; // alleen anonieme profielen; nooit die van een ander account
  await db.$transaction([
    db.watchlistItem.createMany({
      data: from.watchlist.map((w) => ({ profileId: toProfileId, symbol: w.symbol, name: w.name, type: w.type, addedAt: w.addedAt })),
      skipDuplicates: true,
    }),
    db.position.updateMany({ where: { profileId: fromProfileId }, data: { profileId: toProfileId } }),
    db.profile.delete({ where: { id: fromProfileId } }),
  ]);
}
