import { describe, expect, it } from "vitest";
import { extractNumbers, parseNumber, parsePortfolioText, toProposals } from "@/lib/portfolio/screenshot";

describe("getallen lezen", () => {
  it("snapt Nederlandse en Engelse notatie", () => {
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("1,234.56")).toBe(1234.56);
    expect(parseNumber("0,0123")).toBe(0.0123);
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("1.234.567")).toBe(1234567);
    expect(parseNumber("10")).toBe(10);
    expect(parseNumber("abc")).toBeNull();
  });

  it("herkent valuta, plus/min en procenten", () => {
    const n = extractNumbers("€ 1.825,00  +€ 120,50  +7,1%  10 stuks");
    expect(n.map((x) => [x.value, x.currency, x.sign, x.percent])).toEqual([
      [1825, "EUR", null, false],
      [120.5, "EUR", "+", false],
      [7.1, null, "+", true],
      [10, null, null, false],
    ]);
    expect(n[3].next).toBe("stuks");
  });
});

describe("portfolio-screenshot lezen", () => {
  it("leest een Trade Republic-achtige lijst (naam, waarde, winst, aantal)", () => {
    const text = [
      "18:42",
      "Portefeuille",
      "€ 3.110,40",
      "Apple",
      "€ 1.825,00 +€ 120,50",
      "10 stuks",
      "NVIDIA",
      "€ 1.285,40 −€ 40,10",
      "8,5 stuks",
    ].join("\n");
    const h = parsePortfolioText(text);
    expect(h.map((x) => x.symbol)).toEqual(["AAPL", "NVDA"]);
    expect(h[0]).toMatchObject({ quantity: 10, value: { amount: 1825, currency: "EUR" }, pnl: { amount: 120.5, currency: "EUR" } });
    expect(h[1]).toMatchObject({ quantity: 8.5, pnl: { amount: -40.1 } });
  });

  it("leest crypto met de ticker achter het aantal (Bitvavo)", () => {
    const h = parsePortfolioText("Bitcoin\n0,05123 BTC  € 3.840,12\nEthereum\n1,2 ETH  € 2.700,00\nSolana\n€ 512,00");
    expect(h.map((x) => [x.symbol, x.quantity, x.value?.amount])).toEqual([
      ["BTC", 0.05123, 3840.12],
      ["ETH", 1.2, 2700],
      ["SOL", null, 512],
    ]);
  });

  it("leest een tabel op één regel (DEGIRO) en negeert getallen in namen", () => {
    const h = parsePortfolioText("Product Aantal Koers Waarde\nAPPLE INC. AAPL 10 182,50 1.825,00\nVANGUARD FTSE ALL-WORLD VWRL 25 118,20 2.955,00\nSPDR S&P 500 ETF SPY 3 580,10 1.740,30");
    expect(h.map((x) => [x.symbol, x.quantity])).toEqual([
      ["AAPL", 10],
      ["VWRL.AS", 25],
      ["SPY", 3],
    ]);
  });

  it("leest de tekst zoals de tekstherkenning hem echt teruggeeft (kolommen door elkaar)", () => {
    const ocr = `9:41

Portefeuille

€ 6.402,52

Apple € 2.271,60
12 stuks +€ 210,40
NVIDIA € 1.540,12
9,5 stuks -€ 35,80
Bitcoin € 2.200,80
0,0312 BTC +€ 402,10
Vanguard FTSE All-World € 390,00
3 stuks +€ 12,00`;
    const h = parsePortfolioText(ocr);
    expect(h.map((x) => [x.symbol, x.quantity, x.value?.amount, x.pnl?.amount])).toEqual([
      ["AAPL", 12, 2271.6, 210.4],
      ["NVDA", 9.5, 1540.12, -35.8],
      ["BTC", 0.0312, 2200.8, 402.1],
      ["VWRL.AS", 3, 390, 12],
    ]);
  });

  it("slaat regels zonder herkenbare belegging over", () => {
    expect(parsePortfolioText("Totaal\n€ 5.000,00\nBeschikbaar saldo € 12,00")).toEqual([]);
  });
});

describe("voorstellen maken", () => {
  const prices = { "stock:AAPL": { price: 200, currency: "USD" }, "crypto:SOL": { price: 160, currency: "USD" } };
  const toEur = { EUR: 1, USD: 0.9 };

  it("rekent de aankoopprijs terug uit waarde en winst", () => {
    const [p] = toProposals(parsePortfolioText("Apple\n€ 1.800,00 +€ 180,00\n10 stuks"), prices, toEur);
    // waarde $2000, winst $200 → kosten $1800 → $180 per stuk
    expect(p.quantity).toBe(10);
    expect(p.buyPrice).toBeCloseTo(180, 6);
    expect(p.buyPriceFrom).toBe("screenshot");
    expect(p.currency).toBe("USD");
  });

  it("rekent het aantal uit de waarde als er geen aantal staat", () => {
    const [p] = toProposals(parsePortfolioText("Solana\n€ 576,00"), prices, toEur);
    // €576 = $640 → 4 SOL
    expect(p.quantity).toBeCloseTo(4, 6);
    expect(p.quantityFrom).toBe("value");
    expect(p.buyPrice).toBe(160);
    expect(p.buyPriceFrom).toBe("current");
  });
});
