import { describe, expect, it } from "vitest";
import { extractNumbers, fixMisreadCurrency, parseNumber, parsePortfolioText, toProposals } from "@/lib/portfolio/screenshot";
import { rowsFromWords } from "@/lib/portfolio/ocrRows";

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
    const prices = {
      "stock:AAPL": { price: 183, currency: "USD" },
      "stock:VWRL.AS": { price: 118, currency: "EUR" },
      "stock:SPY": { price: 579, currency: "USD" },
    };
    // Geen "stuks" en geen valutateken: aantal × koers = waarde wijst het aantal aan
    expect(toProposals(h, prices, { EUR: 1, USD: 0.9 }).map((p) => [p.symbol, p.quantity])).toEqual([
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

describe("aantal en koers niet verwisselen", () => {
  const toEur = { EUR: 1, USD: 0.9 };
  const propose = (text: string, symbol: string, price: number, currency = "USD") =>
    toProposals(parsePortfolioText(text), { [`stock:${symbol}`]: { price, currency } }, toEur)[0];

  it("ziet dat 2 het aantal is als de koers (150) ervoor staat", () => {
    // 2 aandelen van € 150 = € 300; NVIDIA kost nu $172 ≈ € 155
    const p = propose("NVIDIA\n150,00 2 € 300,00", "NVDA", 172);
    expect(p.quantity).toBe(2);
    expect(p.quantityFrom).toBe("screenshot");
  });

  it("gebruikt de waarde op de screenshot als er geen derde getal is", () => {
    const p = propose("NVIDIA 150,00\n2\n€ 312,00", "NVDA", 172);
    expect(p.quantity).toBe(2);
  });

  it("kiest het getal dat niet op een koers lijkt als er geen waarde staat", () => {
    expect(propose("Apple Inc. 150,00 2", "AAPL", 165).quantity).toBe(2);
  });

  it("herkent aantal en waarde zonder valutateken in de verkeerde volgorde", () => {
    expect(propose("AMD 300,00 2", "AMD", 150).quantity).toBe(2);
  });

  it("herstelt valutatekens die als letter gelezen zijn", () => {
    expect(fixMisreadCurrency("Apple S150.00 2 E300,00")).toBe("Apple $150.00 2 €300,00");
    expect(fixMisreadCurrency("AES 2024 Q3 E5")).toBe("AES 2024 Q3 E5");
    expect(propose("Apple S150.00 2 S300.00", "AAPL", 152).quantity).toBe(2);
  });

  it("neemt een gemiddelde aankoopprijs over als die erbij staat", () => {
    const p = propose("Tesla\nAantal 4\nGem. aankoopprijs € 200,00\n€ 1.000,00", "TSLA", 250);
    expect(p.quantity).toBe(4);
    expect(p.buyPrice).toBeCloseTo(200 / 0.9, 6);
    expect(p.buyPriceFrom).toBe("screenshot");
  });

  it("rondt een uit de waarde berekend aantal aandelen af op hele stuks", () => {
    // € 935,20 bij een koers van $525 (≈ € 472,50): 1,98 → 2 stuks
    const p = propose("Microsoft € 467,60\n€ 935,20", "MSFT", 525);
    expect(p.quantity).toBe(2);
    expect(p.quantityFrom).toBe("value");
  });

  it("laat het aantal leeg als er alleen een koers staat", () => {
    const p = propose("Apple\n150,00", "AAPL", 165);
    expect(p.quantity).toBeNull();
    expect(p.quantityFrom).toBe("missing");
  });

  it("geeft de waarde van de screenshot mee om het aantal te controleren", () => {
    const p = propose("NVIDIA\n150,00 2 € 300,00", "NVDA", 172);
    expect(p.screenshotValue).toBeCloseTo(300 / 0.9, 6);
    // De aankoopprijs ook in euro, zoals op de screenshot
    expect(propose("Apple\n€ 1.800,00 +€ 180,00\n10 stuks", "AAPL", 200).buyPriceShown).toEqual({ amount: expect.closeTo(162, 6), currency: "EUR" });
  });

  it("telt een los streepje niet als min en stopt bij het totaal", () => {
    expect(extractNumbers("Apple - 12 stuks")[0].sign).toBeNull();
    expect(extractNumbers("Apple −€ 12,00")[0].sign).toBe("-");
    // De tekstherkenning leest een min soms als lang streepje
    expect(extractNumbers("Apple —€ 61,50")[0].sign).toBe("-");
    const [btc] = parsePortfolioText("Bitcoin € 2.200,80\n0,03 BTC\nTotaal € 6.402,52");
    expect(btc.value?.amount).toBe(2200.8);
  });
});

describe("rijen uit de tekstherkenning", () => {
  it("zet kolommen die los gelezen zijn terug in rijen", () => {
    const w = (text: string, x0: number, y0: number, y1: number) => ({ text, x0, x1: x0 + 40, y0, y1 });
    // Eerst de linkerkolom, dan de rechterkolom (zoals de tekstherkenning het soms doet)
    const words = [
      w("Apple", 10, 100, 120),
      w("12", 10, 124, 138),
      w("stuks", 40, 124, 138),
      w("€", 300, 101, 119),
      w("2.271,60", 320, 101, 119),
      w("+€", 300, 125, 137),
      w("210,40", 330, 125, 137),
    ];
    expect(rowsFromWords(words)).toBe("Apple € 2.271,60\n12 stuks +€ 210,40");
    expect(rowsFromWords([])).toBe("");
  });
});
