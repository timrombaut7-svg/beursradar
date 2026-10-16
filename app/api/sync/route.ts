import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { errorResponse, resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { importInput, parseBody } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

/**
 * Eenmalige import van bestaande LocalStorage-data naar de database.
 * Importeert alleen als het profiel nog leeg is, zodat herhaalde aanroepen
 * (bijv. vanuit een tweede tabblad) geen duplicaten opleveren.
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const input = await parseBody(req, importInput);
    const db = getDb();
    const imported = await db.$transaction(async (tx) => {
      const [w, p] = await Promise.all([
        tx.watchlistItem.count({ where: { profileId: profile.id } }),
        tx.position.count({ where: { profileId: profile.id } }),
      ]);
      if (w + p > 0) return false;
      const seen = new Set<string>();
      for (const item of input.watchlist) {
        const key = `${item.type}:${item.symbol}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await tx.watchlistItem.create({ data: { ...item, profileId: profile.id } });
      }
      for (const pos of input.positions) {
        const taken = await tx.position.findUnique({ where: { id: pos.id } });
        await tx.position.create({ data: { ...pos, id: taken ? crypto.randomUUID() : pos.id, profileId: profile.id } });
      }
      return true;
    });
    return withProfileCookie(NextResponse.json({ imported }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
