/**
 * Voortschrijdende gemiddelden. Alle functies retourneren een array met dezelfde
 * lengte als de input; posities zonder voldoende historie bevatten `null`.
 */

export type Series = (number | null)[];

/** Simple Moving Average */
export function sma(values: number[], period: number): Series {
  if (period <= 0) throw new Error("period moet > 0 zijn");
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential Moving Average. Gezaaid met de SMA van de eerste `period` waarden
 * (standaard conventie, o.a. TradingView), daarna α = 2 / (period + 1).
 */
export function ema(values: number[], period: number): Series {
  if (period <= 0) throw new Error("period moet > 0 zijn");
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** EMA over een reeks die zelf begint met null-waarden (bijv. MACD-lijn). */
export function emaOfSeries(values: Series, period: number): Series {
  const firstIdx = values.findIndex((v) => v !== null);
  const out: Series = new Array(values.length).fill(null);
  if (firstIdx === -1) return out;
  const tail = values.slice(firstIdx) as number[];
  const e = ema(tail, period);
  for (let i = 0; i < e.length; i++) out[firstIdx + i] = e[i];
  return out;
}

/** Laatste niet-null waarde uit een reeks. */
export function last(series: Series): number | null {
  for (let i = series.length - 1; i >= 0; i--) if (series[i] !== null) return series[i];
  return null;
}
