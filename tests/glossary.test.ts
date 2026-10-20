import { describe, expect, it } from "vitest";
import { GLOSSARY, findDefinitionQuestion, findTerm, searchGlossary } from "@/lib/glossary";
import { parseQuestion } from "@/lib/chat/local";

describe("woordenlijst", () => {
  it("heeft unieke ids en een uitleg bij elk woord", () => {
    expect(GLOSSARY.length).toBeGreaterThan(60);
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length);
    for (const t of GLOSSARY) {
      expect(t.id, t.term).toMatch(/^[a-z0-9-]+$/);
      expect(t.short.length, t.term).toBeGreaterThan(30);
    }
  });

  it("herkent de labels zoals ze in de app staan", () => {
    const labels: Record<string, string> = {
      "RSI (14)": "rsi",
      "MACD hist.": "macd",
      "EMA 50 / 200": "ema",
      "Bollinger %B": "bollinger",
      "ATR (14)": "atr",
      "Max drawdown (1j)": "drawdown",
      "Sharpe ratio (1j)": "sharpe",
      "Volatiliteit 30d (jaarbasis)": "volatiliteit",
      "Beta vs S&P 500": "beta",
      "P/E (trailing)": "pe",
      "Forward P/E": "pe",
      "Schuld / EV": "schuld",
      "MVRV Z (proxy)": "mvrv",
      "Van ATH": "ath",
      "Target 1 (conservatief)": "target",
      "Stop-loss": "stop-loss",
      "Risk/Reward ratio": "rr",
      "Buy & Hold": "buy-hold",
      "Win rate": "winrate",
      "Tijd in markt": "exposure",
      Middenscenario: "vooruitblik",
      "Kans op hoger": "kans-op-hoger",
      Instapzone: "instapzone",
    };
    for (const [label, id] of Object.entries(labels)) expect(findTerm(label)?.id, label).toBe(id);
    expect(findTerm("Iets onbekends")).toBeNull();
  });

  it("zoekt in namen, afkortingen en uitleg", () => {
    expect(searchGlossary("stop")[0].id).toBe("stop-loss");
    expect(searchGlossary("RSI")[0].id).toBe("rsi");
    expect(searchGlossary("", "crypto").every((t) => t.category === "crypto")).toBe(true);
    expect(searchGlossary("xyzxyz")).toEqual([]);
  });
});

describe("uitlegvragen aan de assistent", () => {
  it("herkent vragen naar de betekenis van een woord", () => {
    expect(findDefinitionQuestion("Wat is een stop-loss?")?.id).toBe("stop-loss");
    expect(findDefinitionQuestion("wat betekent RSI precies")?.id).toBe("rsi");
    expect(findDefinitionQuestion("Leg ETF's uit")?.id).toBe("etf");
    expect(findDefinitionQuestion("uitleg over de sharpe ratio")?.id).toBe("sharpe");
    expect(findDefinitionQuestion("Wat zijn ETF's?")?.id).toBe("etf");
    expect(parseQuestion("Wat is een stop-loss?").intent).toBe("explain");
  });

  it("verwart gewone vragen niet met uitlegvragen", () => {
    expect(findDefinitionQuestion("Wat is de beste crypto?")).toBeNull();
    expect(parseQuestion("Wat is de beste crypto?").intent).toBe("opportunities");
    expect(parseQuestion("Wat is de stemming op de markt?").intent).toBe("market");
    expect(parseQuestion("Moet ik ASML kopen?").intent).toBe("buy");
  });
});
