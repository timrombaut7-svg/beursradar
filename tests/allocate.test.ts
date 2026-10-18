import { describe, expect, it } from "vitest";
import type { Opportunity } from "@/types";
import { allocate, MIN_PER_ITEM } from "@/lib/engine/allocate";

const opp = (symbol: string, kind: "etf" | "stock" | "crypto", score: number, price = 100, currency = "EUR"): Opportunity =>
  ({
    horizon: "long",
    score,
    row: { symbol, name: symbol, type: kind === "crypto" ? "crypto" : "stock", etf: kind === "etf", price, currency },
    plan: { stopLoss: price * 0.8 },
  }) as unknown as Opportunity;

const ALL = [
  opp("VWRL", "etf", 60),
  opp("IWDA", "etf", 58),
  opp("VTI", "etf", 52, 300, "USD"),
  opp("GOOGL", "stock", 55, 250, "USD"),
  opp("META", "stock", 50, 700, "USD"),
  opp("INGA", "stock", 45),
  opp("AMD", "stock", 40, 200, "USD"),
  opp("BTC", "crypto", 51, 100000, "USD"),
  opp("ETH", "crypto", 42, 4000, "USD"),
];
const rates = { EUR: 1, USD: 0.9 };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("Budget verdelen", () => {
  it("verdeelt het hele budget in hele euro's volgens het risicoprofiel", () => {
    const p = allocate(1000, "balanced", "long", ALL, rates);
    expect(sum(p.items.map((i) => i.amount)) + p.reserve).toBe(1000);
    expect(p.reserve).toBe(0);
    expect(p.buckets.etf.actual).toBeCloseTo(0.6, 2);
    expect(p.buckets.stock.actual).toBeCloseTo(0.3, 2);
    expect(p.buckets.crypto.actual).toBeCloseTo(0.1, 2);
    expect(p.items.every((i) => Number.isInteger(i.amount))).toBe(true);
    // Maximaal 2 ETF's: de best scorende
    expect(p.items.filter((i) => i.bucket === "etf").map((i) => i.opportunity.row.symbol).sort()).toEqual(["IWDA", "VWRL"]);
  });

  it("stopt bij een normaal budget nooit meer dan 10% in één los aandeel of één crypto", () => {
    for (const risk of ["careful", "balanced", "bold"] as const) {
      const p = allocate(10_000, risk, "long", ALL, rates);
      for (const i of p.items) if (i.bucket !== "etf") expect(i.weight).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });

  it("geeft geen crypto bij een voorzichtig profiel", () => {
    const p = allocate(1000, "careful", "long", ALL, rates);
    expect(p.items.some((i) => i.bucket === "crypto")).toBe(false);
    expect(p.buckets.etf.actual).toBeCloseTo(0.8, 2);
  });

  it("schuift naar ETF's als een groep geen kansen heeft, en houdt reserve over zonder kansen", () => {
    const noCrypto = allocate(1000, "bold", "long", ALL.filter((o) => o.row.type !== "crypto"), rates);
    expect(noCrypto.buckets.crypto.actual).toBe(0);
    expect(noCrypto.reserve).toBe(0);
    expect(noCrypto.notes.join(" ")).toMatch(/Geen enkele crypto/);

    const onlyStocks = allocate(1000, "balanced", "long", ALL.filter((o) => o.row.type === "stock" && !o.row.etf), rates);
    expect(onlyStocks.reserve).toBeGreaterThan(0);
    expect(onlyStocks.notes[0]).toMatch(/reserve/);

    const none = allocate(1000, "balanced", "long", [], rates);
    expect(none.items).toHaveLength(0);
    expect(none.reserve).toBe(1000);
  });

  it("gebruikt bij een klein budget weinig beleggingen, elk de moeite waard", () => {
    const p = allocate(120, "bold", "long", ALL, rates);
    // Te klein voor losse aandelen en crypto: alles in één brede ETF
    expect(p.items.map((i) => [i.opportunity.row.symbol, i.amount])).toEqual([["VWRL", 120]]);
    expect(p.reserve).toBe(0);
    expect(p.notes.join(" ")).toMatch(/te klein/);
    expect(allocate(30, "balanced", "long", ALL, rates).items.map((i) => i.amount)).toEqual([30]);
    for (const amount of [250, 500, 1000, 2500]) {
      for (const risk of ["careful", "balanced", "bold"] as const) {
        for (const i of allocate(amount, risk, "long", ALL, rates).items) expect(i.amount, `${amount} ${risk}`).toBeGreaterThanOrEqual(MIN_PER_ITEM);
      }
    }
  });

  it("rekent het aantal stuks uit in de valuta van de belegging", () => {
    const p = allocate(1000, "balanced", "long", ALL, rates);
    const googl = p.items.find((i) => i.opportunity.row.symbol === "GOOGL")!;
    expect(googl.units).toBeCloseTo(googl.amount / 0.9 / 250, 6);
    const noRate = allocate(1000, "balanced", "long", ALL, { EUR: 1 });
    expect(noRate.items.find((i) => i.opportunity.row.symbol === "GOOGL")!.units).toBeNull();
  });
});
