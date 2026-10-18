import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cached } from "@/lib/api/http";
import { getRatesToEur } from "@/lib/api/livePrices";
import { scanUniverse } from "@/lib/engine/signals";
import { allocate } from "@/lib/engine/allocate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const querySchema = z.object({
  amount: z.coerce.number().min(10).max(10_000_000),
  risk: z.enum(["careful", "balanced", "bold"]).default("balanced"),
  horizon: z.enum(["short", "long"]).default("long"),
});

/** GET /api/plan?amount=1000&risk=balanced&horizon=long — verdeel een budget over de beste kansen. */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geef een bedrag tussen € 10 en € 10 miljoen" }, { status: 400 });
  }
  const { amount, risk, horizon } = parsed.data;
  try {
    const [scan, rates] = await Promise.all([cached("scan:universe", 60, scanUniverse), getRatesToEur()]);
    const plan = allocate(amount, risk, horizon, horizon === "short" ? scan.short : scan.long, rates);
    return NextResponse.json({ ...plan, generatedAt: scan.generatedAt, rates });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
