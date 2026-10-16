import type { Candle, Evidence, Horizon } from "@/types";
import { pillarScore, technicalFactors } from "./scoring";
import type { IndicatorSeries } from "./technical";

/**
 * Historische toets van een koopsignaal op één asset.
 *
 * We lopen door de koershistorie en kijken op elke dag (alleen met data t/m die dag)
 * of het technische signaal toen ook "kopen" gaf. Zo ja, dan kopen we op de open
 * van de volgende dag en volgen we hetzelfde soort plan als nu wordt aangeraden:
 *  - korte termijn: stop-loss en eerste koersdoel op dezelfde afstand (in ATR) als het
 *    huidige plan; uitstappen bij stop, doel, of na maximaal 40 handelsdagen;
 *  - lange termijn: stop-loss op dezelfde breedte als nu, en na ± 3 maanden de balans opmaken.
 * Trades overlappen niet: een nieuw signaal telt pas als de vorige trade klaar is.
 * Als vergelijking rekenen we hetzelfde plan door met instappen op élke dag: het signaal
 * telt alleen als bewezen als het winst gaf én beter deed dan zo'n willekeurige instap.
 * Kosten (0,1% per kant) zijn verrekend. Fundamentele en sentimentdata bestaan
 * historisch niet per dag en tellen dus niet mee: dit toetst het koersgedrag.
 */

export const SHORT_ENTRY = 20;
export const LONG_ENTRY = 20;
const FEE = 0.001;
const WARMUP = 200;
export const MIN_SAMPLES = { short: 8, long: 6 } as const;

export interface ShortPlanShape {
  /** Afstand instap → stop-loss, in ATR */
  riskAtr: number;
  /** Afstand instap → eerste koersdoel, in ATR */
  rewardAtr: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Vertaalt het huidige tradeplan naar afstanden in ATR, zodat het historisch toepasbaar is. */
export function planShape(plan: { entryLow: number; entryHigh: number; stopLoss: number; target1: number }, atr: number | null, price: number): ShortPlanShape {
  const a = atr && atr > 0 ? atr : price * 0.02;
  const mid = (plan.entryLow + plan.entryHigh) / 2;
  return {
    riskAtr: clamp((mid - plan.stopLoss) / a, 0.75, 6),
    rewardAtr: clamp((plan.target1 - mid) / a, 0.5, 12),
  };
}

function summarize(horizon: Horizon, returns: number[], held: number[], baseline: number[], candles: Candle[], barsPerYear: number): Evidence {
  const baselineReturn = baseline.length ? baseline.reduce((s, r) => s + r, 0) / baseline.length : 0;
  const samples = returns.length;
  const wins = returns.filter((r) => r > 0).length;
  const avgReturn = samples ? returns.reduce((s, r) => s + r, 0) / samples : 0;
  const winRate = samples ? wins / samples : 0;
  const tested = Math.max(0, candles.length - WARMUP);
  let verdict: Evidence["verdict"] = "insufficient";
  if (samples >= MIN_SAMPLES[horizon]) {
    // Het signaal moet winst opleveren én beter doen dan op een willekeurige dag instappen
    const edge = avgReturn > baselineReturn;
    const proven = edge && (horizon === "short" ? avgReturn > 0.002 && winRate >= 0.45 : avgReturn > 0.01 && winRate >= 0.5);
    verdict = proven ? "proven" : "weak";
  }
  return {
    horizon,
    samples,
    wins,
    winRate,
    avgReturn,
    baselineReturn,
    bestReturn: samples ? Math.max(...returns) : 0,
    worstReturn: samples ? Math.min(...returns) : 0,
    avgHoldDays: samples ? Math.round(held.reduce((s, d) => s + d, 0) / samples) : 0,
    years: Math.round((tested / barsPerYear) * 10) / 10,
    verdict,
  };
}

/** Simuleert één korte-termijntrade vanaf het signaal op bar i; null als hij nog loopt. */
function shortTrade(candles: Candle[], i: number, atr: number, shape: ShortPlanShape, maxHold: number): { ret: number; exitBar: number } | null {
  const n = candles.length;
  const entry = candles[i + 1].open;
  const stop = entry - shape.riskAtr * atr;
  const target = entry + shape.rewardAtr * atr;
  for (let j = i + 1; j < n && j <= i + maxHold; j++) {
    const c = candles[j];
    // Raakt een dag zowel stop als doel, dan rekenen we voorzichtig met de stop
    if (c.low <= stop) return { ret: Math.min(stop, c.open) / entry - 1 - 2 * FEE, exitBar: j };
    if (c.high >= target) return { ret: Math.max(target, c.open) / entry - 1 - 2 * FEE, exitBar: j };
  }
  if (i + maxHold > n - 1) return null; // trade loopt nog: niet meetellen
  return { ret: candles[i + maxHold].close / entry - 1 - 2 * FEE, exitBar: i + maxHold };
}

/** Korte termijn: haalde hetzelfde soort signaal en plan vroeger het doel vóór de stop? */
export function shortEvidence(candles: Candle[], s: IndicatorSeries, shape: ShortPlanShape, barsPerYear: number, maxHold = 40): Evidence {
  const n = candles.length;
  const returns: number[] = [];
  const held: number[] = [];
  const baseline: number[] = [];
  // Vergelijking: hetzelfde plan, maar instappen op élke dag, ongeacht het signaal
  for (let i = WARMUP; i < n - 1; i++) {
    const atr = s.atr[i];
    const t = atr === null ? null : shortTrade(candles, i, atr, shape, maxHold);
    if (t) baseline.push(t.ret);
  }
  let i = WARMUP;
  while (i < n - 1) {
    const atr = s.atr[i];
    if (atr === null || pillarScore("technical", technicalFactors(s, i), "short") < SHORT_ENTRY) {
      i++;
      continue;
    }
    const t = shortTrade(candles, i, atr, shape, maxHold);
    if (!t) break;
    returns.push(t.ret);
    held.push(t.exitBar - i);
    i = t.exitBar + 1;
  }
  return summarize("short", returns, held, baseline, candles, barsPerYear);
}

function annualVol(closes: number[], i: number, barsPerYear: number, window = 30): number {
  if (i < window) return 0.5;
  const r: number[] = [];
  for (let k = i - window + 1; k <= i; k++) r.push(Math.log(closes[k] / closes[k - 1]));
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v * barsPerYear);
}

/** Simuleert één lange-termijnbelegging vanaf bar i (± 3 maanden met stop-loss). */
function longTrade(candles: Candle[], closes: number[], i: number, hold: number, barsPerYear: number): { ret: number; exitBar: number } {
  const entry = candles[i + 1].open;
  const dist = clamp(1.5 * annualVol(closes, i, barsPerYear) * Math.sqrt(63 / 252), 0.12, 0.4);
  const stop = entry * (1 - dist);
  for (let j = i + 1; j <= i + hold; j++) {
    if (candles[j].low <= stop) return { ret: Math.min(stop, candles[j].open) / entry - 1 - 2 * FEE, exitBar: j };
  }
  return { ret: candles[i + hold].close / entry - 1 - 2 * FEE, exitBar: i + hold };
}

/** Lange termijn: hoe verging het een koper ± 3 maanden na hetzelfde soort signaal? */
export function longEvidence(candles: Candle[], s: IndicatorSeries, barsPerYear: number): Evidence {
  const n = candles.length;
  const hold = Math.round(barsPerYear / 4);
  const returns: number[] = [];
  const held: number[] = [];
  const baseline: number[] = [];
  for (let i = WARMUP; i + hold < n; i++) baseline.push(longTrade(candles, s.closes, i, hold, barsPerYear).ret);
  let i = WARMUP;
  while (i + hold < n) {
    if (pillarScore("technical", technicalFactors(s, i), "long") < LONG_ENTRY) {
      i++;
      continue;
    }
    const t = longTrade(candles, s.closes, i, hold, barsPerYear);
    returns.push(t.ret);
    held.push(t.exitBar - i);
    i = t.exitBar + 1;
  }
  return summarize("long", returns, held, baseline, candles, barsPerYear);
}
