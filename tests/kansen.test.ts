import { beforeAll, describe, expect, it } from "vitest";
import { sellAdvice } from "@/lib/engine/sellAdvice";
import { qualifies, mapLimit, getSignals, buildOpportunities } from "@/lib/engine/signals";
import { analyzeAsset } from "@/lib/engine/analyze";
import type { SignalRow } from "@/types";

beforeAll(() => {
  process.env.USE_MOCK_DATA = "1";
});

const plan = { buyPrice: 100, stopLoss: 92, target1: 110, target2: 120 };

describe("Verkoopadvies", () => {
  it("adviseert verkopen als de stop-loss geraakt is", () => {
    const a = sellAdvice(plan, 91, { advice: "BUY" });
    expect(a.action).toBe("SELL");
    expect(a.reason).toMatch(/Stop-loss/);
    expect(a.reason).toContain("-9,0%"); // Nederlandse decimale komma
  });

  it("adviseert verkopen bij koersdoel 2, ook als het signaal nog koop is", () => {
    expect(sellAdvice(plan, 121, { advice: "STRONG_BUY" }).action).toBe("SELL");
  });

  it("adviseert verkopen als het signaal omslaat", () => {
    const a = sellAdvice(plan, 104, { advice: "SELL" });
    expect(a.action).toBe("SELL");
    expect(a.reason).toMatch(/omgeslagen/);
  });

  it("adviseert deels winst nemen bij koersdoel 1", () => {
    const a = sellAdvice(plan, 111, { advice: "HOLD" });
    expect(a.action).toBe("TAKE_PROFIT");
    expect(a.reason).toMatch(/instapprijs/);
  });

  it("adviseert houden daartussen en rekent afstanden uit", () => {
    const a = sellAdvice(plan, 100, { advice: "BUY" });
    expect(a.action).toBe("HOLD");
    expect(a.toStopPct).toBeCloseTo(0.08);
    expect(a.toTarget1Pct).toBeCloseTo(0.1);
    expect(a.toTarget2Pct).toBeCloseTo(0.2);
  });

  it("valt terug op alleen het signaal voor posities zonder plan", () => {
    expect(sellAdvice({ buyPrice: 100 }, 50, { advice: "HOLD" }).action).toBe("HOLD");
    expect(sellAdvice({ buyPrice: 100 }, 50, { advice: "STRONG_SELL" }).action).toBe("SELL");
    expect(sellAdvice({ buyPrice: 100 }, 50, null).reason).toMatch(/geen plan/);
  });
});

const row = (over: Partial<SignalRow>): SignalRow => ({
  symbol: "X",
  name: "X",
  type: "stock",
  currency: "USD",
  price: 10,
  changePct24h: 0,
  shortTerm: { advice: "BUY", score: 20, confidence: 60 },
  longTerm: { advice: "HOLD", score: 0 },
  tradePlan: { direction: "long", entryLow: 9, entryHigh: 10, stopLoss: 8, target1: 12, target2: 14, riskReward1: 1.5, riskReward2: 3, riskPct: 0.1, rationale: [] },
  reasons: [],
  pricesLive: true,
  mockSources: [],
  ...over,
});

describe("Koopkansen", () => {
  it("korte termijn: alleen koopsignalen met een long-plan", () => {
    expect(qualifies(row({}), "short", false)).toBe(true);
    expect(qualifies(row({ shortTerm: { advice: "STRONG_BUY", score: 60, confidence: 70 } }), "short", false)).toBe(true);
    expect(qualifies(row({ shortTerm: { advice: "HOLD", score: 5, confidence: 50 } }), "short", false)).toBe(false);
    const shortPlan = { ...row({}).tradePlan, direction: "short" as const };
    expect(qualifies(row({ tradePlan: shortPlan }), "short", false)).toBe(false);
  });

  it("lange termijn: positief lange-termijnsignaal, niet als het korte-termijnsignaal op verkopen staat", () => {
    const lt = { advice: "BUY" as const, score: 30 };
    expect(qualifies(row({ longTerm: lt, shortTerm: { advice: "HOLD", score: 0, confidence: 50 } }), "long", false)).toBe(true);
    expect(qualifies(row({ longTerm: lt, shortTerm: { advice: "SELL", score: -20, confidence: 50 } }), "long", false)).toBe(false);
    expect(qualifies(row({ longTerm: { advice: "HOLD", score: 5 } }), "long", false)).toBe(false);
  });

  it("raadt nooit assets aan waarvan de koersen alleen mock-data zijn", () => {
    const mockRow = row({ pricesLive: false, longTerm: { advice: "BUY", score: 30 } });
    expect(qualifies(mockRow, "short", false)).toBe(false);
    expect(qualifies(mockRow, "long", false)).toBe(false);
    expect(qualifies(mockRow, "short", true)).toBe(true);
  });

  it("bouwt kansen per termijn, gesorteerd op score en met een passend plan", async () => {
    const list = await Promise.all(["BTC", "ETH", "SOL"].map((s) => analyzeAsset(s, "crypto")));
    const nvda = await analyzeAsset("NVDA", "stock");
    const { short, long } = buildOpportunities([...list, nvda], true);
    for (const [ops, horizon] of [[short, "short"], [long, "long"]] as const) {
      for (let i = 1; i < ops.length; i++) expect(ops[i].score).toBeLessThanOrEqual(ops[i - 1].score);
      for (const o of ops) {
        expect(o.horizon).toBe(horizon);
        expect(o.plan.stopLoss).toBeLessThan(o.plan.entryLow);
        if (horizon === "long") expect(o.plan.target1).toBeNull();
        else expect(o.plan.target1!).toBeGreaterThan(o.plan.entryHigh);
      }
    }
  });

  it("mapLimit respecteert de volgorde en het maximum aantal gelijktijdige taken", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("bouwt signalen uit de echte analyse-engine (mock mode)", async () => {
    const [btc] = await getSignals([{ symbol: "BTC", type: "crypto" }]);
    expect(btc.symbol).toBe("BTC");
    expect(btc.tradePlan.stopLoss).toBeGreaterThan(0);
    expect(btc.reasons.length).toBeLessThanOrEqual(3);
  });
});

describe("Verkoopadvies lange termijn", () => {
  it("heeft geen koersdoelen maar wel een noodrem en volgt het lange-termijnsignaal", () => {
    const p = { buyPrice: 100, stopLoss: 75, target1: null, target2: null, horizon: "long" as const };
    expect(sellAdvice(p, 150, { advice: "BUY" }).action).toBe("HOLD");
    expect(sellAdvice(p, 150, { advice: "BUY" }).reason).toMatch(/Lange termijn/);
    expect(sellAdvice(p, 74, { advice: "BUY" }).action).toBe("SELL");
    expect(sellAdvice(p, 120, { advice: "SELL" }).action).toBe("SELL");
  });
});
