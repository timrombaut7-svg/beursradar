import type { Series } from "./movingAverages";

export type CrossDirection = "up" | "down";

export interface Crossover {
  index: number;
  direction: CrossDirection;
}

/**
 * Detecteert alle kruisingen waar reeks `a` reeks `b` kruist.
 * "up" = a gaat van onder naar boven b.
 */
export function crossovers(a: Series, b: Series): Crossover[] {
  const out: Crossover[] = [];
  for (let i = 1; i < a.length; i++) {
    const a0 = a[i - 1], a1 = a[i], b0 = b[i - 1], b1 = b[i];
    if (a0 === null || a1 === null || b0 === null || b1 === null) continue;
    if (a0 <= b0 && a1 > b1) out.push({ index: i, direction: "up" });
    else if (a0 >= b0 && a1 < b1) out.push({ index: i, direction: "down" });
  }
  return out;
}

/** Meest recente kruising op of vóór `uptoIndex`, binnen `lookback` bars. */
export function lastCross(
  a: Series,
  b: Series,
  uptoIndex = a.length - 1,
  lookback = Infinity,
): { direction: CrossDirection; barsAgo: number } | null {
  const start = Math.max(1, Number.isFinite(lookback) ? uptoIndex - lookback + 1 : 1);
  for (let i = uptoIndex; i >= start; i--) {
    const a0 = a[i - 1], a1 = a[i], b0 = b[i - 1], b1 = b[i];
    if (a0 === null || a1 === null || b0 === null || b1 === null) continue;
    if (a0 <= b0 && a1 > b1) return { direction: "up", barsAgo: uptoIndex - i };
    if (a0 >= b0 && a1 < b1) return { direction: "down", barsAgo: uptoIndex - i };
  }
  return null;
}
