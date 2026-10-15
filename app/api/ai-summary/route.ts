import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeAsset } from "@/lib/engine/analyze";
import { cached } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const SYSTEM = `Je bent een nuchtere beursanalist. Je krijgt de output van een transparant, regelgebaseerd
analyse-algoritme (4 pijlers: fundamenteel, technisch, sentiment, risico) als JSON.
Schrijf in het Nederlands een beknopte samenvatting (max. 180 woorden) voor een particuliere belegger:
1. Kernconclusie in één zin (korte én lange termijn).
2. De 2-3 zwaarst wegende argumenten vóór en tegen.
3. Het belangrijkste risico en wat het scenario ongeldig maakt (stop-loss).
Verzin geen cijfers die niet in de data staan. Vermeld kort als data mock/fallback is.
Sluit af met: "Geen financieel advies."`;

/**
 * Optionele AI-samenvatting. Alleen actief als ANTHROPIC_API_KEY gezet is;
 * anders 501 zodat de UI de knop kan verbergen.
 */
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").toUpperCase();
  const type = req.nextUrl.searchParams.get("type");
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ enabled: false, error: "ANTHROPIC_API_KEY niet ingesteld" }, { status: 501 });
  }
  if ((type !== "stock" && type !== "crypto") || !/^[A-Z0-9.\-^=]{1,15}$/.test(symbol)) {
    return NextResponse.json({ error: "ongeldige parameters" }, { status: 400 });
  }

  try {
    const summary = await cached(`ai:${type}:${symbol}`, 1800, async () => {
      const a = await analyzeAsset(symbol, type);
      // Compacte payload: geen candles/equity-curve, alleen wat het model nodig heeft
      const payload = {
        asset: a.asset,
        price: a.quote.price,
        changePct24h: a.quote.changePct24h,
        shortTerm: a.shortTerm,
        longTerm: a.longTerm,
        factors: Object.values(a.pillars).flatMap((p) =>
          p.factors.map((f) => ({ pillar: f.pillar, label: f.label, value: f.value, points: f.points, max: f.maxPoints })),
        ),
        tradePlan: a.tradePlan,
        backtest: { strategy: a.backtest.strategyReturn, buyHold: a.backtest.buyHoldReturn, trades: a.backtest.trades.length, winRate: a.backtest.winRate },
        dataSources: a.dataSources,
      };

      const client = new Anthropic();
      const response = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 2000,
        // Korte samenvattingstaak: lage effort volstaat
        output_config: { effort: "low" },
        // Bij een weigering door veiligheidsclassifiers automatisch terugvallen op een ander model
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        messages: [{ role: "user", content: `Analyse-data:\n${JSON.stringify(payload)}` }],
      });

      if (response.stop_reason === "refusal") throw new Error("Het model weigerde deze samenvatting");
      return response.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("\n")
        .trim();
    });
    return NextResponse.json({ enabled: true, summary });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ enabled: true, error: "AI rate limit bereikt, probeer later opnieuw" }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ enabled: false, error: "Ongeldige ANTHROPIC_API_KEY" }, { status: 401 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ enabled: true, error: `AI API-fout ${err.status}` }, { status: 502 });
    }
    return NextResponse.json({ enabled: true, error: (err as Error).message }, { status: 500 });
  }
}
