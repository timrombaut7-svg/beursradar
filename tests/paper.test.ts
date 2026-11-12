import { describe, expect, it } from "vitest";
import { BOT_RULES, FEE, START_CASH, botDecide, checkOrder, replayTrades, type BotCandidate, type BotPositionState } from "@/lib/engine/paper";

const trade = (side: "buy" | "sell", quantity: number, priceEur: number, symbol = "AAPL") => ({
  symbol,
  type: "stock",
  name: symbol,
  side,
  quantity,
  priceEur,
  feeEur: quantity * priceEur * FEE,
});

describe("€100.000-spel", () => {
  it("begint met € 100.000 en rekent kosten mee", () => {
    expect(replayTrades([]).cashEur).toBe(START_CASH);
    const { cashEur, holdings } = replayTrades([trade("buy", 10, 200)]);
    expect(cashEur).toBeCloseTo(START_CASH - 2000 - 2, 6);
    expect(holdings[0].quantity).toBe(10);
    expect(holdings[0].avgPriceEur).toBeCloseTo(200.2, 6);
  });

  it("houdt een gemiddelde aankoopprijs bij en rekent winst bij verkopen", () => {
    const r = replayTrades([trade("buy", 10, 100), trade("buy", 10, 200), trade("sell", 20, 300)]);
    expect(r.holdings).toEqual([]);
    // kosten 3000 + 3 aan; opbrengst 6000 − 6
    expect(r.realizedEur).toBeCloseTo(6000 - 6 - 3003, 6);
    expect(r.cashEur).toBeCloseTo(START_CASH - 3003 + 5994, 6);
  });

  it("weigert orders die niet kunnen", () => {
    expect(checkOrder({ side: "buy", amountEur: 200_000 }, 100, START_CASH, 0)).toMatchObject({ ok: false });
    expect(checkOrder({ side: "sell", quantity: 5 }, 100, START_CASH, 2)).toMatchObject({ ok: false });
    expect(checkOrder({ side: "buy" }, 100, START_CASH, 0)).toMatchObject({ ok: false });
    expect(checkOrder({ side: "buy", amountEur: 1000 }, 0, START_CASH, 0)).toMatchObject({ ok: false });
  });

  it("koopt voor een bedrag inclusief kosten en verkoopt alles in één keer", () => {
    const buy = checkOrder({ side: "buy", amountEur: 1001 }, 100, START_CASH, 0);
    expect(buy.ok && buy.quantity).toBeCloseTo(10, 6);
    expect(buy.ok && buy.totalEur).toBeCloseTo(1001, 6);
    const sell = checkOrder({ side: "sell" }, 120, START_CASH, 7);
    expect(sell.ok && sell.quantity).toBe(7);
  });
});

describe("trading bot", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  const pos = (over: Partial<BotPositionState> = {}): BotPositionState => ({
    symbol: "NVDA",
    type: "stock",
    name: "NVIDIA",
    quantity: 100,
    entryPriceEur: 100,
    stopLossEur: 95,
    target1Eur: 108,
    target2Eur: 115,
    partialTaken: false,
    openedAt: new Date(now.getTime() - 2 * 86_400_000),
    ...over,
  });
  const quote = (priceEur: number, extra: Partial<{ tradable: boolean; sellSignal: boolean }> = {}) => ({
    "stock:NVDA": { priceEur, tradable: true, sellSignal: false, ...extra },
  });
  const cand = (symbol: string, score: number, over: Partial<BotCandidate> = {}): BotCandidate => ({
    symbol,
    type: "crypto",
    name: symbol,
    priceEur: 50,
    stopLossEur: 47,
    target1Eur: 54,
    target2Eur: 58,
    score,
    tradable: true,
    ...over,
  });

  it("verkoopt bij de stop-loss en bij koersdoel 2", () => {
    expect(botDecide([pos()], 0, quote(94), [], now)).toMatchObject([{ kind: "sell", quantity: 100, closes: true, reason: expect.stringContaining("Stop-loss") }]);
    expect(botDecide([pos()], 0, quote(116), [], now)).toMatchObject([{ kind: "sell", closes: true, reason: expect.stringContaining("Koersdoel 2") }]);
  });

  it("verkoopt bij koersdoel 1 de helft en zet de stop op de instapprijs", () => {
    expect(botDecide([pos()], 0, quote(109), [], now)).toMatchObject([{ kind: "sell", quantity: 50, closes: false, moveStopTo: 100 }]);
    // Daarna niet nog eens de helft
    expect(botDecide([pos({ partialTaken: true, quantity: 50, stopLossEur: 100 })], 0, quote(110), [], now)).toEqual([]);
  });

  it("stapt uit als het signaal omslaat of de trade te lang duurt", () => {
    expect(botDecide([pos()], 0, quote(101, { sellSignal: true }), [], now)[0]).toMatchObject({ kind: "sell", closes: true });
    const old = pos({ openedAt: new Date(now.getTime() - (BOT_RULES.maxHoldDays + 1) * 86_400_000) });
    expect(botDecide([old], 0, quote(101), [], now)[0]).toMatchObject({ kind: "sell", closes: true });
  });

  it("handelt niet in aandelen als de beurs dicht is", () => {
    expect(botDecide([pos()], 0, quote(90, { tradable: false }), [], now)).toEqual([]);
  });

  it("koopt de sterkste signalen, elk 20% van het geld, tot 5 posities", () => {
    const cands = ["A", "B", "C", "D", "E", "F"].map((s, i) => cand(s, 10 + i));
    const actions = botDecide([], START_CASH, {}, cands, now);
    expect(actions.map((a) => (a.kind === "buy" ? a.candidate.symbol : ""))).toEqual(["F", "E", "D", "C", "B"]);
    const first = actions[0];
    expect(first.kind === "buy" && first.quantity * 50 * (1 + FEE)).toBeCloseTo(20_000, 6);
  });

  it("koopt niet wat hij al heeft, niet zonder geld en niet bij een onlogisch plan", () => {
    expect(botDecide([pos({ symbol: "A", type: "crypto" })], 50_000, { "crypto:A": { priceEur: 100, tradable: true, sellSignal: false } }, [cand("A", 50)], now)).toEqual([]);
    expect(botDecide([], 100, {}, [cand("B", 50)], now)).toEqual([]);
    expect(botDecide([], START_CASH, {}, [cand("C", 50, { stopLossEur: 60 })], now)).toEqual([]);
  });

  it("gebruikt geld van een verkoop meteen voor een nieuwe kans", () => {
    const actions = botDecide([pos()], 0, quote(94), [cand("X", 30)], now);
    expect(actions.map((a) => a.kind)).toEqual(["sell", "buy"]);
  });
});
