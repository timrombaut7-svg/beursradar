import type { Candle, Horizon } from "@/types";

/**
 * Kijkt achteraf na hoe een tip uitpakte, met alleen de koersen ná het moment van de tip.
 * Korte termijn: eerste koersdoel gehaald (winst), stop-loss geraakt (verlies), of na
 * 40 handelsdagen de balans opgemaakt. Lange termijn: stop-loss, of na ± 3 maanden de balans.
 */

export interface TipInput {
  horizon: Horizon;
  type: "stock" | "crypto";
  entry: number;
  stopLoss: number;
  target1: number | null;
  createdAt: Date;
}

export type TipStatus = "target" | "stop" | "expired" | "open";

export interface TipOutcome {
  status: TipStatus;
  /** Resultaat t.o.v. de koers bij de tip (fractie); bij "open" de huidige stand */
  ret: number;
  /** Aantal handelsdagen sinds de tip */
  days: number;
}

export const SHORT_MAX_DAYS = 40;
export const longHoldDays = (type: "stock" | "crypto") => (type === "crypto" ? 91 : 63);

export function evaluateTip(tip: TipInput, candles: Candle[], currentPrice?: number): TipOutcome {
  // Alleen dagen die volledig ná de tip begonnen: zo telt een piek van vóór de tip nooit mee
  const after = candles.filter((c) => c.time * 1000 > tip.createdAt.getTime());
  const maxDays = tip.horizon === "short" ? SHORT_MAX_DAYS : longHoldDays(tip.type);
  const ret = (price: number) => price / tip.entry - 1;

  for (let k = 0; k < after.length && k < maxDays; k++) {
    const c = after[k];
    // Raakt een dag zowel stop als doel, dan rekenen we voorzichtig met de stop
    if (c.low <= tip.stopLoss) return { status: "stop", ret: ret(Math.min(tip.stopLoss, c.open)), days: k + 1 };
    if (tip.horizon === "short" && tip.target1 !== null && c.high >= tip.target1) {
      return { status: "target", ret: ret(Math.max(tip.target1, c.open)), days: k + 1 };
    }
  }
  if (after.length >= maxDays) return { status: "expired", ret: ret(after[maxDays - 1].close), days: maxDays };
  const last = currentPrice ?? after[after.length - 1]?.close ?? tip.entry;
  return { status: "open", ret: ret(last), days: after.length };
}

export interface TrackSummary {
  total: number;
  finished: number;
  wins: number;
  winRate: number | null;
  avgReturn: number | null;
  open: number;
  avgOpenReturn: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function summarizeOutcomes(outcomes: TipOutcome[]): TrackSummary {
  const finished = outcomes.filter((o) => o.status !== "open");
  const open = outcomes.filter((o) => o.status === "open");
  const wins = finished.filter((o) => o.ret > 0).length;
  return {
    total: outcomes.length,
    finished: finished.length,
    wins,
    winRate: finished.length ? wins / finished.length : null,
    avgReturn: avg(finished.map((o) => o.ret)),
    open: open.length,
    avgOpenReturn: avg(open.map((o) => o.ret)),
  };
}
