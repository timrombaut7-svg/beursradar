import type { Candle, TechnicalSnapshot } from "@/types";
import {
  atr,
  bollinger,
  ema,
  isSqueeze,
  lastCross,
  macd,
  rsi,
  rsiStatus,
  supportResistance,
  fibonacci,
  type Series,
} from "@/lib/indicators";

/** Alle indicatorreeksen in één keer (causaal: waarde op i hangt alleen af van bars ≤ i). */
export interface IndicatorSeries {
  closes: number[];
  ema20: Series;
  ema50: Series;
  ema200: Series;
  rsi: Series;
  macd: Series;
  macdSignal: Series;
  macdHist: Series;
  bbUpper: Series;
  bbMiddle: Series;
  bbLower: Series;
  bbWidth: Series;
  bbPercentB: Series;
  atr: Series;
}

export function computeSeries(candles: Candle[]): IndicatorSeries {
  const closes = candles.map((c) => c.close);
  const m = macd(closes);
  const bb = bollinger(closes);
  return {
    closes,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi: rsi(closes, 14),
    macd: m.macd,
    macdSignal: m.signal,
    macdHist: m.histogram,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    bbWidth: bb.bandwidth,
    bbPercentB: bb.percentB,
    atr: atr(candles, 14),
  };
}

export function technicalSnapshot(candles: Candle[], s: IndicatorSeries, barsPerYear: number): TechnicalSnapshot {
  const i = candles.length - 1;
  const price = s.closes[i];
  const macdCross = lastCross(s.macd, s.macdSignal, i, 10);
  const maCross = lastCross(s.ema50, s.ema200, i, 60);
  const sr = supportResistance(candles, { barsPerYear });
  const bbOk = s.bbUpper[i] !== null;
  return {
    price,
    rsi: s.rsi[i],
    rsiStatus: rsiStatus(s.rsi[i]),
    macd:
      s.macd[i] !== null && s.macdSignal[i] !== null
        ? { macd: s.macd[i] as number, signal: s.macdSignal[i] as number, histogram: s.macdHist[i] as number }
        : null,
    macdCross: macdCross ? (macdCross.direction === "up" ? "bullish" : "bearish") : null,
    macdCrossBarsAgo: macdCross?.barsAgo ?? null,
    ema20: s.ema20[i],
    ema50: s.ema50[i],
    ema200: s.ema200[i],
    maCross: maCross ? (maCross.direction === "up" ? "golden" : "death") : null,
    maCrossBarsAgo: maCross?.barsAgo ?? null,
    bollinger: bbOk
      ? {
          upper: s.bbUpper[i] as number,
          middle: s.bbMiddle[i] as number,
          lower: s.bbLower[i] as number,
          bandwidth: s.bbWidth[i] as number,
          percentB: s.bbPercentB[i] as number,
        }
      : null,
    bollingerSqueeze: isSqueeze(s.bbWidth, i),
    atr: s.atr[i],
    supports: sr.supports,
    resistances: sr.resistances,
    pivots: sr.pivots,
    fibonacci: fibonacci(candles),
    high52w: sr.high52w,
    low52w: sr.low52w,
  };
}
