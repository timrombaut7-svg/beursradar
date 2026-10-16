import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { errorResponse, resolveProfile, withProfileCookie, RequestValidationError } from "@/lib/server/profile";
import { parseBody, watchItemInput } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

function serialize(i: { symbol: string; name: string; type: string; addedAt: Date }) {
  return { symbol: i.symbol, name: i.name, type: i.type, addedAt: i.addedAt.getTime() };
}

export async function GET(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const items = await getDb().watchlistItem.findMany({ where: { profileId: profile.id }, orderBy: { addedAt: "asc" } });
    return withProfileCookie(NextResponse.json({ enabled: true, items: items.map(serialize) }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}

/** Voegt een asset toe (idempotent). */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const input = await parseBody(req, watchItemInput);
    const item = await getDb().watchlistItem.upsert({
      where: { profileId_type_symbol: { profileId: profile.id, type: input.type, symbol: input.symbol } },
      create: { ...input, profileId: profile.id },
      update: { name: input.name },
    });
    return withProfileCookie(NextResponse.json({ item: serialize(item) }, { status: 201 }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/watchlist?type=crypto&symbol=BTC */
export async function DELETE(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
    const type = req.nextUrl.searchParams.get("type");
    if (!symbol || (type !== "stock" && type !== "crypto")) throw new RequestValidationError("symbol en type zijn verplicht");
    const { count } = await getDb().watchlistItem.deleteMany({ where: { profileId: profile.id, type, symbol } });
    return withProfileCookie(NextResponse.json({ deleted: count }), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
