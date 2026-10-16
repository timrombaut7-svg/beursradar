import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { errorResponse, resolveProfile, withProfileCookie, RequestValidationError } from "@/lib/server/profile";
import { parseBody, positionInput } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

type Row = {
  id: string; symbol: string; name: string; type: string; quantity: number; buyPrice: number; buyDate: string; currency: string;
  stopLoss: number | null; target1: number | null; target2: number | null; horizon: string;
};
const serialize = ({ id, symbol, name, type, quantity, buyPrice, buyDate, currency, stopLoss, target1, target2, horizon }: Row) => ({
  id, symbol, name, type, quantity, buyPrice, buyDate, currency, stopLoss, target1, target2, horizon,
});

export async function GET(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const rows = await getDb().position.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } });
    return withProfileCookie(NextResponse.json({ enabled: true, positions: rows.map(serialize) }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}

/** Voegt een positie toe; het id komt van de client zodat optimistische updates kloppen. */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const input = await parseBody(req, positionInput);
    const db = getDb();
    const existing = await db.position.findUnique({ where: { id: input.id } });
    if (existing && existing.profileId !== profile.id) throw new RequestValidationError("id is al in gebruik");
    const row = existing
      ? existing
      : await db.position.create({ data: { ...input, profileId: profile.id } });
    return withProfileCookie(NextResponse.json({ position: serialize(row) }, { status: existing ? 200 : 201 }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/portfolio?id=… of ?all=1 */
export async function DELETE(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const id = req.nextUrl.searchParams.get("id");
    const all = req.nextUrl.searchParams.get("all") === "1";
    if (!id && !all) throw new RequestValidationError("id of all=1 is verplicht");
    const { count } = await getDb().position.deleteMany({
      where: all ? { profileId: profile.id } : { profileId: profile.id, id: id! },
    });
    return withProfileCookie(NextResponse.json({ deleted: count }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
