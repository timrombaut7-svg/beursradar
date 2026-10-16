import type { Horizon, Opportunity } from "@/types";
import { dbEnabled, getDb } from "@/lib/db";
import { getCandles } from "@/lib/engine/analyze";
import { mapLimit } from "@/lib/engine/signals";
import { evaluateTip, summarizeOutcomes, type TipOutcome, type TrackSummary } from "@/lib/engine/trackRecord";
import { getLivePrices } from "@/lib/api/livePrices";
import { ANALYSIS_TIMEFRAME } from "@/lib/timeframes";

/** Een tip voor hetzelfde aandeel en dezelfde termijn telt pas opnieuw na deze periode (dagen). */
export const TIP_COOLDOWN_DAYS: Record<Horizon, number> = { short: 14, long: 91 };
const DAY_MS = 86_400_000;

/** Slaat nieuwe koopkansen op, zonder dezelfde tip elke minuut opnieuw te tellen. */
export async function recordTips(opps: Opportunity[], now = new Date()): Promise<number> {
  if (!dbEnabled() || opps.length === 0) return 0;
  const db = getDb();
  const since = new Date(now.getTime() - Math.max(...Object.values(TIP_COOLDOWN_DAYS)) * DAY_MS);
  const recent = await db.tip.findMany({ where: { createdAt: { gte: since } }, select: { symbol: true, type: true, horizon: true, createdAt: true } });
  const fresh = opps.filter(
    (o) =>
      !recent.some(
        (t) =>
          t.symbol === o.row.symbol &&
          t.type === o.row.type &&
          t.horizon === o.horizon &&
          now.getTime() - t.createdAt.getTime() < TIP_COOLDOWN_DAYS[o.horizon] * DAY_MS,
      ),
  );
  if (!fresh.length) return 0;
  await db.tip.createMany({
    data: fresh.map((o) => ({
      symbol: o.row.symbol,
      type: o.row.type,
      name: o.row.name,
      horizon: o.horizon,
      currency: o.row.currency,
      entry: o.row.price,
      stopLoss: o.plan.stopLoss,
      target1: o.horizon === "short" ? o.plan.target1 : null,
      createdAt: now,
    })),
  });
  return fresh.length;
}

export interface TrackRecordTip extends TipOutcome {
  id: string;
  symbol: string;
  type: "stock" | "crypto";
  name: string;
  horizon: Horizon;
  currency: string;
  entry: number;
  createdAt: string;
}

export interface TrackRecord {
  enabled: boolean;
  since: string | null;
  summary: Record<Horizon, TrackSummary>;
  tips: TrackRecordTip[];
}

const EMPTY = summarizeOutcomes([]);

/** Alle tips van het afgelopen jaar, nagekeken met de echte koersen sindsdien. */
export async function getTrackRecord(): Promise<TrackRecord> {
  if (!dbEnabled()) return { enabled: false, since: null, summary: { short: EMPTY, long: EMPTY }, tips: [] };
  const db = getDb();
  const tips = await db.tip.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 365 * DAY_MS) } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const first = await db.tip.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });

  const assets = [...new Map(tips.map((t) => [`${t.type}:${t.symbol}`, { symbol: t.symbol, type: t.type as "stock" | "crypto" }])).values()];
  const [candleSets, live] = await Promise.all([
    mapLimit(assets, 4, (a) =>
      getCandles(a.symbol, a.type, { ...ANALYSIS_TIMEFRAME, bars: 400 })
        .then((r) => (r.live ? r.candles : null))
        .catch(() => null),
    ),
    getLivePrices(assets).catch(() => []),
  ]);
  const candlesFor = new Map(assets.map((a, i) => [`${a.type}:${a.symbol}`, candleSets[i]]));

  const evaluated: TrackRecordTip[] = [];
  for (const t of tips) {
    const key = `${t.type}:${t.symbol}`;
    const candles = candlesFor.get(key);
    if (!candles) continue; // zonder echte koersen kunnen we niet eerlijk nakijken
    const price = live.find((p) => p.symbol === t.symbol && p.type === t.type)?.price;
    const horizon = t.horizon as Horizon;
    const outcome = evaluateTip(
      { horizon, type: t.type as "stock" | "crypto", entry: t.entry, stopLoss: t.stopLoss, target1: t.target1, createdAt: t.createdAt },
      candles,
      price,
    );
    evaluated.push({
      ...outcome,
      id: t.id,
      symbol: t.symbol,
      type: t.type as "stock" | "crypto",
      name: t.name,
      horizon,
      currency: t.currency,
      entry: t.entry,
      createdAt: t.createdAt.toISOString(),
    });
  }
  const by = (h: Horizon) => summarizeOutcomes(evaluated.filter((t) => t.horizon === h));
  return { enabled: true, since: first?.createdAt.toISOString() ?? null, summary: { short: by("short"), long: by("long") }, tips: evaluated };
}
