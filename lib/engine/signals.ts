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
    evidence: a.evidence,
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

/** Geeft de analyse nu een koopsignaal voor deze termijn (los van de historische toets)? */
export function isBuySignal(row: SignalRow, horizon: Horizon, allowMock = mockMode()): boolean {
  if (!allowMock && !row.pricesLive) return false; // nooit aanraden op basis van mock-koersen
  if (horizon === "short") return isBuy(row.shortTerm.advice) && row.tradePlan.direction === "long";
  // Lange termijn: positief beeld, en niet kopen terwijl het korte-termijnsignaal op verkopen staat
  return isBuy(row.longTerm.advice) && row.shortTerm.score > -15;
}

/**
 * Mag deze analyse een koopkans zijn voor deze termijn? Alleen als er nu een koopsignaal is
 * én hetzelfde soort signaal in het verleden op deze asset aantoonbaar winst opleverde.
 */
export function qualifies(row: SignalRow, horizon: Horizon, allowMock = mockMode()): boolean {
  return isBuySignal(row, horizon, allowMock) && row.evidence[horizon].verdict === "proven";
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
  // Koopsignalen die de historische toets niet doorstonden (voor transparantie)
  const rejected = (horizon: Horizon) =>
    list
      .map(toSignalRow)
      .filter((r) => isBuySignal(r, horizon, allowMock) && r.evidence[horizon].verdict !== "proven")
      .map((r) => ({ symbol: r.symbol, type: r.type, name: r.name, evidence: r.evidence[horizon] }));
  return { short: pick("short"), long: pick("long"), rejected: { short: rejected("short"), long: rejected("long") } };
}

export async function scanUniverse() {
  const list = await analyses(UNIVERSE.map((u) => ({ symbol: u.symbol, type: u.type })));
  return { scanned: list.length, generatedAt: Date.now(), ...buildOpportunities(list) };
}
