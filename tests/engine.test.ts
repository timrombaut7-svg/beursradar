import { describe, expect, it } from "vitest";
import { mockCandles } from "@/lib/api/mock";
import { computeSeries, technicalSnapshot } from "@/lib/engine/technical";
import { adviceFor, buildPillar, pillarScore, technicalFactors, verdict, fundamentalFactors } from "@/lib/engine/scoring";
import { buildTradePlan } from "@/lib/engine/tradePlan";
import { runBacktest } from "@/lib/engine/backtest";
import { scoreText, aggregateSentiment } from "@/lib/nlp/sentiment";
import { parseRss } from "@/lib/api/news";
import { mvrvZProxy } from "@/lib/api/crypto";
import type { HorizonVerdict, PillarScore, Pillar, ScoreFactor } from "@/types";

const f = (pillar: Pillar, points: number, maxPoints: number, horizons: ("short" | "long")[] = ["short", "long"]): ScoreFactor => ({
  id: `${pillar}-${points}`,
  pillar,
  label: "x",
  value: "x",
  points,
  maxPoints,
  horizons,
  explanation: "",
});

describe("Beslissingsmatrix", () => {
  it("normaliseert pijlerscores naar -100..100", () => {
    expect(pillarScore("technical", [f("technical", 2, 2), f("technical", -1, 2)])).toBe(25);
    expect(pillarScore("technical", [f("technical", 3, 3)])).toBe(100);
    expect(pillarScore("technical", [])).toBe(0);
  });

  it("filtert factoren op horizon", () => {
    const factors = [f("technical", 2, 2, ["short"]), f("technical", -2, 2, ["long"])];
    expect(pillarScore("technical", factors, "short")).toBe(100);
    expect(pillarScore("technical", factors, "long")).toBe(-100);
  });

  it("vertaalt scores naar advies", () => {
    expect(adviceFor(80)).toBe("STRONG_BUY");
    expect(adviceFor(20)).toBe("BUY");
    expect(adviceFor(0)).toBe("HOLD");
    expect(adviceFor(-20)).toBe("SELL");
    expect(adviceFor(-80)).toBe("STRONG_SELL");
  });

  it("weegt pijlers per horizon en blijft binnen grenzen", () => {
    const pillars: Record<Pillar, PillarScore> = {
      technical: buildPillar("technical", [f("technical", 2, 2)]),
      fundamental: buildPillar("fundamental", [f("fundamental", 2, 2)]),
      sentiment: buildPillar("sentiment", [f("sentiment", 2, 2)]),
      risk: buildPillar("risk", [f("risk", 2, 2)]),
    };
    const v = verdict(pillars, "short");
    expect(v.score).toBe(100);
    expect(v.advice).toBe("STRONG_BUY");
    expect(v.confidence).toBeGreaterThan(80);
    expect(v.confidence).toBeLessThanOrEqual(95);
  });

  it("geeft hoge punten aan een goedkoop, groeiend aandeel", () => {
    const factors = fundamentalFactors(
      {
        kind: "stock",
        peRatio: 12,
        forwardPe: 10,
        pegRatio: 0.7,
        eps: 5,
        revenueGrowthYoY: 0.25,
        earningsGrowthYoY: 0.3,
        debtToEquity: 30,
        freeCashFlow: 1e9,
        dividendYield: 0.03,
        profitMargin: 0.2,
        marketCap: 1e10,
        beta: 1,
        sector: "Tech",
        analyst: { consensus: "buy", recommendationMean: 1.8, targetMeanPrice: 80, numberOfAnalysts: 20, strongBuy: 5, buy: 10, hold: 5, sell: 0, strongSell: 0 },
        source: "mock",
      },
      60,
    );
    // D/E kan maximaal +1 opleveren maar tot -2 kosten → net geen 100
    expect(pillarScore("fundamental", factors)).toBeGreaterThanOrEqual(90);
  });
});

describe("Trade-executieplan", () => {
  for (const symbol of ["AAPL", "TSLA", "BTC", "SOL", "XRP", "INTC"]) {
    const type = ["BTC", "SOL", "XRP"].includes(symbol) ? "crypto" : "stock";
    it(`levert een consistent plan voor ${symbol} in beide richtingen`, () => {
      const candles = mockCandles(symbol, type, { bars: 730, intervalSeconds: 86400 });
      const series = computeSeries(candles);
      const snap = technicalSnapshot(candles, series, 365);
      for (const score of [60, 20, 0, -20, -60]) {
        const v = { score, advice: adviceFor(score) } as HorizonVerdict;
        const plan = buildTradePlan(snap, v);
        const mid = (plan.entryLow + plan.entryHigh) / 2;
        expect(plan.entryLow).toBeLessThanOrEqual(plan.entryHigh);
        if (plan.direction === "long") {
          expect(plan.stopLoss).toBeLessThan(plan.entryLow);
          expect(plan.target1).toBeGreaterThan(plan.entryHigh);
          expect(plan.target2).toBeGreaterThan(plan.target1);
        } else {
          expect(plan.stopLoss).toBeGreaterThan(plan.entryHigh);
          expect(plan.target1).toBeLessThan(plan.entryLow);
          expect(plan.target2).toBeLessThan(plan.target1);
        }
        expect(plan.riskReward1).toBeGreaterThanOrEqual(1);
        expect(plan.riskReward2).toBeGreaterThanOrEqual(plan.riskReward1);
        expect(plan.riskReward1).toBeCloseTo(Math.abs(plan.target1 - mid) / Math.abs(mid - plan.stopLoss), 1);
      }
    });
  }
});

describe("Backtest", () => {
  it("draait zonder look-ahead en produceert een consistente equity-curve", () => {
    const candles = mockCandles("ETH", "crypto", { bars: 730, intervalSeconds: 86400 });
    const series = computeSeries(candles);
    const res = runBacktest(candles, series, { testBars: 365 });
    expect(res.equityCurve).toHaveLength(365);
    expect(res.equityCurve[0].buyHold).toBeCloseTo((candles[365].close / candles[365].open) * 100, 0);
    expect(res.winRate).toBeGreaterThanOrEqual(0);
    expect(res.winRate).toBeLessThanOrEqual(1);
    expect(res.exposure).toBeLessThanOrEqual(1);
    const compounded = res.trades.reduce((eq, t) => eq * (1 + t.returnPct) * 0.999 * 0.999, 1);
    expect(res.strategyReturn).toBeCloseTo(compounded - 1, 6);
    for (const t of res.trades) expect(t.exitTime).toBeGreaterThanOrEqual(t.entryTime);
  });

  it("is deterministisch: scores op bar i veranderen niet door toekomstige data", () => {
    const candles = mockCandles("NVDA", "stock", { bars: 500, intervalSeconds: 86400 });
    const full = computeSeries(candles);
    const partial = computeSeries(candles.slice(0, 400));
    expect(pillarScore("technical", technicalFactors(full, 399))).toBe(pillarScore("technical", technicalFactors(partial, 399)));
  });
});

describe("NLP sentiment", () => {
  it("tagt koppen correct", () => {
    expect(scoreText("Apple beats earnings expectations, shares surge to record").label).toBe("bullish");
    expect(scoreText("Exchange hacked, token plunges amid fraud investigation").label).toBe("bearish");
    expect(scoreText("Company to present at conference on Tuesday").label).toBe("neutral");
  });

  it("verwerkt negaties", () => {
    expect(scoreText("Shares did not drop").score).toBeGreaterThan(0);
  });

  it("weegt recent nieuws zwaarder", () => {
    const now = Date.now();
    const agg = aggregateSentiment(
      [
        { sentimentScore: 1, publishedAt: now },
        { sentimentScore: -1, publishedAt: now - 10 * 24 * 3600_000 },
      ],
      now,
    );
    expect(agg).toBeGreaterThan(0.9);
  });

  it("parseert RSS-items inclusief CDATA", () => {
    const xml = `<rss><channel><item><title><![CDATA[Bitcoin rallies &amp; more]]></title><link>https://x.y/1</link><pubDate>Mon, 13 Oct 2025 10:00:00 GMT</pubDate><description>desc</description></item></channel></rss>`;
    const items = parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Bitcoin rallies & more");
    expect(items[0].link).toBe("https://x.y/1");
  });
});

describe("Crypto fundamentals", () => {
  it("MVRV-proxy is positief na een sterke stijging en negatief na een daling", () => {
    const up = Array.from({ length: 400 }, (_, i) => 100 + i);
    const down = Array.from({ length: 400 }, (_, i) => 500 - i);
    expect(mvrvZProxy(up)!).toBeGreaterThan(1);
    expect(mvrvZProxy(down)!).toBeLessThan(-1);
    expect(mvrvZProxy([1, 2, 3])).toBeNull();
  });
});

describe("Alleen echte data telt mee", () => {
  it("geschatte netwerkactiviteit telt niet mee in de score (alleen in demo-modus)", async () => {
    const { mockCryptoFundamentals } = await import("@/lib/api/mock");
    const f = mockCryptoFundamentals("BTC", 80000, 0.5);
    expect(f.network.source).toBe("mock");
    expect(fundamentalFactors(f, 80000).some((x) => x.id === "network")).toBe(false);
    expect(fundamentalFactors(f, 80000, true).some((x) => x.id === "network")).toBe(true);
  });
});
