import type { Timeframe } from "@/types";

export interface TimeframeSpec {
  label: string;
  description: string;
  yahoo: string;
  binance: string;
  seconds: number;
  bars: number;
  /** Aantal bars dat standaard zichtbaar is in de grafiek */
  visibleBars?: number;
}

const H = 3600;
const D = 86400;

export const TIMEFRAMES: Record<Timeframe, TimeframeSpec> = {
  "1H": { label: "1H", description: "Uurcandles · 30 dagen", yahoo: "1h", binance: "1h", seconds: H, bars: 720, visibleBars: 240 },
  "1D": { label: "1D", description: "Dagcandles · 2 jaar", yahoo: "1d", binance: "1d", seconds: D, bars: 730, visibleBars: 180 },
  "1W": { label: "1W", description: "Weekcandles · 5 jaar", yahoo: "1wk", binance: "1w", seconds: 7 * D, bars: 260 },
  "1M": { label: "1M", description: "Maandcandles · 10 jaar", yahoo: "1mo", binance: "1M", seconds: 30 * D, bars: 120 },
  "1Y": { label: "1Y", description: "Dagcandles · laatste jaar", yahoo: "1d", binance: "1d", seconds: D, bars: 365 },
};

export const ANALYSIS_TIMEFRAME = TIMEFRAMES["1D"];

export function isTimeframe(v: string): v is Timeframe {
  return v in TIMEFRAMES;
}
