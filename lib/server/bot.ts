import type { AssetType } from "@/types";
import { getDb } from "@/lib/db";
import { getSignals, isBuySignal } from "@/lib/engine/signals";
import { universeAssets } from "@/lib/api/livePrices";
import { BOT_RULES, botDecide, dayTradeLevels, FEE, replayTrades, START_CASH, type BotCandidate, type BotQuote } from "@/lib/engine/paper";
import { eurQuotes } from "./paperPrices";
import { getAnalysis } from "@/lib/engine/analyze";
import { adjustScore, learn, type LearnedModel, type TradeFeatures } from "@/lib/engine/learn";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Minimaal zoveel minuten tussen twee rondes (de route is openbaar). */
const MIN_ROUND_MINUTES = 0.75;
const LOCK_ID = 424242;

const isSell = (a: string) => a === "SELL" || a === "STRONG_SELL";

/**
 * Eén ronde van de trading bot: koersen en signalen ophalen, beslissen (botDecide) en uitvoeren.
 * Draait elke minuut via GitHub Actions. Alleen op live koersen; aandelen alleen als hun beurs open is.
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
    const [signals, quotes] = await Promise.all([getSignals(assets), eurQuotes([...assets, { symbol: "^GSPC", type: "stock" }])]);
    const model = learnFrom(trades);
    const marketChange = { stock: quotes["stock:^GSPC"]?.changePct ?? null, crypto: quotes["crypto:BTC"]?.changePct ?? null };
    const botQuotes: Record<string, BotQuote> = {};
    for (const [k, q] of Object.entries(quotes)) {
      const signal = signals.find((s) => `${s.type}:${s.symbol}` === k);
      botQuotes[k] = {
        priceEur: q.priceEur,
        tradable: k.startsWith("crypto:") || q.marketState === "open",
        sellSignal: Boolean(signal && signal.pricesLive && isSell(signal.shortTerm.advice)),
      };
    }
    // Daytrader: een korte-termijn koopsignaal én het stijgt vandaag al (momentum), maar niet te ver doorgeschoten.
    // Een signaal dat de historische toets haalde en een sterkere stijging vandaag gaan voor.
    const base = signals.flatMap((s) => {
      const k = `${s.type}:${s.symbol}`;
      const q = quotes[k];
      const bq = botQuotes[k];
      if (!q || !bq || s.etf || !isBuySignal(s, "short", false)) return [];
      if (q.changePct < BOT_RULES.minDayChangePct || q.changePct > BOT_RULES.maxDayChangePct) return [];
      return [{ s, q, bq }];
    });
    // Alles wat invloed kan hebben (RSI, stemming, nieuws, beweeglijkheid, de hele markt, het tijdstip)
    // vastleggen, en de score bijsturen met wat de bot uit eerdere trades leerde
    const featuresOf = new Map<string, TradeFeatures>();
    const candidates: BotCandidate[] = (
      await Promise.all(
        base.map(async ({ s, q, bq }) => {
          const a = await getAnalysis(s.symbol, s.type).catch(() => null);
          const features: TradeFeatures = {
            score: s.shortTerm.score,
            proven: s.evidence.short.verdict === "proven",
            dayChangePct: q.changePct,
            type: s.type,
            rsi: a?.technical.rsi ?? null,
            fearGreed: a?.sentiment.fearGreed.source === "live" ? a.sentiment.fearGreed.value : null,
            news: a && a.sentiment.news.length ? a.sentiment.newsScore : null,
            volatility: a?.risk.volatility30d ?? null,
            marketChangePct: marketChange[s.type],
            hourUtc: now.getUTCHours(),
          };
          const proven = features.proven ? 15 : 0;
          const adjusted = adjustScore(model, features, s.shortTerm.score + proven + q.changePct * 5);
          if (!adjusted) return null; // ervaring zegt: dit soort trades kost geld
          featuresOf.set(`${s.type}:${s.symbol}`, features);
          const pct = (adjusted.edge * 100).toLocaleString("nl-NL", { maximumFractionDigits: 2, signDisplay: "always" });
          return {
            symbol: s.symbol,
            type: s.type,
            name: s.name,
            priceEur: q.priceEur,
            ...dayTradeLevels(q.priceEur),
            score: adjusted.score,
            tradable: bq.tradable,
            note: model.samples ? `ervaring: ${pct}% verwacht` : undefined,
          } satisfies BotCandidate;
        }),
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);
    const recentSells: Record<string, Date> = {};
    for (const t of trades) if (t.side === "sell") recentSells[`${t.type}:${t.symbol}`] = t.createdAt;

    const actions = botDecide(
      positions.map((p) => ({ ...p, type: p.type as AssetType })),
      cashEur,
      botQuotes,
      candidates,
      now,
      recentSells,
    );

    for (const a of actions) {
      if (a.kind === "sell") {
        const pos = positions.find((p) => p.symbol === a.symbol && p.type === a.type)!;
        const feeEur = a.quantity * a.priceEur * FEE;
        const pnlEur = a.quantity * (a.priceEur - pos.entryPriceEur) - feeEur - a.quantity * pos.entryPriceEur * FEE;
        await db.botTrade.create({
          data: {
            symbol: a.symbol,
            type: a.type,
            name: pos.name,
            side: "sell",
            quantity: a.quantity,
            priceEur: a.priceEur,
            feeEur,
            reason: a.reason,
            pnlEur,
            // De kenmerken van de aankoop gaan mee: zo leert de bot wat welk resultaat gaf
            features: (pos.features ?? undefined) as Prisma.InputJsonValue | undefined,
          },
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
            features: (featuresOf.get(`${c.type}:${c.symbol}`) ?? undefined) as Prisma.InputJsonValue | undefined,
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

/** Wat de bot geleerd heeft: elke verkoop met de kenmerken van de aankoop en het resultaat in %. */
export function learnFrom(trades: { side: string; quantity: number; priceEur: number; feeEur: number; pnlEur: number | null; features: unknown }[]): LearnedModel {
  return learn(
    trades.flatMap((t) => {
      if (t.side !== "sell" || t.pnlEur === null || !t.features) return [];
      // Instapwaarde = opbrengst − winst − kosten
      const cost = t.quantity * t.priceEur - t.pnlEur - t.feeEur;
      return cost > 0 ? [{ features: t.features as TradeFeatures, pnlPct: t.pnlEur / cost }] : [];
    }),
  );
}

/** Elk n-de punt, plus altijd het laatste. */
export function thin<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

/** Alles wat de Bot-pagina toont. */
export async function getBotState() {
  const db = getDb();
  const [positions, trades, equity] = await Promise.all([
    db.botPosition.findMany({ orderBy: { openedAt: "asc" } }),
    db.botTrade.findMany({ orderBy: { createdAt: "asc" } }),
    db.botEquity.findMany({ orderBy: { createdAt: "asc" } }),
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
    // Elke minuut een punt is te veel voor een telefoonscherm: hooguit ± 300 punten, het laatste altijd erbij
    equity: [{ t: equity[0]?.createdAt.getTime() ?? Date.now(), v: START_CASH }, ...thin(equity, 300).map((e) => ({ t: e.createdAt.getTime(), v: e.equityEur }))],
    lastRunAt: equity[equity.length - 1]?.createdAt.getTime() ?? null,
    learned: learnFrom(trades),
  };
}
