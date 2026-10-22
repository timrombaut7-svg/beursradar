import { NextResponse } from "next/server";
import { z } from "zod";
import { getLivePrices, getRatesToEur } from "@/lib/api/livePrices";
import { getQuote } from "@/lib/api/quotes";
import { parsePortfolioText, toProposals } from "@/lib/portfolio/screenshot";
import { parseBody } from "@/lib/server/schemas";
import { RequestValidationError } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

const input = z.object({ text: z.string().max(20_000) });

/**
 * POST /api/portfolio/screenshot — de tekst die de browser uit een portfolio-screenshot las
 * → voorstellen voor posities (aantal en aankoopprijs). Slaat zelf niets op: de gebruiker
 * controleert eerst en bevestigt in de app.
 */
export async function POST(req: Request) {
  try {
    const { text } = await parseBody(req, input);
    const holdings = parsePortfolioText(text);
    const assets = holdings.map((h) => ({ symbol: h.symbol, type: h.type }));
    const [live, toEur] = await Promise.all([getLivePrices(assets), getRatesToEur()]);
    const prices: Record<string, { price: number; currency: string }> = {};
    await Promise.all(
      assets.map(async (a) => {
        const l = live.find((p) => p.symbol === a.symbol && p.type === a.type);
        if (l) prices[`${a.type}:${a.symbol}`] = { price: l.price, currency: l.currency };
        else {
          // Geen live koers: de gewone quote (kan vertraagd zijn)
          const q = await getQuote(a.symbol, a.type).catch(() => null);
          if (q) prices[`${a.type}:${a.symbol}`] = { price: q.price, currency: q.currency };
        }
      }),
    );
    return NextResponse.json({ proposals: toProposals(holdings, prices, toEur), recognized: holdings.length });
  } catch (err) {
    const status = err instanceof RequestValidationError ? 400 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
