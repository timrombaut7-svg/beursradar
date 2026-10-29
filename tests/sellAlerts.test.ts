import { describe, expect, it } from "vitest";
import type { SellAdvice } from "@/types";
import { alertMessage, alertsToSend, type AlertCandidate } from "@/lib/engine/sellAlerts";

const advice = (action: SellAdvice["action"]): SellAdvice => ({ action, title: action, reason: "Stop-loss geraakt (−8,0%).", toStopPct: null, toTarget1Pct: null, toTarget2Pct: null });
const c = (positionId: string, action: SellAdvice["action"]): AlertCandidate => ({ positionId, symbol: "NVDA", name: "NVIDIA", advice: advice(action) });
const now = new Date("2026-10-29T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("verkoopmeldingen", () => {
  it("meldt alleen verkopen en deels winst nemen", () => {
    expect(alertsToSend([c("a", "SELL"), c("b", "TAKE_PROFIT"), c("c", "HOLD")], [], now).map((x) => x.positionId)).toEqual(["a", "b"]);
  });

  it("stuurt dezelfde melding niet elk half uur opnieuw", () => {
    const recent = [{ positionId: "a", action: "SELL", createdAt: hoursAgo(1) }];
    expect(alertsToSend([c("a", "SELL")], recent, now)).toEqual([]);
    // Na drie dagen mag het weer, en een ander advies (winst → verkopen) meteen
    expect(alertsToSend([c("a", "SELL")], [{ positionId: "a", action: "SELL", createdAt: hoursAgo(80) }], now)).toHaveLength(1);
    expect(alertsToSend([c("a", "SELL")], [{ positionId: "a", action: "TAKE_PROFIT", createdAt: hoursAgo(1) }], now)).toHaveLength(1);
  });

  it("maakt een korte, duidelijke melding", () => {
    expect(alertMessage(c("a", "SELL"))).toEqual({ title: "Verkopen: NVIDIA (NVDA)", body: "Stop-loss geraakt (−8,0%)." });
    expect(alertMessage(c("a", "TAKE_PROFIT")).title).toBe("Deels winst nemen: NVIDIA (NVDA)");
  });
});
