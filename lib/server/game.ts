import type { AssetType } from "@/types";
import { getDb } from "@/lib/db";
import { findInUniverse } from "@/lib/api/universe";
import { checkOrder, replayTrades, START_CASH } from "@/lib/engine/paper";
import { eurQuotes } from "./paperPrices";
import { RequestValidationError } from "./profile";

/** Het €100.000-spel van één profiel: cash, posities met live waarde, en de laatste trades. */
export async function getGame(profileId: string) {
  const trades = await getDb().gameTrade.findMany({ where: { profileId }, orderBy: { createdAt: "asc" } });
  const { cashEur, holdings, realizedEur } = replayTrades(trades);
  const quotes = await eurQuotes(holdings.map((h) => ({ symbol: h.symbol, type: h.type })));
  const rows = holdings.map((h) => {
    const q = quotes[`${h.type}:${h.symbol}`];
    const priceEur = q?.priceEur ?? h.avgPriceEur;
    const valueEur = h.quantity * priceEur;
    const costEur = h.quantity * h.avgPriceEur;
    return { ...h, priceEur, live: Boolean(q), valueEur, pnlEur: valueEur - costEur, pnlPct: costEur > 0 ? valueEur / costEur - 1 : 0 };
  });
  const equityEur = cashEur + rows.reduce((s, r) => s + r.valueEur, 0);
  return {
    startEur: START_CASH,
    cashEur,
    equityEur,
    returnPct: equityEur / START_CASH - 1,
    realizedEur,
    holdings: rows.sort((a, b) => b.valueEur - a.valueEur),
    trades: trades.slice(-30).reverse().map((t) => ({ ...t, createdAt: t.createdAt.getTime() })),
    startedAt: trades[0]?.createdAt.getTime() ?? null,
  };
}

/** Voert een order uit tegen de live koers van dit moment. */
export async function placeGameOrder(
  profileId: string,
  order: { symbol: string; type: AssetType; side: "buy" | "sell"; quantity?: number; amountEur?: number },
) {
  const db = getDb();
  const entry = findInUniverse(order.symbol, order.type);
  if (!entry) throw new RequestValidationError("Deze belegging staat niet in Beursradar");
  const quote = (await eurQuotes([{ symbol: entry.symbol, type: entry.type }]))[`${entry.type}:${entry.symbol}`];
  if (!quote) throw new RequestValidationError("Er is nu geen live koers. Probeer het zo nog eens.");

  const trades = await db.gameTrade.findMany({ where: { profileId }, orderBy: { createdAt: "asc" } });
  const { cashEur, holdings } = replayTrades(trades);
  const held = holdings.find((h) => h.symbol === entry.symbol && h.type === entry.type)?.quantity ?? 0;
  const check = checkOrder(order, quote.priceEur, cashEur, held);
  if (!check.ok) throw new RequestValidationError(check.error);

  await db.gameTrade.create({
    data: {
      profileId,
      symbol: entry.symbol,
      type: entry.type,
      name: entry.name,
      side: order.side,
      quantity: check.quantity,
      priceEur: quote.priceEur,
      feeEur: check.feeEur,
    },
  });
  return { quantity: check.quantity, priceEur: quote.priceEur, totalEur: check.totalEur };
}

export async function resetGame(profileId: string) {
  await getDb().gameTrade.deleteMany({ where: { profileId } });
}
