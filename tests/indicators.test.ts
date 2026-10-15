import { describe, expect, it } from "vitest";
import {
  atr,
  beta,
  bollinger,
  clusterLevels,
  crossovers,
  ema,
  fibonacci,
  historicalVolatility,
  isSqueeze,
  lastCross,
  macd,
  maxDrawdown,
  pivotPoints,
  rsi,
  rsiStatus,
  sma,
  supportResistance,
  swingPoints,
} from "@/lib/indicators";
import type { Candle } from "@/types";

const candlesFrom = (closes: number[]): Candle[] =>
  closes.map((c, i) => ({ time: i * 86400, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 1000 }));

describe("SMA / EMA", () => {
  it("SMA berekent het rekenkundig gemiddelde", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("EMA wordt gezaaid met SMA en volgt daarna α = 2/(n+1)", () => {
    const out = ema([2, 4, 6, 8, 10], 3);
    expect(out[0]).toBeNull();
    expect(out[2]).toBeCloseTo(4); // SMA(2,4,6)
    expect(out[3]).toBeCloseTo(8 * 0.5 + 4 * 0.5); // 6
    expect(out[4]).toBeCloseTo(10 * 0.5 + 6 * 0.5); // 8
  });

  it("EMA van een constante reeks is die constante", () => {
    const out = ema(new Array(50).fill(7), 10);
    expect(out[49]).toBeCloseTo(7);
  });
});

describe("RSI (Wilder)", () => {
  // Klassieke dataset uit het StockCharts-voorbeeld. Referentiewaarden zijn die van
  // TA-Lib (volle precisie); StockCharts rondt tussenresultaten af (70.53).
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.0,
    46.03, 46.41, 46.22, 45.64, 46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57, 43.42, 42.66,
    43.13,
  ];

  it("komt overeen met de TA-Lib referentiewaarden", () => {
    const r = rsi(closes, 14);
    expect(r[13]).toBeNull();
    expect(r[14]).toBeCloseTo(70.4641, 3);
    expect(r[15]).toBeCloseTo(66.2496, 3);
    expect(r[16]).toBeCloseTo(66.4809, 3);
    expect(r[32]).toBeCloseTo(37.7888, 3);
  });

  it("geeft 100 bij alleen stijgingen en ~0 bij alleen dalingen", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const down = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(rsi(up)[29]).toBe(100);
    expect(rsi(down)[29]).toBeCloseTo(0);
  });

  it("classificeert overbought/oversold", () => {
    expect(rsiStatus(75)).toBe("overbought");
    expect(rsiStatus(25)).toBe("oversold");
    expect(rsiStatus(50)).toBe("neutral");
  });
});

describe("MACD", () => {
  it("MACD-lijn = EMA12 - EMA26 en histogram = MACD - signaal", () => {
    const closes = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 5) * 10 + i * 0.3);
    const { macd: line, signal, histogram } = macd(closes);
    const e12 = ema(closes, 12);
    const e26 = ema(closes, 26);
    expect(line[24]).toBeNull();
    expect(line[25]).toBeCloseTo((e12[25] as number) - (e26[25] as number));
    expect(signal[25 + 7]).toBeNull();
    expect(signal[25 + 8]).not.toBeNull();
    expect(histogram[79]).toBeCloseTo((line[79] as number) - (signal[79] as number));
  });

  it("is positief in een gestage uptrend", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 * 1.01 ** i);
    expect(macd(closes).macd[59]!).toBeGreaterThan(0);
  });
});

describe("Crossovers (Golden/Death cross)", () => {
  it("detecteert kruisingen in beide richtingen", () => {
    const a = [1, 2, 3, 2, 1];
    const b = [2, 2, 2, 2, 2];
    expect(crossovers(a, b)).toEqual([
      { index: 2, direction: "up" },
      { index: 4, direction: "down" },
    ]);
    expect(lastCross(a, b)).toEqual({ direction: "down", barsAgo: 0 });
    expect(lastCross(a, b, 3)).toEqual({ direction: "up", barsAgo: 1 });
  });

  it("detecteert een golden cross van EMA50/EMA200 na een trendomslag", () => {
    const closes = [
      ...Array.from({ length: 250 }, (_, i) => 200 - i * 0.4),
      ...Array.from({ length: 150 }, (_, i) => 100 + i * 1.5),
    ];
    const cross = lastCross(ema(closes, 50), ema(closes, 200));
    expect(cross?.direction).toBe("up");
  });
});

describe("Bollinger Bands", () => {
  it("middenband = SMA20 en banden symmetrisch op 2σ", () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + (i % 2 === 0 ? 1 : -1));
    const bb = bollinger(closes);
    expect(bb.middle[39]).toBeCloseTo(100);
    // populatie-σ van ±1 afwisselend = 1
    expect(bb.upper[39]).toBeCloseTo(102);
    expect(bb.lower[39]).toBeCloseTo(98);
  });

  it("detecteert een squeeze na een periode van lage volatiliteit", () => {
    const noisy = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i) * 8);
    const calm = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 0.2);
    const bb = bollinger([...noisy, ...calm]);
    expect(isSqueeze(bb.bandwidth)).toBe(true);
  });
});

describe("ATR", () => {
  it("is gelijk aan de constante range bij constante candles", () => {
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({ time: i, open: 100, high: 102, low: 98, close: 100, volume: 1 }));
    expect(atr(candles)[29]).toBeCloseTo(4);
  });
});

describe("Support & Resistance", () => {
  it("berekent klassieke pivot points", () => {
    const p = pivotPoints(110, 90, 100);
    expect(p.p).toBeCloseTo(100);
    expect(p.r1).toBeCloseTo(110);
    expect(p.s1).toBeCloseTo(90);
    expect(p.r2).toBeCloseTo(120);
    expect(p.s2).toBeCloseTo(80);
  });

  it("clustert nabijgelegen niveaus", () => {
    const c = clusterLevels([100, 100.5, 101, 120, 121]);
    expect(c).toHaveLength(2);
    expect(c[0].strength).toBe(3);
  });

  it("vindt swing-highs/lows in een zigzag", () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + 10 * Math.sin((i / 20) * Math.PI));
    const { highs, lows } = swingPoints(candlesFrom(closes), 3);
    expect(highs.length).toBeGreaterThan(0);
    expect(lows.length).toBeGreaterThan(0);
  });

  it("plaatst supports onder en resistances boven de prijs", () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + 15 * Math.sin(i / 12) + i * 0.05);
    const sr = supportResistance(candlesFrom(closes));
    const price = closes[closes.length - 1];
    expect(sr.supports.every((l) => l.price < price)).toBe(true);
    expect(sr.resistances.every((l) => l.price > price)).toBe(true);
    // gesorteerd op nabijheid
    for (let i = 1; i < sr.supports.length; i++) expect(sr.supports[i].price).toBeLessThan(sr.supports[i - 1].price);
  });

  it("berekent Fibonacci-niveaus voor een opwaartse swing", () => {
    const closes = Array.from({ length: 120 }, (_, i) => 100 + i);
    const fib = fibonacci(candlesFrom(closes))!;
    expect(fib.trend).toBe("up");
    const range = fib.swingHigh - fib.swingLow;
    expect(fib.retracements.find((r) => r.ratio === 0.618)!.price).toBeCloseTo(fib.swingHigh - 0.618 * range);
    expect(fib.extensions.find((r) => r.ratio === 1.618)!.price).toBeCloseTo(fib.swingLow + 1.618 * range);
  });
});

describe("Risico", () => {
  it("max drawdown van 100 → 150 → 75 → 120 is 50%", () => {
    expect(maxDrawdown([100, 150, 75, 120])).toBeCloseTo(0.5);
  });

  it("volatiliteit is 0 voor een constante reeks", () => {
    expect(historicalVolatility(new Array(40).fill(10))).toBe(0);
  });

  it("beta van een 2x-hefboom reeks is ~2", () => {
    const bench: { time: number; close: number }[] = [];
    const asset: { time: number; close: number }[] = [];
    let b = 100;
    let a = 100;
    for (let i = 0; i < 120; i++) {
      const r = Math.sin(i * 1.7) * 0.01;
      b *= 1 + r;
      a *= 1 + 2 * r;
      bench.push({ time: i * 86400, close: b });
      asset.push({ time: i * 86400, close: a });
    }
    expect(beta(asset, bench)).toBeCloseTo(2, 5);
  });
});
