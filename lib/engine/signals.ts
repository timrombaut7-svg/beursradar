import type { Analysis, AssetType, Horizon, Opportunity, SignalRow } from "@/types";
import { UNIVERSE } from "@/lib/api/universe";
import { mockMode } from "@/lib/api/http";
import { getAnalysis } from "./analyze";
import { estimateHold, explainEasy, longTermPlan, shortTermPlan } from "./explain";

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

async function analyses(assets: { symbol: string; type: AssetType }[]): Promise<Analysis[]> {
  const out = await mapLimit(assets, 4, (a) => getAnalysis(a.symbol, a.type).catch(() => null));
  return out.filter((a): a is Analysis => a !== null);
}

export async function getSignals(assets: { symbol: string; type: AssetType }[]): Promise<SignalRow[]> {
  return (await analyses(assets)).map(toSignalRow);
}

const isBuy = (advice: string) => advice === "BUY" || advice === "STRONG_BUY";

/** Mag deze analyse een koopkans zijn voor deze termijn? */
export function qualifies(row: SignalRow, horizon: Horizon, allowMock = mockMode()): boolean {
  if (!allowMock && !row.pricesLive) return false; // nooit aanraden op basis van mock-koersen
  if (horizon === "short") return isBuy(row.shortTerm.advice) && row.tradePlan.direction === "long";
  // Lange termijn: positief beeld, en niet kopen terwijl het korte-termijnsignaal op verkopen staat
  return isBuy(row.longTerm.advice) && row.shortTerm.score > -15;
}

export function toOpportunity(a: Analysis, horizon: Horizon): Opportunity {
  const row = toSignalRow(a);
  const plan = horizon === "short" ? shortTermPlan(a) : longTermPlan(a);
  const hold = estimateHold(a, horizon, plan);
  const v = horizon === "short" ? a.shortTerm : a.longTerm;
  return { horizon, row, score: v.score, advice: v.advice, plan, hold, explanation: explainEasy(a, horizon, plan, hold) };
}

export function buildOpportunities(list: Analysis[], allowMock = mockMode()) {
  const pick = (horizon: Horizon) =>
    list
      .filter((a) => qualifies(toSignalRow(a), horizon, allowMock))
      .map((a) => toOpportunity(a, horizon))
      .sort((x, y) => y.score - x.score);
  return { short: pick("short"), long: pick("long") };
}

export async function scanUniverse() {
  const list = await analyses(UNIVERSE.map((u) => ({ symbol: u.symbol, type: u.type })));
  return { scanned: list.length, generatedAt: Date.now(), ...buildOpportunities(list) };
}
