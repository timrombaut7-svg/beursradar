import type { BacktestResult, BacktestTrade, Candle } from "@/types";
import { maxDrawdown } from "@/lib/indicators";
import { pillarScore, technicalFactors } from "./scoring";
import type { IndicatorSeries } from "./technical";

export interface BacktestOptions {
  /** Aantal bars om te testen (12 maanden: 252 aandelen / 365 crypto) */
  testBars: number;
  entryThreshold?: number;
  exitThreshold?: number;
  /** Transactiekosten per kant als fractie */
  fee?: number;
  /** Stop-loss afstand in ATR's */
  stopAtr?: number;
}

/**
 * Walk-forward backtest van het technische deel van het algoritme.
 * Op elke bar wordt de TA-score berekend met uitsluitend data t/m die bar;
 * orders worden uitgevoerd op de open van de volgende bar (geen look-ahead).
 * Fundamentele en sentimentdata zijn historisch niet beschikbaar en worden
 * daarom niet meegenomen.
 */
export function runBacktest(candles: Candle[], s: IndicatorSeries, opts: BacktestOptions): BacktestResult {
  const { testBars, entryThreshold = 20, exitThreshold = -10, fee = 0.001, stopAtr = 2 } = opts;
  const start = Math.max(201, candles.length - testBars);
  const n = candles.length;

  let equity = 1;
  let inPos = false;
  let entryPrice = 0;
  let entryTime = 0;
  let stop = 0;
  let barsInMarket = 0;
  const trades: BacktestTrade[] = [];
  const curve: BacktestResult["equityCurve"] = [];
  const startPrice = candles[start].open;
  let pending: "buy" | "sell" | null = null;

  for (let i = start; i < n; i++) {
    const c = candles[i];

    // 1. Voer het signaal van gisteren uit op de open van vandaag
    if (pending === "buy" && !inPos) {
      inPos = true;
      entryPrice = c.open;
      entryTime = c.time;
      stop = c.open - stopAtr * ((s.atr[i - 1] as number) ?? c.open * 0.02);
      equity *= 1 - fee;
    } else if (pending === "sell" && inPos) {
      closeTrade(c.open, c.time, "signal");
    }
    pending = null;

    // 2. Stop-loss intraday
    if (inPos && c.low <= stop) {
      closeTrade(Math.min(stop, c.open), c.time, "stop");
    }

    // 3. Markeer equity op slotkoers
    const mtm = inPos ? equity * (c.close / entryPrice) : equity;
    if (inPos) barsInMarket++;
    curve.push({ time: c.time, strategy: round(mtm * 100), buyHold: round((c.close / startPrice) * 100) });

    // 4. Genereer signaal op basis van data t/m deze bar
    if (i < n - 1) {
      const score = pillarScore("technical", technicalFactors(s, i));
      if (!inPos && score >= entryThreshold) pending = "buy";
      else if (inPos && score <= exitThreshold) pending = "sell";
    }
  }
  if (inPos) closeTrade(candles[n - 1].close, candles[n - 1].time, "end");

  function closeTrade(price: number, time: number, reason: BacktestTrade["exitReason"]) {
    const ret = price / entryPrice - 1;
    equity *= (1 + ret) * (1 - fee);
    trades.push({ entryTime, entryPrice, exitTime: time, exitPrice: price, returnPct: ret, exitReason: reason });
    inPos = false;
  }

  const wins = trades.filter((t) => t.returnPct > 0).length;
  return {
    periodStart: candles[start].time,
    periodEnd: candles[n - 1].time,
    strategyReturn: equity - 1,
    buyHoldReturn: candles[n - 1].close / startPrice - 1,
    trades,
    winRate: trades.length ? wins / trades.length : 0,
    maxDrawdown: maxDrawdown(curve.map((p) => p.strategy)),
    exposure: barsInMarket / Math.max(1, n - start),
    equityCurve: curve,
  };
}

const round = (v: number) => Math.round(v * 100) / 100;
