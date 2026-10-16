import type { Analysis, AssetType, SignalRow } from "@/types";
import { UNIVERSE } from "@/lib/api/universe";
import { mockMode } from "@/lib/api/http";
import { getAnalysis } from "./analyze";
import { explainSignal } from "./explain";

export function toSignalRow(a: Analysis): SignalRow {
  const reasons = Object.values(a.pillars)
    .flatMap((p) => p.factors)
    .filter((f) => f.points > 0 && f.horizons.includes("short"))
    .sort((x, y) => y.points / y.maxPoints - x.points / x.maxPoints || y.points - x.points)
    .slice(0, 3)
    .map((f) => f.label);
  return {
    symbol: a.asset.symbol,
    name: a.asset.name,
    type: a.asset.type,
    currency: a.asset.currency,
    price: a.quote.price,
    changePct24h: a.quote.changePct24h,
    shortTerm: { advice: a.shortTerm.advice, score: a.shortTerm.score, confidence: a.shortTerm.confidence },
    longTerm: { advice: a.longTerm.advice, score: a.longTerm.score },
    tradePlan: a.tradePlan,
    reasons,
    explanation: explainSignal(a),
    pricesLive: a.dataSources.koersen !== "mock",
    // Rente/inflatie zijn zonder FRED-sleutel altijd indicatief; dat is geen reden tot waarschuwen
    mockSources: Object.entries(a.dataSources)
      .filter(([k, v]) => v === "mock" && k !== "macro")
      .map(([k]) => k),
  };
}

/** Voert taken uit met maximaal `limit` tegelijk (spaart API rate limits). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function getSignals(assets: { symbol: string; type: AssetType }[]): Promise<SignalRow[]> {
  const rows = await mapLimit(assets, 4, async (a) => {
    try {
      return toSignalRow(await getAnalysis(a.symbol, a.type));
    } catch {
      return null;
    }
  });
  return rows.filter((r): r is SignalRow => r !== null);
}

/**
 * Koopkansen: assets uit de catalogus met een (sterk) koopsignaal op korte termijn
 * en een long-setup. Assets waarvan de koersen alleen als mock-data beschikbaar zijn
 * worden nooit aangeraden (behalve in expliciete mock mode).
 */
export function pickOpportunities(rows: SignalRow[], allowMock = mockMode()): SignalRow[] {
  return rows
    .filter((r) => r.shortTerm.advice === "BUY" || r.shortTerm.advice === "STRONG_BUY")
    .filter((r) => r.tradePlan.direction === "long")
    .filter((r) => allowMock || r.pricesLive)
    .sort((a, b) => b.shortTerm.score - a.shortTerm.score || b.shortTerm.confidence - a.shortTerm.confidence);
}

export async function scanUniverse() {
  const rows = await getSignals(UNIVERSE.map((u) => ({ symbol: u.symbol, type: u.type })));
  return { scanned: rows.length, generatedAt: Date.now(), opportunities: pickOpportunities(rows) };
}
