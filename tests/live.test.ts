import { beforeAll, describe, expect, it } from "vitest";
import { applyLivePrice } from "@/lib/engine/live";
import { explainSignal } from "@/lib/engine/explain";
import { analyzeAsset } from "@/lib/engine/analyze";
import { getLivePrices } from "@/lib/api/livePrices";
import type { Candle } from "@/types";

beforeAll(() => {
  process.env.USE_MOCK_DATA = "1";
});

const DAY = 86400;
const day0 = 20_000 * DAY;
const candles: Candle[] = [
  { time: day0, open: 100, high: 105, low: 95, close: 102, volume: 1 },
  { time: day0 + DAY + 14 * 3600, open: 102, high: 104, low: 100, close: 103, volume: 1 },
];

describe("Live koers in dagcandles", () => {
  it("werkt de candle van vandaag bij (close, high, low)", () => {
    const out = applyLivePrice(candles, { price: 110, time: (day0 + DAY + 20 * 3600) * 1000 });
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ close: 110, high: 110, low: 100, open: 102 });
    // de originele reeks blijft ongewijzigd
    expect(candles[1].close).toBe(103);
  });

  it("voegt een nieuwe candle toe als de live koers van een nieuwe dag is", () => {
    const out = applyLivePrice(candles, { price: 99, time: (day0 + 2 * DAY + 3600) * 1000 });
    expect(out).toHaveLength(3);
    expect(out[2]).toMatchObject({ open: 103, close: 99, high: 103, low: 99 });
    expect(out[2].time).toBeGreaterThan(out[1].time);
  });

  it("negeert een oudere of ongeldige koers", () => {
    expect(applyLivePrice(candles, { price: 50, time: day0 * 1000 })).toBe(candles);
    expect(applyLivePrice(candles, { price: 0, time: Date.now() })).toBe(candles);
  });

  it("geeft in mock mode geen (verzonnen) live koersen", async () => {
    expect(await getLivePrices([{ symbol: "AAPL", type: "stock" }])).toEqual([]);
  });
});

describe("Uitleg bij een signaal", () => {
  it("legt het signaal uit met argumenten uit de beslissingsmatrix", async () => {
    const a = await analyzeAsset("NVDA", "stock");
    const e = explainSignal(a);
    expect(e.summary).toContain(a.asset.name);
    expect(e.summary).toMatch(/op een schaal van −100 tot \+100/);
    expect(e.pros.length).toBeLessThanOrEqual(4);
    expect(e.cons.length).toBeLessThanOrEqual(3);
    const allLabels = Object.values(a.pillars).flatMap((p) => p.factors.map((f) => f.label));
    for (const item of [...e.pros, ...e.cons]) expect(allLabels).toContain(item.title);
    // pro's hebben positieve punten, risico's negatieve
    const byLabel = new Map(Object.values(a.pillars).flatMap((p) => p.factors.map((f) => [f.label, f.points] as const)));
    for (const p of e.pros) expect(byLabel.get(p.title)).toBeGreaterThan(0);
    for (const c of e.cons) expect(byLabel.get(c.title)).toBeLessThan(0);
    if (a.tradePlan.direction === "long") expect(e.summary).toMatch(/stop-loss/);
  });

  it("noemt in de samenvatting de pijler die het meest bijdraagt", async () => {
    const a = await analyzeAsset("NVDA", "stock");
    // Fundamenteel scoort maximaal maar weegt maar 10%; technisch scoort lager maar weegt 50%
    a.shortTerm = { ...a.shortTerm, pillarScores: { fundamental: 100, technical: 60, sentiment: 0, risk: 0 } };
    expect(explainSignal(a).summary).toMatch(/Vooral de technische analyse en de fundamentele analyse zijn positief/);
  });
});
