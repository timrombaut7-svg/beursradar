import type { Advice, SellAdvice } from "@/types";

export interface HeldPosition {
  buyPrice: number;
  stopLoss?: number | null;
  target1?: number | null;
  target2?: number | null;
  horizon?: "short" | "long";
}

/**
 * Verkoopadvies voor een gekochte (long) positie, in volgorde van belang:
 *  1. Koers op of onder de stop-loss          → VERKOPEN
 *  2. Koers op of boven koersdoel 2           → VERKOPEN (winst nemen)
 *  3. Signaal op korte termijn is VERKOOP     → VERKOPEN
 *  4. Koers op of boven koersdoel 1           → DEELS WINST NEMEN, stop naar instapprijs
 *  5. Anders                                  → HOUDEN
 * Posities zonder plan (handmatig ingevoerd) krijgen alleen het signaaladvies.
 * Voor lange-termijnposities moet de aanroeper het lange-termijnsignaal meegeven.
 */
export function sellAdvice(p: HeldPosition, price: number, signal: { advice: Advice } | null): SellAdvice {
  const rel = (level: number | null | undefined, sign: 1 | -1) =>
    level ? (sign * (level - price)) / price : null;
  const base = {
    toStopPct: rel(p.stopLoss, -1),
    toTarget1Pct: rel(p.target1, 1),
    toTarget2Pct: rel(p.target2, 1),
  };
  const pnl = price / p.buyPrice - 1;
  const pnlTxt = `${pnl >= 0 ? "+" : ""}${(pnl * 100).toFixed(1).replace(".", ",")}%`;

  if (p.stopLoss && price <= p.stopLoss) {
    return { ...base, action: "SELL", title: "Verkopen", reason: `Stop-loss geraakt (${pnlTxt}). Verkoop om groter verlies te voorkomen.` };
  }
  if (p.target2 && price >= p.target2) {
    return { ...base, action: "SELL", title: "Verkopen", reason: `Koersdoel 2 bereikt (${pnlTxt}). Neem je winst.` };
  }
  if (signal && (signal.advice === "SELL" || signal.advice === "STRONG_SELL")) {
    return {
      ...base,
      action: "SELL",
      title: "Verkopen",
      reason: `Het signaal is omgeslagen naar ${signal.advice === "STRONG_SELL" ? "sterk verkopen" : "verkopen"} (${pnlTxt}).`,
    };
  }
  if (p.target1 && price >= p.target1) {
    return {
      ...base,
      action: "TAKE_PROFIT",
      title: "Deels winst nemen",
      reason: `Koersdoel 1 bereikt (${pnlTxt}). Verkoop bijvoorbeeld de helft en zet je stop-loss op je instapprijs.`,
    };
  }
  if (p.horizon === "long") {
    return { ...base, action: "HOLD", title: "Houden", reason: `Lange termijn: blijf houden zolang het signaal positief is. Resultaat tot nu toe ${pnlTxt}.` };
  }
  const plan = p.stopLoss || p.target1 ? "" : " (geen plan vastgelegd, alleen het signaal telt)";
  return { ...base, action: "HOLD", title: "Houden", reason: `Geen verkoopsignaal${plan}. Resultaat tot nu toe ${pnlTxt}.` };
}
