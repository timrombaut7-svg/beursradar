import { describe, expect, it } from "vitest";
import { MIN_SAMPLES_TO_SKIP, adjustScore, expectedEdge, featureBuckets, learn, type TradeFeatures } from "@/lib/engine/learn";

const f = (over: Partial<TradeFeatures> = {}): TradeFeatures => ({
  score: 50,
  proven: false,
  dayChangePct: 0.5,
  type: "stock",
  rsi: 55,
  fearGreed: 50,
  news: 0,
  volatility: 0.25,
  marketChangePct: 0.3,
  hourUtc: 15,
  ...over,
});

describe("bot leert", () => {
  it("zet alles wat invloed kan hebben in vakjes", () => {
    expect(featureBuckets(f({ score: 70, proven: true, dayChangePct: 3.2, rsi: 75, fearGreed: 20, news: 0.4, volatility: 0.6, marketChangePct: -1, hourUtc: 9 }))).toEqual([
      "score:60+",
      "proven:ja",
      "dag:3%+",
      "type:stock",
      "rsi:70+",
      "stemming:angst",
      "nieuws:positief",
      "volatiliteit:hoog",
      "markt:omlaag",
      "tijd:ochtend",
    ]);
    // Onbekende gegevens worden overgeslagen in plaats van geraden
    expect(featureBuckets(f({ rsi: null, news: null }))).not.toContain("rsi:50-70");
  });

  it("leert dat positief nieuws winst gaf en negatief nieuws verlies", () => {
    const samples = [
      ...Array.from({ length: 10 }, () => ({ features: f({ news: 0.5 }), pnlPct: 0.01 })),
      ...Array.from({ length: 10 }, () => ({ features: f({ news: -0.5 }), pnlPct: -0.01 })),
    ];
    const m = learn(samples);
    const pos = m.buckets.find((b) => b.bucket === "nieuws:positief")!;
    expect(pos.n).toBe(10);
    expect(pos.winRate).toBe(1);
    // Voorzichtig: 10 trades tellen voor 10/18 mee
    expect(pos.edgePct).toBeCloseTo(0.01 * (10 / 18), 9);
    expect(expectedEdge(m, f({ news: 0.5 }))).toBeGreaterThan(expectedEdge(m, f({ news: -0.5 })));
  });

  it("laat één toevalstreffer weinig gewicht hebben", () => {
    const m = learn([{ features: f(), pnlPct: 0.05 }]);
    expect(m.buckets[0].edgePct).toBeCloseTo(0.05 / 9, 9);
  });

  it("stuurt de score bij, en slaat pas na genoeg ervaring kansen over", () => {
    const losing = Array.from({ length: MIN_SAMPLES_TO_SKIP }, () => ({ features: f(), pnlPct: -0.02 }));
    expect(adjustScore(learn(losing), f(), 50)).toBeNull();
    const few = losing.slice(0, 5);
    const r = adjustScore(learn(few), f(), 50);
    expect(r).not.toBeNull();
    expect(r!.score).toBeLessThan(50);
    // Zonder ervaring: score blijft gelijk
    expect(adjustScore(learn([]), f(), 50)).toEqual({ score: 50, edge: 0 });
  });
});
