import type { HorizonVerdict, TechnicalSnapshot, TradePlan } from "@/types";

/**
 * Bouwt een concreet executieplan:
 *  - Instapzone rond de dichtstbijzijnde support (long) of resistance (short)
 *  - Stop-loss net voorbij dat kritieke niveau (1× ATR buffer)
 *  - Target 1 (conservatief) en Target 2 (agressief) op resistance- en
 *    Fibonacci-niveaus, met minimaal 1:1 resp. 1:2 risk/reward
 *
 * Shorts worden berekend door het prijsvlak te spiegelen (p → -p) en
 * dezelfde long-logica toe te passen; zo blijft de logica op één plek.
 */
export function buildTradePlan(t: TechnicalSnapshot, shortTerm: HorizonVerdict): TradePlan {
  const direction: TradePlan["direction"] = shortTerm.score <= -15 ? "short" : "long";
  const price = t.price;
  const atr = t.atr && t.atr > 0 ? t.atr : price * 0.02;
  const strong = shortTerm.advice === "STRONG_BUY" || shortTerm.advice === "STRONG_SELL";

  const fibLevels = t.fibonacci ? [...t.fibonacci.retracements, ...t.fibonacci.extensions].map((l) => l.price) : [];
  const supportPrices = t.supports.map((l) => l.price);
  const resistancePrices = t.resistances.map((l) => l.price);

  const rationale: string[] = [];
  let plan: Omit<TradePlan, "direction" | "rationale">;

  if (direction === "long") {
    plan = planLong(price, atr, supportPrices, [...resistancePrices, ...fibLevels, t.high52w], strong, rationale, "support", "weerstand");
  } else {
    const m = planLong(
      -price,
      atr,
      resistancePrices.map((p) => -p),
      [...supportPrices, ...fibLevels, t.low52w].map((p) => -p),
      strong,
      rationale,
      "weerstand",
      "support",
    );
    plan = {
      entryLow: -m.entryHigh,
      entryHigh: -m.entryLow,
      stopLoss: -m.stopLoss,
      target1: -m.target1,
      target2: -m.target2,
      riskReward1: m.riskReward1,
      riskReward2: m.riskReward2,
      riskPct: m.riskPct,
    };
  }

  rationale.unshift(
    direction === "long"
      ? "Long-setup: koop in de instapzone, bescherm met stop-loss, schaal af op de targets."
      : "Short/uitstap-setup: verkoop of verlaag positie in de instapzone; stop-loss boven weerstand.",
  );
  return { direction, ...plan, rationale };
}

function planLong(
  price: number,
  atr: number,
  supports: number[],
  targets: number[],
  strong: boolean,
  rationale: string[],
  supName: string,
  resName: string,
) {
  // Dichtstbijzijnde zinvolle support onder de prijs (binnen ~4 ATR)
  const below = supports.filter((s) => s < price && price - s <= 4 * atr).sort((a, b) => b - a);
  const support = below[0];

  let entryLow: number;
  let entryHigh: number;
  if (support !== undefined) {
    entryLow = support;
    entryHigh = strong ? price : Math.min(price, support + 0.75 * atr);
    if (entryHigh - entryLow < 0.25 * atr) entryHigh = Math.min(price, entryLow + 0.5 * atr);
    rationale.push(`Instapzone rond ${supName} ${fmt(Math.abs(support))}.`);
  } else {
    entryLow = price - 0.75 * atr;
    entryHigh = price;
    rationale.push(`Geen ${supName} dichtbij; instap rond huidige koers met ATR-marge.`);
  }

  // Stop net onder de kritieke support (of de volgende als die dichtbij ligt)
  const criticalSupport = support ?? entryLow;
  const stopLoss = criticalSupport - 1.0 * atr;
  rationale.push(`Stop-loss 1× ATR (${fmt(atr)}) voorbij de kritieke ${supName}.`);

  const entryMid = (entryLow + entryHigh) / 2;
  const risk = entryMid - stopLoss;
  const candidates = [...new Set(targets.filter((x) => Number.isFinite(x) && x - entryHigh > 0.002 * Math.abs(entryHigh)))].sort((a, b) => a - b);

  let target1 = candidates.find((c) => c - entryMid >= 1.0 * risk);
  if (target1 === undefined) {
    target1 = entryMid + 1.5 * risk;
    rationale.push("Target 1 op 1.5R (geen bruikbare weerstand binnen bereik).");
  } else rationale.push(`Target 1 op eerstvolgende ${resName}/Fibonacci-niveau ${fmt(Math.abs(target1))}.`);

  let target2 = candidates.find((c) => c - target1! > 0.01 * Math.abs(target1!) && c - entryMid >= 2.0 * risk);
  if (target2 === undefined) {
    target2 = Math.max(entryMid + 3 * risk, target1 + risk);
    rationale.push("Target 2 op 3R (Fibonacci-extensie/trendprojectie).");
  } else rationale.push(`Target 2 op ${resName}/Fibonacci-extensie ${fmt(Math.abs(target2))}.`);

  return {
    entryLow,
    entryHigh,
    stopLoss,
    target1,
    target2,
    riskReward1: round2((target1 - entryMid) / risk),
    riskReward2: round2((target2 - entryMid) / risk),
    riskPct: Math.abs(risk / entryMid),
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const fmt = (v: number) => (v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(3) : v.toPrecision(4));
