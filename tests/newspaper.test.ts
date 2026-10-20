import { describe, expect, it } from "vitest";
import type { FearGreed, MacroData, MarketTick, Mover } from "@/types";
import { writeLead } from "@/lib/engine/newspaper";

const fg = (value: number): FearGreed => ({ value, label: "x", source: "live" });
const macro: MacroData = {
  fedFundsRate: 4.33,
  rateTrend: "falling",
  inflationYoY: 2.9,
  inflationTrend: "stable",
  us10y: 4.1,
  btcDominance: 57,
  btcDominanceTrend: "stable",
  source: "live",
};
const tick = (symbol: string, name: string, changePct: number, group: MarketTick["group"] = "index"): MarketTick => ({
  symbol,
  name,
  group,
  price: 100,
  changePct,
  currency: "USD",
  marketState: "open",
});
const mover = (symbol: string, changePct: number): Mover => ({ symbol, name: symbol, type: "stock", price: 10, changePct, currency: "USD" });

const lead = (sp: number, btc: number, fear = 50, extra: MarketTick[] = []) =>
  writeLead({
    markets: [tick("^GSPC", "S&P 500", sp), tick("^AEX", "AEX", sp / 2), tick("BTC", "Bitcoin", btc, "crypto"), ...extra],
    movers: { up: [mover("NVDA", 4.2)], down: [mover("TSLA", -3.1)] },
    fearGreed: { stock: fg(fear), crypto: fg(fear) },
    macro,
  });

describe("hoofdartikel van de krant", () => {
  it("kiest de kop op basis van de markt", () => {
    expect(lead(1, 3).headline).toBe("Groene dag: aandelen én crypto in de plus");
    expect(lead(1, 3).tone).toBe("bull");
    expect(lead(-1, -3).headline).toBe("Rode dag: aandelen én crypto lager");
    expect(lead(-2, 0.5).headline).toContain("Klap op de beurs");
    expect(lead(0.1, 6).headline).toContain("Bitcoin schiet omhoog");
    expect(lead(0.05, 0.2).headline).toBe("Rustige dag op de beurzen");
  });

  it("schrijft in gewone Nederlandse taal met de echte cijfers", () => {
    const s = lead(0.82, -1.2, 50, [tick("GC=F", "Goud", 0.5, "commodity"), tick("EURUSD=X", "Euro/dollar", 0.1, "fx")]);
    expect(s.intro).toBe("Vandaag: de S&P 500 stijgt (+0,8%), de AEX stijgt (+0,4%) en Bitcoin daalt (−1,2%).");
    const text = s.paragraphs.join(" ");
    expect(text).toContain("In onze lijst is NVDA de grootste stijger (+4,2%) en TSLA de grootste daler (−3,1%).");
    expect(text).toContain("Verder: goud stijgt (+0,5%) en de euro is 100,000 dollar waard.");
    expect(text).toContain("De Amerikaanse rente staat op 4,33% en daalt");
  });

  it("geeft een passend advies bij angst en hebzucht", () => {
    expect(lead(0, 0, 10).takeaway).toContain("bang");
    expect(lead(0, 0, 90).takeaway).toContain("hebberig");
  });

  it("werkt ook zonder koersen", () => {
    const s = writeLead({ markets: [], movers: { up: [], down: [] }, fearGreed: { stock: fg(50), crypto: fg(50) }, macro });
    expect(s.headline).toBe("De markten in één oogopslag");
    expect(s.intro).toContain("niet bereikbaar");
  });
});
