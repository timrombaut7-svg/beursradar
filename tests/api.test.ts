import { describe, expect, it, beforeAll } from "vitest";
import { analyzeAsset } from "@/lib/engine/analyze";
import { searchUniverse } from "@/lib/api/universe";
import { mockCandles } from "@/lib/api/mock";

beforeAll(() => {
  process.env.USE_MOCK_DATA = "1";
});

describe("Mock-data fallback", () => {
  it("genereert deterministische, geldige OHLC-candles die eindigen op de basisprijs", () => {
    const a = mockCandles("AAPL", "stock", { bars: 300, intervalSeconds: 86400 });
    const b = mockCandles("AAPL", "stock", { bars: 300, intervalSeconds: 86400 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(300);
    for (const c of a) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.low).toBeGreaterThan(0);
    }
    expect(a[a.length - 1].close).toBeCloseTo(245, 0);
  });
});

describe("Zoeken", () => {
  it("vindt assets op ticker en naam", () => {
    expect(searchUniverse("nvda")[0].symbol).toBe("NVDA");
    expect(searchUniverse("bitcoin")[0].symbol).toBe("BTC");
    expect(searchUniverse("asml")[0].type).toBe("stock");
    expect(searchUniverse("")).toEqual([]);
  });
});

describe("Volledige analyse (mock mode)", () => {
  for (const [symbol, type] of [
    ["NVDA", "stock"],
    ["BTC", "crypto"],
    ["SOL", "crypto"],
  ] as const) {
    it(`analyseert ${symbol} end-to-end`, async () => {
      const a = await analyzeAsset(symbol, type);
      expect(a.asset.symbol).toBe(symbol);
      expect(a.shortTerm.score).toBeGreaterThanOrEqual(-100);
      expect(a.shortTerm.score).toBeLessThanOrEqual(100);
      expect(a.longTerm.score).toBeGreaterThanOrEqual(-100);
      expect(["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]).toContain(a.shortTerm.advice);
      expect(a.pillars.technical.factors.length).toBeGreaterThan(4);
      expect(a.pillars.fundamental.factors.length).toBeGreaterThan(2);
      expect(a.sentiment.news.length).toBeGreaterThan(0);
      expect(a.backtest.equityCurve.length).toBeGreaterThan(200);
      expect(a.technical.rsi).not.toBeNull();
      expect(a.technical.ema200).not.toBeNull();
      expect(Object.values(a.dataSources).every((s) => s === "mock")).toBe(true);
      expect(JSON.parse(JSON.stringify(a))).toBeTruthy();
    });
  }
});

describe("Fallback-veiligheid", () => {
  it("weigert een onbekend symbool zonder live data (buiten mock mode)", async () => {
    const { assertResolvable, AssetNotFoundError } = await import("@/lib/api/guard");
    const prev = process.env.USE_MOCK_DATA;
    process.env.USE_MOCK_DATA = "";
    try {
      expect(() => assertResolvable("ZZZZQQ", "stock", false)).toThrow(AssetNotFoundError);
      expect(() => assertResolvable("AAPL", "stock", false)).not.toThrow();
      expect(() => assertResolvable("ZZZZQQ", "stock", true)).not.toThrow();
    } finally {
      process.env.USE_MOCK_DATA = prev;
    }
  });

  it("verankert mock-candles aan de laatst bekende live prijs", async () => {
    const { rememberPrice } = await import("@/lib/api/mock");
    rememberPrice("ETH", "crypto", 2432.5);
    const c = mockCandles("ETH", "crypto", { bars: 100, intervalSeconds: 86400 });
    expect(c[c.length - 1].close).toBeCloseTo(2432.5, 1);
  });
});
