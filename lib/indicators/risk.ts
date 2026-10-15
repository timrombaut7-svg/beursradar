/** Risico- en volatiliteitsmaatstaven op basis van slotkoersen. */

export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

export function simpleReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) out.push(closes[i] / closes[i - 1] - 1);
  return out;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

/** Steekproef-standaarddeviatie (n - 1). */
export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

/**
 * Geannualiseerde historische volatiliteit over de laatste `window` returns.
 * Aandelen: 252 handelsdagen per jaar, crypto: 365.
 */
export function historicalVolatility(closes: number[], window = 30, periodsPerYear = 252): number {
  const r = logReturns(closes.slice(-(window + 1)));
  return stdev(r) * Math.sqrt(periodsPerYear);
}

/** Maximale piek-tot-dal daling als positieve fractie (0.35 = -35%). */
export function maxDrawdown(closes: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = peak > 0 ? (peak - c) / peak : 0;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
}

/**
 * Beta = cov(asset, benchmark) / var(benchmark) over gelijktijdige returns.
 * Reeksen worden op tijdstempel uitgelijnd.
 */
export function beta(
  asset: { time: number; close: number }[],
  benchmark: { time: number; close: number }[],
  window = 252,
): number | null {
  const bMap = new Map(benchmark.map((b) => [dayKey(b.time), b.close]));
  const aligned: [number, number][] = [];
  for (const a of asset) {
    const b = bMap.get(dayKey(a.time));
    if (b !== undefined) aligned.push([a.close, b]);
  }
  const slice = aligned.slice(-(window + 1));
  if (slice.length < 30) return null;
  const ra = simpleReturns(slice.map((x) => x[0]));
  const rb = simpleReturns(slice.map((x) => x[1]));
  const ma = mean(ra);
  const mb = mean(rb);
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    varB += (rb[i] - mb) ** 2;
  }
  return varB === 0 ? null : cov / varB;
}

function dayKey(t: number) {
  return Math.floor(t / 86400);
}

/** Historische 1-daagse Value-at-Risk (positief getal = verlies). */
export function historicalVaR(closes: number[], confidence = 0.95): number {
  const r = simpleReturns(closes).sort((a, b) => a - b);
  if (!r.length) return 0;
  const idx = Math.floor((1 - confidence) * r.length);
  return Math.max(0, -r[idx]);
}

/** Sharpe ratio (risicovrije rente optioneel), geannualiseerd. */
export function sharpe(closes: number[], periodsPerYear = 252, riskFree = 0): number | null {
  const r = simpleReturns(closes);
  const sd = stdev(r);
  if (sd === 0) return null;
  return ((mean(r) - riskFree / periodsPerYear) / sd) * Math.sqrt(periodsPerYear);
}
