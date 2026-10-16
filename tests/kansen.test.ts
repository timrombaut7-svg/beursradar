import { beforeAll, describe, expect, it } from "vitest";
import { sellAdvice } from "@/lib/engine/sellAdvice";
import { pickOpportunities, mapLimit, getSignals } from "@/lib/engine/signals";
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
  it("toont alleen koopsignalen met een long-plan, gesorteerd op score", () => {
    const picked = pickOpportunities(
      [
        row({ symbol: "A", shortTerm: { advice: "BUY", score: 20, confidence: 50 } }),
        row({ symbol: "B", shortTerm: { advice: "STRONG_BUY", score: 60, confidence: 70 } }),
        row({ symbol: "C", shortTerm: { advice: "HOLD", score: 5, confidence: 50 } }),
        row({ symbol: "D", shortTerm: { advice: "SELL", score: -30, confidence: 50 } }),
      ],
      false,
    );
    expect(picked.map((r) => r.symbol)).toEqual(["B", "A"]);
  });

  it("raadt nooit assets aan waarvan de koersen alleen mock-data zijn", () => {
    const mockRow = row({ symbol: "M", pricesLive: false });
    expect(pickOpportunities([mockRow], false)).toEqual([]);
    expect(pickOpportunities([mockRow], true)).toHaveLength(1);
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
