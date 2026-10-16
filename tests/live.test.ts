import { beforeAll, describe, expect, it } from "vitest";
import { applyLivePrice } from "@/lib/engine/live";
import { daysLabel, easySentence, estimateHold, explainEasy, longTermPlan, shortTermPlan } from "@/lib/engine/explain";
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

describe("Uitleg in makkelijke taal", () => {
  it("gebruikt geen vaktermen en klopt met de punten van de factoren", async () => {
    const a = await analyzeAsset("NVDA", "stock");
    for (const horizon of ["short", "long"] as const) {
      const plan = horizon === "short" ? shortTermPlan(a) : longTermPlan(a);
      const e = explainEasy(a, horizon, plan, estimateHold(a, horizon, plan));
      const text = [e.headline, ...e.why, ...e.risks, e.plan, e.hold].join(" ");
      expect(text).not.toMatch(/\b(EMA|RSI|MACD|Bollinger|PEG|ATR|MVRV|Sharpe|beta)\b/i);
      expect(e.headline).toContain(a.asset.name);
      expect(e.why.length).toBeLessThanOrEqual(4);
      expect(e.risks.length).toBeLessThanOrEqual(2);
      expect(e.plan).toMatch(/verkoop/i);
    }
  });

  it("geeft per factor een zin in de goede richting", async () => {
    const a = await analyzeAsset("BTC", "crypto");
    const base = { pillar: "technical" as const, id: "ema20", label: "", value: "", maxPoints: 1, horizons: ["short" as const], explanation: "" };
    expect(easySentence({ ...base, points: 1 }, a)).toMatch(/hoger/);
    expect(easySentence({ ...base, points: -1 }, a)).toMatch(/lager/);
    expect(easySentence({ ...base, points: 0 }, a)).toBeNull();
    // Nederlandse decimale komma in waarden
    const mdd = { ...base, pillar: "risk" as const, id: "mdd", value: "-48.8%", maxPoints: 2 };
    expect(easySentence({ ...mdd, points: -2 }, a)).toContain("-48,8%");
    // Onbekende factor: valt terug op de bestaande uitleg in plaats van niets
    expect(easySentence({ ...base, id: "nieuw", points: 1, explanation: "Fallback." }, a)).toBe("Fallback.");
  });
});

describe("Hoe lang houden", () => {
  it("schat de korte termijn in dagen/weken en de lange termijn in maanden tot jaren", async () => {
    const a = await analyzeAsset("NVDA", "stock");
    const short = estimateHold(a, "short", shortTermPlan(a));
    expect(short.minDays!).toBeGreaterThanOrEqual(3);
    expect(short.maxDays!).toBeGreaterThanOrEqual(short.minDays!);
    expect(short.maxDays!).toBeLessThanOrEqual(56); // max 40 handelsdagen
    expect(short.label).toMatch(/^± /);
    expect(estimateHold(a, "long", longTermPlan(a)).label).toBe("maanden tot jaren");
  });

  it("formuleert de duur leesbaar", () => {
    expect(daysLabel(4, 4)).toBe("± 4 dagen");
    expect(daysLabel(4, 8)).toBe("± 4–8 dagen");
    expect(daysLabel(7, 10)).toBe("± 1 week");
    expect(daysLabel(10, 21)).toBe("± 1–3 weken");
  });

  it("geeft voor lange termijn een ruimere noodrem bij een beweeglijkere asset", async () => {
    const calm = await analyzeAsset("KO", "stock");
    const wild = await analyzeAsset("SOL", "crypto");
    expect(longTermPlan(wild).riskPct).toBeGreaterThan(longTermPlan(calm).riskPct);
    for (const a of [calm, wild]) {
      expect(longTermPlan(a).riskPct).toBeGreaterThanOrEqual(0.12);
      expect(longTermPlan(a).riskPct).toBeLessThanOrEqual(0.4);
    }
  });
});
