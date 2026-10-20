import type { Candle, Forecast } from "@/types";
import { pillarScore, technicalFactors } from "./scoring";
import type { IndicatorSeries } from "./technical";

/**
 * Vooruitblik: een waaier van waarschijnlijke koersen voor de komende weken.
 *
 * Niemand kan de koers precies voorspellen. Daarom kijken we in de eigen historie van
 * deze asset naar alle dagen waarop het technische beeld leek op dat van nu (score binnen
 * een kleine marge), en meten we hoe de koers zich daarna dag voor dag ontwikkelde.
 * Uit al die paden halen we per dag de percentielen: de middelste lijn (mediaan), en
 * banden waarin de koers in 50% en 80% van de gevallen bleef. Zijn er te weinig
 * vergelijkbare dagen, dan gebruiken we alle dagen (gewoon het normale koersgedrag).
 */

const WARMUP = 200;
const MIN_MATCHES = 40;
const DAY = 86_400;

export const FORECAST_DAYS = { stock: 20, crypto: 30 } as const;

/** Percentiel (lineair geïnterpoleerd) van een oplopend gesorteerde lijst. */
export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** De volgende `count` handelsdagen (aandelen: ma–vr) of kalenderdagen (crypto) na `from`. */
export function futureTimes(from: number, count: number, weekdaysOnly: boolean): number[] {
  const out: number[] = [];
  let t = from;
  while (out.length < count) {
    t += DAY;
    const wd = new Date(t * 1000).getUTCDay();
    if (weekdaysOnly && (wd === 0 || wd === 6)) continue;
    out.push(t);
  }
  return out;
}

export function forecast(
  candles: Candle[],
  s: IndicatorSeries,
  opts: { horizon: number; weekdaysOnly: boolean; price?: number },
): Forecast | null {
  const n = candles.length;
  const H = opts.horizon;
  if (n < WARMUP + H + MIN_MATCHES) return null;
  const closes = s.closes;

  const scores: number[] = [];
  for (let i = WARMUP; i < n; i++) scores.push(pillarScore("technical", technicalFactors(s, i), "short"));
  const now = scores[scores.length - 1];
  // Alleen dagen waarvan de hele toekomst (H dagen) al bekend is
  const candidates: number[] = [];
  for (let i = WARMUP; i + H < n; i++) candidates.push(i);

  let basis: Forecast["basis"] = "similar";
  let matches = candidates.filter((i) => Math.abs(scores[i - WARMUP] - now) <= 15);
  if (matches.length < MIN_MATCHES) matches = candidates.filter((i) => Math.abs(scores[i - WARMUP] - now) <= 25);
  if (matches.length < MIN_MATCHES) {
    matches = candidates;
    basis = "all";
  }

  const start = opts.price ?? closes[n - 1];
  const times = futureTimes(candles[n - 1].time, H, opts.weekdaysOnly);
  const points: Forecast["points"] = [];
  let probUp = 0;
  for (let k = 1; k <= H; k++) {
    const r = matches.map((i) => Math.log(closes[i + k] / closes[i])).sort((a, b) => a - b);
    const at = (p: number) => start * Math.exp(percentile(r, p));
    points.push({ time: times[k - 1], p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9) });
    if (k === H) probUp = r.filter((x) => x > 0).length / r.length;
  }
  const last = points[points.length - 1];
  return {
    days: H,
    startTime: candles[n - 1].time,
    startPrice: start,
    points,
    probUp,
    medianReturn: last.p50 / start - 1,
    lowReturn: last.p10 / start - 1,
    highReturn: last.p90 / start - 1,
    samples: matches.length,
    basis,
    score: now,
  };
}
