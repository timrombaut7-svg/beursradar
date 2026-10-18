import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Analysis, AssetType } from "@/types";
import { getAnalysis } from "@/lib/engine/analyze";
import { qualifies, toOpportunity, toSignalRow, scanUniverse } from "@/lib/engine/signals";
import { evidenceSentence } from "@/lib/evidenceText";
import { allocate } from "@/lib/engine/allocate";
import { getRatesToEur } from "@/lib/api/livePrices";
import { sellAdvice } from "@/lib/engine/sellAdvice";
import { searchUniverse } from "@/lib/api/universe";
import { searchStocks } from "@/lib/api/stocks";
import { searchCrypto } from "@/lib/api/crypto";
import { cached } from "@/lib/api/http";
import { getCryptoFearGreed, getStockFearGreed } from "@/lib/api/sentiment";
import { getMacro } from "@/lib/api/macro";
import { getStockCandles } from "@/lib/api/stocks";
import { easySentence } from "@/lib/engine/explain";

/**
 * Tools waarmee de AI-assistent de echte data en analyses van Beursradar opvraagt.
 * Alle antwoorden zijn compacte JSON, zodat het model niets hoeft te verzinnen.
 */

export const chatPositionSchema = z.object({
  symbol: z.string().max(15),
  name: z.string().max(120),
  type: z.enum(["stock", "crypto"]),
  quantity: z.number().positive(),
  buyPrice: z.number().positive(),
  buyDate: z.string().max(10),
  currency: z.string().max(3),
  stopLoss: z.number().nullish(),
  target1: z.number().nullish(),
  target2: z.number().nullish(),
  horizon: z.enum(["short", "long"]).optional(),
});
export type ChatPosition = z.infer<typeof chatPositionSchema>;

const symbolSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9.\-^=]{1,15}$/);
const typeSchema = z.enum(["stock", "crypto"]);

const round = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? null : Number(v.toFixed(d)));

/** Compacte samenvatting van een analyse voor het model. */
export function analysisForModel(a: Analysis) {
  const short = toOpportunity(a, "short");
  const long = toOpportunity(a, "long");
  const factors = Object.values(a.pillars)
    .flatMap((p) => p.factors)
    .filter((f) => f.points !== 0)
    .map((f) => ({ pijler: f.pillar, factor: f.label, waarde: f.value, punten: `${f.points}/${f.maxPoints}`, uitleg: easySentence(f, a) }));
  return {
    asset: { symbol: a.asset.symbol, naam: a.asset.name, soort: a.asset.type, valuta: a.asset.currency },
    koers: { prijs: round(a.quote.price, 4), verandering24uPct: round(a.quote.changePct24h), bron: a.quote.source },
    signaalKorteTermijn: { advies: a.shortTerm.advice, score: a.shortTerm.score, betrouwbaarheid: a.shortTerm.confidence, pijlers: a.shortTerm.pillarScores },
    signaalLangeTermijn: { advies: a.longTerm.advice, score: a.longTerm.score, betrouwbaarheid: a.longTerm.confidence, pijlers: a.longTerm.pillarScores },
    planKorteTermijn: { ...short.plan, houden: short.hold.label, uitleg: short.explanation },
    planLangeTermijn: { ...long.plan, houden: long.hold.label },
    // Een koopsignaal wordt alleen aangeraden als het in het verleden op deze asset aantoonbaar werkte
    historischeToets: {
      korteTermijn: { ...a.evidence.short, aangeraden: qualifies(toSignalRow(a), "short"), uitleg: evidenceSentence(a.evidence.short, "short") },
      langeTermijn: { ...a.evidence.long, aangeraden: qualifies(toSignalRow(a), "long"), uitleg: evidenceSentence(a.evidence.long, "long") },
    },
    factoren: factors,
    risico: {
      volatiliteit30dJaarbasis: round(a.risk.volatility30d, 3),
      maxDaling1j: round(a.risk.maxDrawdown1y, 3),
      rendement1j: round(a.risk.return1y, 3),
      beta: round(a.risk.beta),
      benchmark: a.risk.benchmark,
    },
    techniek: {
      rsi: round(a.technical.rsi, 1),
      steun: a.technical.supports.slice(0, 3).map((l) => round(l.price, 4)),
      weerstand: a.technical.resistances.slice(0, 3).map((l) => round(l.price, 4)),
      hoog52w: round(a.technical.high52w, 4),
      laag52w: round(a.technical.low52w, 4),
    },
    nieuws: a.sentiment.news.slice(0, 5).map((n) => ({ titel: n.title, sentiment: n.sentiment, bron: n.publisher, live: n.source === "live" })),
    backtest12m: {
      strategieRendement: round(a.backtest.strategyReturn, 3),
      buyHoldRendement: round(a.backtest.buyHoldReturn, 3),
      trades: a.backtest.trades.length,
      winRate: round(a.backtest.winRate, 2),
    },
    databronnen: a.dataSources,
  };
}

export function buildChatTools(ctx: { positions: ChatPosition[]; report: (status: string) => void }) {
  const searchAsset = betaZodTool({
    name: "search_asset",
    description:
      "Zoek een aandeel of crypto op naam of ticker (bijv. 'nvidia', 'ASML', 'bitcoin'). Gebruik dit als je het exacte symbool of het type (stock/crypto) niet zeker weet.",
    inputSchema: z.object({ query: z.string().min(1).max(40).describe("Naam of ticker") }),
    run: async ({ query }) => {
      ctx.report(`Zoeken naar "${query}"…`);
      const local = searchUniverse(query, 5);
      const remote = await Promise.allSettled([searchStocks(query), searchCrypto(query)]);
      const all = [...local, ...remote.flatMap((r) => (r.status === "fulfilled" ? r.value.slice(0, 4) : []))];
      const seen = new Set<string>();
      const results = all.filter((r) => {
        const k = `${r.type}:${r.symbol}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return JSON.stringify(results.slice(0, 8).map((r) => ({ symbol: r.symbol, naam: r.name, type: r.type, beurs: r.exchange })));
    },
  });

  const getAssetAnalysis = betaZodTool({
    name: "get_analysis",
    description:
      "Haal de actuele, volledige Beursradar-analyse van één aandeel of crypto op: live koers, koop/verkoop-signaal voor korte en lange termijn met score, alle factoren (technisch, fundamenteel, sentiment, risico), het tradeplan (instap, stop-loss, koersdoelen, houdtermijn), nieuws en een backtest. Gebruik dit voor elke vraag over een specifieke asset.",
    inputSchema: z.object({ symbol: symbolSchema.describe("Ticker, bijv. NVDA, ASML, BTC"), type: typeSchema.describe("stock of crypto") }),
    run: async ({ symbol, type }) => {
      ctx.report(`Analyse van ${symbol} ophalen…`);
      try {
        return JSON.stringify(analysisForModel(await getAnalysis(symbol, type as AssetType)));
      } catch (err) {
        return JSON.stringify({ fout: (err as Error).message });
      }
    },
  });

  const getOpportunities = betaZodTool({
    name: "get_opportunities",
    description:
      "Lijst van assets die Beursradar nu aanraadt om te kopen, voor de korte termijn (weken) of lange termijn (maanden tot jaren), optioneel alleen aandelen, alleen ETF's of alleen crypto. Gebruik dit voor vragen als 'wat moet ik kopen?'.",
    inputSchema: z.object({
      horizon: z.enum(["short", "long"]).describe("short = weken, long = maanden tot jaren"),
      type: z.enum(["stock", "etf", "crypto", "all"]).default("all"),
    }),
    run: async ({ horizon, type }) => {
      ctx.report(horizon === "short" ? "Koopkansen voor de korte termijn bekijken…" : "Koopkansen voor de lange termijn bekijken…");
      const scan = await cached("scan:universe", 60, scanUniverse);
      const list = (horizon === "short" ? scan.short : scan.long).filter((o) =>
        type === "all" ? true : type === "etf" ? o.row.etf : type === "stock" ? o.row.type === "stock" && !o.row.etf : o.row.type === type,
      );
      return JSON.stringify({
        geanalyseerd: scan.scanned,
        kansen: list.slice(0, 8).map((o) => ({
          symbol: o.row.symbol,
          naam: o.row.name,
          type: o.row.type,
          advies: o.advice,
          score: o.score,
          prijs: round(o.row.price, 4),
          houden: o.hold.label,
          plan: o.plan,
          waarom: o.explanation.why,
          letOp: o.explanation.risks,
        })),
      });
    },
  });

  const planBudget = betaZodTool({
    name: "plan_budget",
    description:
      "Verdeelt een budget in euro over de ETF's, aandelen en crypto die nu de historische toets halen, volgens een risicoprofiel. Gebruik dit voor vragen als 'ik heb 1000 euro, hoe verdeel ik dat?'. Vraag naar het risico als de gebruiker het niet noemt, of gebruik 'balanced'.",
    inputSchema: z.object({
      amount: z.number().min(10).max(10_000_000).describe("Bedrag in euro"),
      risk: z.enum(["careful", "balanced", "bold"]).default("balanced").describe("careful = voorzichtig, balanced = gemiddeld, bold = avontuurlijk"),
      horizon: z.enum(["short", "long"]).default("long"),
    }),
    run: async ({ amount, risk, horizon }) => {
      ctx.report("Je budget verdelen over de beste kansen…");
      const [scan, rates] = await Promise.all([cached("scan:universe", 60, scanUniverse), getRatesToEur()]);
      const plan = allocate(amount, risk, horizon, horizon === "short" ? scan.short : scan.long, rates);
      return JSON.stringify({
        bedrag: plan.amount,
        reserve: plan.reserve,
        verdeling: plan.items.map((i) => ({
          symbol: i.opportunity.row.symbol,
          naam: i.opportunity.row.name,
          groep: i.bucket,
          euro: i.amount,
          aandeel: round(i.weight, 3),
          stuks: round(i.units, 4),
          valuta: i.opportunity.row.currency,
          waarom: i.opportunity.explanation.why[0],
        })),
        tips: plan.notes,
      });
    },
  });

  const getPortfolio = betaZodTool({
    name: "get_my_portfolio",
    description:
      "De posities die de gebruiker in Beursradar heeft vastgelegd, met actuele koers, winst/verlies en het verkoopadvies van de app (houden, deels winst nemen of verkopen). Gebruik dit voor vragen over 'mijn' aandelen of portfolio.",
    inputSchema: z.object({}),
    run: async () => {
      ctx.report("Je portfolio bekijken…");
      if (!ctx.positions.length) return JSON.stringify({ posities: [], opmerking: "De gebruiker heeft nog geen posities vastgelegd." });
      const rows = await Promise.all(
        ctx.positions.slice(0, 30).map(async (p) => {
          try {
            const a = await getAnalysis(p.symbol, p.type);
            const price = a.quote.price;
            const advice = sellAdvice(p, price, p.horizon === "long" ? a.longTerm : a.shortTerm);
            return {
              symbol: p.symbol,
              naam: p.name,
              termijn: p.horizon ?? "short",
              aantal: p.quantity,
              aankoopprijs: p.buyPrice,
              aankoopdatum: p.buyDate,
              koers: round(price, 4),
              resultaatPct: round((price / p.buyPrice - 1) * 100, 1),
              advies: advice.title,
              reden: advice.reason,
              stopLoss: p.stopLoss ?? null,
            };
          } catch {
            return { symbol: p.symbol, fout: "geen actuele data" };
          }
        }),
      );
      return JSON.stringify({ posities: rows });
    },
  });

  const getMarket = betaZodTool({
    name: "get_market_overview",
    description: "Algemene marktstemming: Fear & Greed voor aandelen en crypto, rente, inflatie en Bitcoin-dominantie.",
    inputSchema: z.object({}),
    run: async () => {
      ctx.report("Marktstemming bekijken…");
      const spy = await getStockCandles("SPY", { yahoo: "1d", seconds: 86400, bars: 300 });
      const [stock, crypto, macro] = await Promise.all([getStockFearGreed(spy), getCryptoFearGreed(), getMacro()]);
      return JSON.stringify({ fearGreedAandelen: stock, fearGreedCrypto: crypto, macro });
    },
  });

  return [searchAsset, getAssetAnalysis, getOpportunities, planBudget, getPortfolio, getMarket];
}
