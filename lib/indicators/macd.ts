import { ema, emaOfSeries, type Series } from "./movingAverages";

export interface MacdResult {
  macd: Series;
  signal: Series;
  histogram: Series;
}

/** MACD (12, 26, 9): MACD = EMA12 - EMA26, signaal = EMA9(MACD), histogram = MACD - signaal. */
export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const fastE = ema(closes, fast);
  const slowE = ema(closes, slow);
  const line: Series = closes.map((_, i) =>
    fastE[i] !== null && slowE[i] !== null ? (fastE[i] as number) - (slowE[i] as number) : null,
  );
  const signal = emaOfSeries(line, signalPeriod);
  const histogram: Series = line.map((v, i) =>
    v !== null && signal[i] !== null ? v - (signal[i] as number) : null,
  );
  return { macd: line, signal, histogram };
}
