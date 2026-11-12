import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { parseBody } from "@/lib/server/schemas";
import { placeGameOrder } from "@/lib/server/game";

export const dynamic = "force-dynamic";

const order = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9.\-^=]{1,15}$/),
  type: z.enum(["stock", "crypto"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive().finite().max(1e12).optional(),
  amountEur: z.number().positive().finite().max(1e9).optional(),
});

/** POST /api/game/trade — kopen of verkopen in het spel, tegen de live koers. */
export async function POST(req: NextRequest) {
  try {
    const profile = await resolveProfile(req);
    const result = await placeGameOrder(profile.id, await parseBody(req, order));
    return withProfileCookie(NextResponse.json(result), profile);
  } catch (err) {
    return errorResponse(err);
  }
}
