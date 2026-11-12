import type { AssetType } from "@/types";
import { getDb } from "@/lib/db";
import { getSignals, isBuySignal } from "@/lib/engine/signals";
import { universeAssets, getRatesToEur } from "@/lib/api/livePrices";
import { botDecide, FEE, replayTrades, START_CASH, type BotCandidate, type BotQuote } from "@/lib/engine/paper";
import { eurQuotes } from "./paperPrices";

/** Minimaal zoveel minuten tussen twee rondes (de route is openbaar). */
const MIN_ROUND_MINUTES = 10;
const LOCK_ID = 424242;

const isSell = (a: string) => a === "SELL" || a === "STRONG_SELL";

/**
 * Eén ronde van de trading bot: koersen en signalen ophalen, beslissen (botDecide) en uitvoeren.
 * Draait elk half uur via GitHub Actions. Alleen op live koersen; aandelen alleen als hun beurs open is.
 */
export async function runBot(now = new Date()): Promise<{ ran: boolean; reason?: string; trades: number; equityEur?: number }> {
  const db = getDb();
  const last = await db.botEquity.findFirst({ orderBy: { createdAt: "desc" } });
  if (last && now.getTime() - last.createdAt.getTime() < MIN_ROUND_MINUTES * 60_000) return { ran: false, reason: "te snel na de vorige ronde", trades: 0 };

  // Nooit twee rondes tegelijk
  const [{ locked }] = await db.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(${LOCK_ID}) AS locked`;
  if (!locked) return { ran: false, reason: "er loopt al een ronde", trades: 0 };
  try {
    const [positions, trades] = await Promise.all([db.botPosition.findMany(), db.botTrade.findMany({ orderBy: { createdAt: "asc" } })]);
    const { cashEur } = replayTrades(trades);

    const assets = universeAssets();
    const [signals, quotes, toEur] = await Promise.all([getSignals(assets), eurQuotes(assets), getRatesToEur()]);
    const botQuotes: Record<string, BotQuote> = {};
    for (const [k, q] of Object.entries(quotes)) {
      const signal = signals.find((s) => `${s.type}:${s.symbol}` === k);
      botQuotes[k] = {
        priceEur: q.priceEur,
        tradable: k.startsWith("crypto:") || q.marketState === "open",
        sellSignal: Boolean(signal && signal.pricesLive && isSell(signal.shortTerm.advice)),
      };
    }
    const candidates: BotCandidate[] = signals.flatMap((s) => {
      const k = `${s.type}:${s.symbol}`;
      const q = botQuotes[k];
      const rate = toEur[s.currency];
      // Snelle winst: korte-termijn koopsignalen; een signaal dat de historische toets haalde gaat voor
      if (!q || !rate || s.etf || !isBuySignal(s, "short", false)) return [];
      const proven = s.evidence.short.verdict === "proven" ? 25 : 0;
      return [
        {
          symbol: s.symbol,
          type: s.type,
          name: s.name,
          priceEur: q.priceEur,
          stopLossEur: s.tradePlan.stopLoss * rate,
          target1Eur: s.tradePlan.target1 * rate,
          target2Eur: s.tradePlan.target2 * rate,
          score: s.shortTerm.score + proven,
          tradable: q.tradable,
        },
      ];
    });

    const actions = botDecide(
      positions.map((p) => ({ ...p, type: p.type as AssetType })),
      cashEur,
      botQuotes,
      candidates,
      now,
    );

    for (const a of actions) {
      if (a.kind === "sell") {
        const pos = positions.find((p) => p.symbol === a.symbol && p.type === a.type)!;
        const feeEur = a.quantity * a.priceEur * FEE;
        const pnlEur = a.quantity * (a.priceEur - pos.entryPriceEur) - feeEur - a.quantity * pos.entryPriceEur * FEE;
        await db.botTrade.create({
          data: { symbol: a.symbol, type: a.type, name: pos.name, side: "sell", quantity: a.quantity, priceEur: a.priceEur, feeEur, reason: a.reason, pnlEur },
        });
        if (a.closes) await db.botPosition.delete({ where: { id: pos.id } });
        else
          await db.botPosition.update({
            where: { id: pos.id },
            data: { quantity: pos.quantity - a.quantity, partialTaken: true, stopLossEur: a.moveStopTo ?? pos.stopLossEur },
          });
      } else {
        const c = a.candidate;
        const feeEur = a.quantity * c.priceEur * FEE;
        await db.botTrade.create({
          data: { symbol: c.symbol, type: c.type, name: c.name, side: "buy", quantity: a.quantity, priceEur: c.priceEur, feeEur, reason: a.reason },
        });
        await db.botPosition.create({
          data: {
            symbol: c.symbol,
            type: c.type,
            name: c.name,
            quantity: a.quantity,
            entryPriceEur: c.priceEur,
            stopLossEur: c.stopLossEur,
            target1Eur: c.target1Eur,
            target2Eur: c.target2Eur,
          },
        });
      }
    }

    // Waarde na deze ronde, voor de grafiek
    const [after, allTrades] = await Promise.all([db.botPosition.findMany(), db.botTrade.findMany({ orderBy: { createdAt: "asc" } })]);
    const cashAfter = replayTrades(allTrades).cashEur;
    const equityEur = cashAfter + after.reduce((s, p) => s + p.quantity * (quotes[`${p.type}:${p.symbol}`]?.priceEur ?? p.entryPriceEur), 0);
    await db.botEquity.create({ data: { equityEur, cashEur: cashAfter } });
    return { ran: true, trades: actions.length, equityEur };
  } finally {
    await db.$queryRaw`SELECT pg_advisory_unlock(${LOCK_ID})`;
  }
}

/** Alles wat de Bot-pagina toont. */
export async function getBotState() {
  const db = getDb();
  const [positions, trades, equity] = await Promise.all([
    db.botPosition.findMany({ orderBy: { openedAt: "asc" } }),
    db.botTrade.findMany({ orderBy: { createdAt: "asc" } }),
    db.botEquity.findMany({ orderBy: { createdAt: "asc" }, take: 2000 }),
  ]);
  const { cashEur } = replayTrades(trades);
  const quotes = await eurQuotes(positions.map((p) => ({ symbol: p.symbol, type: p.type as AssetType })));
  const rows = positions.map((p) => {
    const priceEur = quotes[`${p.type}:${p.symbol}`]?.priceEur ?? p.entryPriceEur;
    return {
      ...p,
      openedAt: p.openedAt.getTime(),
      priceEur,
      valueEur: p.quantity * priceEur,
      pnlPct: priceEur / p.entryPriceEur - 1,
    };
  });
  const equityEur = cashEur + rows.reduce((s, r) => s + r.valueEur, 0);
  const closed = trades.filter((t) => t.side === "sell" && t.pnlEur !== null);
  return {
    startEur: START_CASH,
    cashEur,
    equityEur,
    returnPct: equityEur / START_CASH - 1,
    positions: rows,
    trades: trades.slice(-60).reverse().map((t) => ({ ...t, createdAt: t.createdAt.getTime() })),
    stats: {
      trades: trades.length,
      closed: closed.length,
      wins: closed.filter((t) => (t.pnlEur ?? 0) > 0).length,
      realizedEur: closed.reduce((s, t) => s + (t.pnlEur ?? 0), 0),
    },
    equity: [{ t: equity[0]?.createdAt.getTime() ?? Date.now(), v: START_CASH }, ...equity.map((e) => ({ t: e.createdAt.getTime(), v: e.equityEur }))],
    lastRunAt: equity[equity.length - 1]?.createdAt.getTime() ?? null,
  };
}
