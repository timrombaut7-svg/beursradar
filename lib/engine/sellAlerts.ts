import type { SellAdvice } from "@/types";

/** Na zoveel uur mag dezelfde melding voor dezelfde positie opnieuw komen. */
export const ALERT_REPEAT_HOURS = 72;

export interface AlertCandidate {
  positionId: string;
  symbol: string;
  name: string;
  advice: SellAdvice;
}

/**
 * Welke posities verdienen nu een melding? Alleen "verkopen" en "deels winst nemen", en niet
 * opnieuw als dezelfde melding er de afgelopen dagen al was (anders krijg je er elk half uur één).
 */
export function alertsToSend(
  candidates: AlertCandidate[],
  recent: { positionId: string; action: string; createdAt: Date }[],
  now = new Date(),
): AlertCandidate[] {
  return candidates.filter(
    (c) =>
      (c.advice.action === "SELL" || c.advice.action === "TAKE_PROFIT") &&
      !recent.some(
        (r) => r.positionId === c.positionId && r.action === c.advice.action && now.getTime() - r.createdAt.getTime() < ALERT_REPEAT_HOURS * 3_600_000,
      ),
  );
}

/** De tekst van de melding, kort genoeg voor een telefoonscherm. */
export function alertMessage(c: AlertCandidate): { title: string; body: string } {
  const verb = c.advice.action === "SELL" ? "Verkopen" : "Deels winst nemen";
  return { title: `${verb}: ${c.name} (${c.symbol})`, body: c.advice.reason };
}
