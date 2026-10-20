import { describe, expect, it } from "vitest";
import type { Candle } from "@/types";
import { computeSeries } from "@/lib/engine/technical";
import { forecast, futureTimes, percentile } from "@/lib/engine/forecast";

const DAY = 86400;

/** Deterministische koersreeks met drift en ruis (eenvoudige LCG, dus elke run hetzelfde). */
function walk(n: number, drift: number, seed = 7): Candle[] {
  let x = seed;
  const rnd = () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296) - 0.5;
  const out: Candle[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    const close = p * Math.exp(drift + rnd() * 0.04);
    out.push({ time: 1_600_000_000 - (1_600_000_000 % DAY) + i * DAY, open: p, high: Math.max(p, close) * 1.005, low: Math.min(p, close) * 0.995, close, volume: 1e6 });
    p = close;
  }
  return out;
}

describe("percentielen en datums", () => {
  it("interpoleert percentielen", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
    expect(percentile([], 0.5)).toBe(0);
  });

  it("slaat het weekend over bij aandelen, niet bij crypto", () => {
    const friday = Date.UTC(2026, 9, 16) / 1000;
    const stock = futureTimes(friday, 3, true).map((t) => new Date(t * 1000).getUTCDay());
    expect(stock).toEqual([1, 2, 3]);
    expect(futureTimes(friday, 3, false).map((t) => new Date(t * 1000).getUTCDay())).toEqual([6, 0, 1]);
  });
});

describe("vooruitblik", () => {
  it("geeft een geordende waaier die vanaf de huidige koers vertrekt", () => {
    const c = walk(900, 0.001);
    const f = forecast(c, computeSeries(c), { horizon: 20, weekdaysOnly: false, price: 123 })!;
    expect(f).not.toBeNull();
    expect(f.points).toHaveLength(20);
    expect(f.startPrice).toBe(123);
    for (const p of f.points) {
      expect(p.p10).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p90);
    }
    // De onzekerheid groeit naarmate je verder vooruit kijkt
    const width = (i: number) => f.points[i].p90 - f.points[i].p10;
    expect(width(19)).toBeGreaterThan(width(0));
    expect(f.points[0].time).toBeGreaterThan(c[c.length - 1].time);
    expect(f.samples).toBeGreaterThanOrEqual(40);
    expect(f.probUp).toBeGreaterThanOrEqual(0);
    expect(f.probUp).toBeLessThanOrEqual(1);
    expect(forecast(c, computeSeries(c), { horizon: 20, weekdaysOnly: false, price: 123 })).toEqual(f);
  });

  it("ziet een stijgende trend terug in het middenscenario", () => {
    const up = walk(900, 0.004);
    const down = walk(900, -0.004);
    const fu = forecast(up, computeSeries(up), { horizon: 20, weekdaysOnly: true })!;
    const fd = forecast(down, computeSeries(down), { horizon: 20, weekdaysOnly: true })!;
    expect(fu.medianReturn).toBeGreaterThan(0);
    expect(fu.probUp).toBeGreaterThan(0.5);
    expect(fd.medianReturn).toBeLessThan(0);
    expect(fd.probUp).toBeLessThan(0.5);
  });

  it("geeft niets bij te weinig historie", () => {
    const c = walk(200, 0);
    expect(forecast(c, computeSeries(c), { horizon: 20, weekdaysOnly: true })).toBeNull();
  });
});
