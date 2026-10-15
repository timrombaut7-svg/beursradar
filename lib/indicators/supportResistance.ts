import type { Candle, FibonacciLevels, PriceLevel } from "@/types";

/** Klassieke floor-trader pivot points op basis van de vorige periode (H, L, C). */
export function pivotPoints(high: number, low: number, close: number) {
  const p = (high + low + close) / 3;
  return {
    p,
    r1: 2 * p - low,
    s1: 2 * p - high,
    r2: p + (high - low),
    s2: p - (high - low),
  };
}

/**
 * Swing-highs/-lows (fractals): een bar is een swing-high als zijn high het hoogst is
 * binnen `wing` bars aan beide kanten.
 */
export function swingPoints(candles: Candle[], wing = 5) {
  const highs: { index: number; price: number }[] = [];
  const lows: { index: number; price: number }[] = [];
  for (let i = wing; i < candles.length - wing; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - wing; j <= i + wing; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push({ index: i, price: candles[i].high });
    if (isLow) lows.push({ index: i, price: candles[i].low });
  }
  return { highs, lows };
}

/** Groepeert prijsniveaus die binnen `tolerance` (relatief) van elkaar liggen. */
export function clusterLevels(prices: number[], tolerance = 0.015): { price: number; strength: number }[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const p of sorted) {
    const lastCluster = clusters[clusters.length - 1];
    if (lastCluster) {
      const mean = lastCluster.reduce((s, v) => s + v, 0) / lastCluster.length;
      if (Math.abs(p - mean) / mean <= tolerance) {
        lastCluster.push(p);
        continue;
      }
    }
    clusters.push([p]);
  }
  return clusters.map((c) => ({
    price: c.reduce((s, v) => s + v, 0) / c.length,
    strength: c.length,
  }));
}

export interface SupportResistanceResult {
  supports: PriceLevel[];
  resistances: PriceLevel[];
  pivots: ReturnType<typeof pivotPoints> | null;
  high52w: number;
  low52w: number;
}

/**
 * Bepaalt support- en resistance-niveaus op basis van:
 *  1. geclusterde swing-highs/lows uit de recente historie
 *  2. klassieke pivot points van de laatste afgeronde 5-bar periode (≈ week)
 *  3. de 52-weekse high en low
 * Niveaus onder de huidige prijs zijn support, erboven resistance.
 */
export function supportResistance(
  candles: Candle[],
  opts: { lookback?: number; wing?: number; maxLevels?: number; barsPerYear?: number } = {},
): SupportResistanceResult {
  const { lookback = 250, wing = 5, maxLevels = 4, barsPerYear = 252 } = opts;
  const window = candles.slice(-lookback);
  const price = candles[candles.length - 1].close;
  const yearWindow = candles.slice(-barsPerYear);
  const high52w = Math.max(...yearWindow.map((c) => c.high));
  const low52w = Math.min(...yearWindow.map((c) => c.low));

  const { highs, lows } = swingPoints(window, wing);
  const clustered = clusterLevels([...highs.map((h) => h.price), ...lows.map((l) => l.price)]);

  let pivots: ReturnType<typeof pivotPoints> | null = null;
  if (candles.length >= 6) {
    const prevPeriod = candles.slice(-6, -1);
    pivots = pivotPoints(
      Math.max(...prevPeriod.map((c) => c.high)),
      Math.min(...prevPeriod.map((c) => c.low)),
      prevPeriod[prevPeriod.length - 1].close,
    );
  }

  const levels: PriceLevel[] = clustered.map((c) => ({
    price: c.price,
    strength: c.strength,
    kind: c.price < price ? "support" : "resistance",
    origin: "swing",
  }));
  if (pivots) {
    for (const [key, val] of Object.entries(pivots)) {
      if (key === "p") continue;
      levels.push({ price: val, strength: 1, kind: val < price ? "support" : "resistance", origin: "pivot" });
    }
  }
  levels.push({ price: high52w, strength: 2, kind: high52w <= price ? "support" : "resistance", origin: "52w" });
  levels.push({ price: low52w, strength: 2, kind: low52w < price ? "support" : "resistance", origin: "52w" });

  // Niveaus die (bijna) op de huidige prijs liggen zijn niet informatief
  const meaningful = levels.filter((l) => Math.abs(l.price - price) / price > 0.003);

  const supports = dedupe(
    meaningful.filter((l) => l.kind === "support").sort((a, b) => b.price - a.price),
  ).slice(0, maxLevels);
  const resistances = dedupe(
    meaningful.filter((l) => l.kind === "resistance").sort((a, b) => a.price - b.price),
  ).slice(0, maxLevels);

  return { supports, resistances, pivots, high52w, low52w };
}

/** Voegt niveaus samen die dicht bij elkaar liggen en telt hun sterkte op. */
function dedupe(levels: PriceLevel[], tolerance = 0.01): PriceLevel[] {
  const out: PriceLevel[] = [];
  for (const l of levels) {
    const near = out.find((o) => Math.abs(o.price - l.price) / o.price <= tolerance);
    if (near) {
      near.strength += l.strength;
      if (l.origin === "swing") near.origin = "swing";
    } else out.push({ ...l });
  }
  return out;
}

const RETRACEMENTS = [0.236, 0.382, 0.5, 0.618, 0.786];
const EXTENSIONS = [1.272, 1.618, 2.0];

/**
 * Fibonacci-retracements en -extensies over de dominante swing in de laatste
 * `lookback` bars. Bij een opwaartse swing (low vóór high) liggen retracements
 * onder de high en extensies erboven.
 */
export function fibonacci(candles: Candle[], lookback = 120): FibonacciLevels | null {
  const window = candles.slice(-lookback);
  if (window.length < 10) return null;
  let hiIdx = 0;
  let loIdx = 0;
  window.forEach((c, i) => {
    if (c.high > window[hiIdx].high) hiIdx = i;
    if (c.low < window[loIdx].low) loIdx = i;
  });
  const swingHigh = window[hiIdx].high;
  const swingLow = window[loIdx].low;
  const range = swingHigh - swingLow;
  if (range <= 0) return null;
  const trend: "up" | "down" = loIdx < hiIdx ? "up" : "down";

  const retracements = RETRACEMENTS.map((ratio) => ({
    ratio,
    price: trend === "up" ? swingHigh - range * ratio : swingLow + range * ratio,
  }));
  const extensions = EXTENSIONS.map((ratio) => ({
    ratio,
    price: trend === "up" ? swingLow + range * ratio : swingHigh - range * ratio,
  }));
  return { swingHigh, swingLow, trend, retracements, extensions };
}
