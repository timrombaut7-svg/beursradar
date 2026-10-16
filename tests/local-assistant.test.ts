import { beforeAll, describe, expect, it } from "vitest";
import { answerLocally, findAsset, parseQuestion } from "@/lib/chat/local";
import { analyzeAsset } from "@/lib/engine/analyze";

beforeAll(() => {
  process.env.USE_MOCK_DATA = "1";
});

describe("Assets herkennen", () => {
  it.each([
    ["Denk je dat NVIDIA gaat dalen?", "NVDA"],
    ["Is bitcoin nu een goede koop?", "BTC"],
    ["wat vind je van asml", "ASML"],
    ["Moet ik ING kopen?", "INGA.AS"],
    ["Hoe staat het met de coca cola aandelen", "KO"],
    ["En SOL?", "SOL"],
    ["Is Apple of Tesla beter?", "AAPL"],
  ])("%s → %s", (q, symbol) => {
    expect(findAsset(q)?.symbol).toBe(symbol);
  });

  it("verwart gewone woorden niet met tickers", () => {
    expect(findAsset("stuur me een link naar de site")).toBeNull();
    expect(findAsset("dat kost een ton")).toBeNull();
    expect(findAsset("ik wil beleggen in iets")).toBeNull();
  });
});

describe("Vragen begrijpen", () => {
  it.each([
    ["Denk je dat NVIDIA gaat dalen?", "down"],
    ["Gaat ASML stijgen?", "up"],
    ["Moet ik Bitcoin kopen?", "buy"],
    ["Moet ik mijn Tesla verkopen?", "sell"],
    ["Wat vind je van Apple?", "overview"],
    ["Wat kan ik nu het beste kopen?", "opportunities"],
    ["Welke crypto raad je aan voor de lange termijn?", "opportunities"],
    ["Moet ik iets verkopen uit mijn portfolio?", "portfolio"],
    ["Hoe is de stemming op de markt?", "market"],
    ["hallo", "help"],
  ])("%s → %s", (q, intent) => {
    expect(parseQuestion(q).intent).toBe(intent);
  });

  it("herkent termijn en soort", () => {
    const p = parseQuestion("Welke crypto raad je aan voor de lange termijn?");
    expect(p.horizon).toBe("long");
    expect(p.kind).toBe("crypto");
  });

  it("begrijpt een korte vervolgvraag over het vorige asset", () => {
    const p = parseQuestion("En op lange termijn?", ["Denk je dat NVIDIA gaat dalen?"]);
    expect(p.asset?.symbol).toBe("NVDA");
    expect(p.horizon).toBe("long");
    // ...maar een nieuwe algemene vraag is geen vervolgvraag
    expect(parseQuestion("Wat is het beste om te kopen?", ["Denk je dat NVIDIA gaat dalen?"]).intent).toBe("opportunities");
  });
});

describe("Antwoorden", () => {
  const ask = (q: string, history: string[] = [], positions: Parameters<typeof answerLocally>[2] = []) =>
    answerLocally(q, history, positions, () => {});

  it("baseert een 'gaat het dalen?'-antwoord op het echte signaal, zonder vaktermen", async () => {
    const a = await analyzeAsset("NVDA", "stock");
    const text = await ask("Denk je dat NVIDIA gaat dalen?");
    expect(text).toContain("Niemand kan zeker weten");
    expect(text).toContain(`score ${a.shortTerm.score > 0 ? "+" : ""}${a.shortTerm.score}`);
    expect(text).not.toMatch(/\b(EMA|RSI|MACD|Bollinger)\b/);
    expect(text).toMatch(/geen financieel advies/);
  });

  it("geeft bij een koopvraag het plan of legt uit waarom nu niet", async () => {
    const text = await ask("Moet ik Bitcoin kopen voor de lange termijn?");
    expect(text).toMatch(/Als je wilt kopen|Nu kopen\?/);
  });

  it("geeft verkoopadvies voor een eigen positie", async () => {
    const text = await ask("Moet ik mijn Bitcoin verkopen?", [], [
      { symbol: "BTC", name: "Bitcoin", type: "crypto", quantity: 1, buyPrice: 1_000_000, buyDate: "2026-01-01", currency: "USD", stopLoss: 900_000, horizon: "short" },
    ]);
    expect(text).toMatch(/Verkopen/);
    expect(text).toMatch(/Stop-loss/);
  });

  it("noemt kansen of zegt eerlijk dat er geen zijn", async () => {
    const text = await ask("Wat kan ik nu het beste kopen?");
    expect(text).toMatch(/beste kansen|geeft geen/);
  });

  it("legt uit wat je kunt vragen bij een onduidelijke vraag", async () => {
    expect(await ask("hallo")).toContain("Je kunt me bijvoorbeeld vragen");
  });
});
