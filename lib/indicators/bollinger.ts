import { sma, type Series } from "./movingAverages";

export interface BollingerResult {
  upper: Series;
  middle: Series;
  lower: Series;
  /** (upper - lower) / middle */
  bandwidth: Series;
  /** (prijs - lower) / (upper - lower) */
  percentB: Series;
}

/** Bollinger Bands met populatie-standaarddeviatie (zoals Bollinger zelf voorschrijft). */
export function bollinger(closes: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(closes, period);
  const upper: Series = new Array(closes.length).fill(null);
  const lower: Series = new Array(closes.length).fill(null);
  const bandwidth: Series = new Array(closes.length).fill(null);
  const percentB: Series = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const m = middle[i] as number;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - m) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
    bandwidth[i] = m !== 0 ? (2 * mult * sd) / m : 0;
    const width = (upper[i] as number) - (lower[i] as number);
    percentB[i] = width === 0 ? 0.5 : (closes[i] - (lower[i] as number)) / width;
  }
  return { upper, middle, lower, bandwidth, percentB };
}

/**
 * Squeeze: huidige bandbreedte behoort tot de laagste `pct` (standaard 15%)
 * van de afgelopen `lookback` bars — vaak de voorbode van een uitbraak.
 */
export function isSqueeze(bandwidth: Series, index = bandwidth.length - 1, lookback = 120, pct = 0.15): boolean {
  const current = bandwidth[index];
  if (current === null) return false;
  const window = bandwidth
    .slice(Math.max(0, index - lookback + 1), index + 1)
    .filter((v): v is number => v !== null);
  if (window.length < 30) return false;
  const sorted = [...window].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * pct)];
  return current <= threshold;
}
