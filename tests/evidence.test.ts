import { describe, expect, it } from "vitest";
import type { Candle } from "@/types";
import { computeSeries } from "@/lib/engine/technical";
import { longEvidence, planShape, shortEvidence } from "@/lib/engine/evidence";
import { evaluateTip, summarizeOutcomes, type TipInput } from "@/lib/engine/trackRecord";
import { evidenceSentence, rejectionReason } from "@/lib/evidenceText";

const DAY = 86400;

/** Koersreeks met vaste dagelijkse groei en een kleine golfbeweging. */
function series(n: number, dailyDrift: number, start = 100): Candle[] {
  const out: Candle[] = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const wave = 1 + 0.01 * Math.sin(i / 3);
    const close = p * (1 + dailyDrift) * wave / (1 + 0.01 * Math.sin((i - 1) / 3));
    const open = p;
    out.push({ time: 1_600_000_000 + i * DAY, open, high: Math.max(open, close) * 1.004, low: Math.min(open, close) * 0.996, close, volume: 1e6 });
    p = close;
  }
  return out;
}

describe("Historische toets", () => {
  it("vertaalt het plan naar ATR-afstanden en begrenst die", () => {
    expect(planShape({ entryLow: 98, entryHigh: 102, stopLoss: 96, target1: 108 }, 2, 100)).toEqual({ riskAtr: 2, rewardAtr: 4 });
    const extreme = planShape({ entryLow: 100, entryHigh: 100, stopLoss: 99.9, target1: 200 }, 1, 100);
    expect(extreme.riskAtr).toBe(0.75);
    expect(extreme.rewardAtr).toBe(12);
  });

  it("geeft in een stijgende markt winst en in een dalende markt geen bewijs", () => {
    const up = series(900, 0.002);
    const sUp = computeSeries(up);
    const shortUp = shortEvidence(up, sUp, { riskAtr: 2, rewardAtr: 2 }, 252);
    expect(shortUp.samples).toBeGreaterThan(5);
    expect(shortUp.avgReturn).toBeGreaterThan(0);
    expect(longEvidence(up, sUp, 252).avgReturn).toBeGreaterThan(0);

    const down = series(900, -0.002);
    const sDown = computeSeries(down);
    expect(shortEvidence(down, sDown, { riskAtr: 2, rewardAtr: 2 }, 252).verdict).not.toBe("proven");
    expect(longEvidence(down, sDown, 252).verdict).not.toBe("proven");
  });

  it("telt alleen afgeronde trades en kijkt nooit vooruit", () => {
    const up = series(700, 0.002);
    const full = shortEvidence(up, computeSeries(up), { riskAtr: 2, rewardAtr: 2 }, 252);
    // De toets op een kortere historie mag niet méér trades hebben dan op de volledige
    const cut = up.slice(0, 500);
    const part = shortEvidence(cut, computeSeries(cut), { riskAtr: 2, rewardAtr: 2 }, 252);
    expect(part.samples).toBeLessThanOrEqual(full.samples);
    expect(full.wins).toBeLessThanOrEqual(full.samples);
  });

  it("legt het bewijs uit in gewone taal", () => {
    const e = { horizon: "short" as const, samples: 20, wins: 12, winRate: 0.6, avgReturn: 0.012, baselineReturn: 0.003, bestReturn: 0.1, worstReturn: -0.05, avgHoldDays: 8, years: 4.2, verdict: "proven" as const };
    expect(evidenceSentence(e, "short")).toContain("12 van de 20 keer");
    expect(evidenceSentence(e, "short")).toContain("+1,2%");
    expect(rejectionReason({ ...e, avgReturn: 0.001, verdict: "weak" })).toMatch(/willekeurig/);
    expect(rejectionReason({ ...e, samples: 3, verdict: "insufficient" })).toMatch(/te weinig/);
  });
});

describe("Scorebord", () => {
  const created = new Date((1_600_000_000 + 0.5 * DAY) * 1000);
  const tip = (over: Partial<TipInput> = {}): TipInput => ({ horizon: "short", type: "stock", entry: 100, stopLoss: 95, target1: 110, createdAt: created, ...over });
  const c = (day: number, low: number, high: number, close = (low + high) / 2, open = close): Candle => ({ time: 1_600_000_000 + day * DAY, open, high, low, close, volume: 1 });

  it("telt een doel als winst en een stop als verlies, alleen met koersen na de tip", () => {
    // Dag 0 (vóór de tip) raakt het doel al: dat mag niet meetellen
    expect(evaluateTip(tip(), [c(0, 99, 120), c(1, 98, 104), c(2, 101, 111)]).status).toBe("target");
    const stop = evaluateTip(tip(), [c(1, 98, 104), c(2, 94, 100, 96, 97)]);
    expect(stop.status).toBe("stop");
    expect(stop.ret).toBeCloseTo(-0.05);
  });

  it("rekent voorzichtig met de stop als een dag beide raakt", () => {
    expect(evaluateTip(tip(), [c(1, 90, 115)]).status).toBe("stop");
  });

  it("laat lopende tips open en sluit na de maximale termijn af", () => {
    const open = evaluateTip(tip(), [c(1, 99, 103, 102)], 104);
    expect(open).toEqual({ status: "open", ret: expect.closeTo(0.04), days: 1 });
    const days = Array.from({ length: 45 }, (_, k) => c(k + 1, 99, 103, 101));
    expect(evaluateTip(tip(), days)).toMatchObject({ status: "expired", days: 40 });
    const long = evaluateTip(tip({ horizon: "long", target1: null }), Array.from({ length: 70 }, (_, k) => c(k + 1, 99, 130, 120)));
    expect(long).toMatchObject({ status: "expired", days: 63 });
    expect(long.ret).toBeCloseTo(0.2);
  });

  it("vat de resultaten samen", () => {
    const s = summarizeOutcomes([
      { status: "target", ret: 0.1, days: 5 },
      { status: "stop", ret: -0.05, days: 3 },
      { status: "open", ret: 0.02, days: 1 },
    ]);
    expect(s).toMatchObject({ total: 3, finished: 2, wins: 1, winRate: 0.5, open: 1 });
    expect(s.avgReturn).toBeCloseTo(0.025);
  });
});
