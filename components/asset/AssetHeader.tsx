"use client";
import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Analysis } from "@/types";
import { formatCompact, formatPct, formatPrice } from "@/lib/format";
import { useWatchlist } from "@/lib/store/watchlist";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNow, secondsAgo } from "@/lib/useNow";
import { LiveDot } from "@/components/LivePrice";

export function AssetHeader({ a }: { a: Analysis }) {
  const { toggle, items } = useWatchlist();
  const watched = items.some((i) => i.symbol === a.asset.symbol && i.type === a.asset.type);
  const up = a.quote.changePct24h >= 0;
  const now = useNow(5000);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{a.asset.symbol}</h1>
          <Badge tone={a.asset.type === "crypto" ? "hold" : a.asset.etf ? "neutral" : "accent"}>
            {a.asset.type === "crypto" ? "Crypto" : a.asset.etf ? "ETF" : "Aandeel"}
          </Badge>
          {a.asset.exchange && <Badge>{a.asset.exchange}</Badge>}
          <button
            onClick={() => toggle({ symbol: a.asset.symbol, name: a.asset.name, type: a.asset.type })}
            aria-label={watched ? "Verwijder van watchlist" : "Voeg toe aan watchlist"}
            className="rounded-md p-1.5 hover:bg-panel-2"
          >
            <Star className={cn("h-5 w-5", watched ? "fill-hold text-hold" : "text-muted")} />
          </button>
          <Link
            href={`/assistent?vraag=${encodeURIComponent(`Wat denk je van ${a.asset.name} (${a.asset.symbol})? Zou ik nu kopen?`)}`}
            className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20"
          >
            <Sparkles className="h-3.5 w-3.5" /> Vraag de AI
          </Link>
        </div>
        <p className="truncate text-sm text-muted">{a.asset.name}</p>
        {a.asset.etf && a.asset.about && <p className="mt-0.5 text-xs text-muted">{a.asset.about}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
          <LiveDot active={a.quote.source === "live"} /> Analyse bijgewerkt {secondsAgo(a.generatedAt, now)} · ververst elke minuut
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <div className="text-right">
          <motion.div
            key={a.quote.price}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            className="font-mono text-3xl font-bold tabular"
          >
            {formatPrice(a.quote.price, a.asset.currency)}
          </motion.div>
          <div className={cn("font-mono text-sm tabular", up ? "text-bull" : "text-bear")}>
            {up ? "▲" : "▼"} {formatPrice(Math.abs(a.quote.change24h), a.asset.currency)} ({formatPct(a.quote.changePct24h / 100, 2, true)}) 24u
          </div>
        </div>
        <dl className="hidden grid-cols-3 gap-x-6 gap-y-1 text-xs lg:grid">
          <dt className="text-muted">24u hoog</dt>
          <dt className="text-muted">24u laag</dt>
          <dt className="text-muted">{a.quote.marketCap ? "Marktkap." : "Volume"}</dt>
          <dd className="font-mono tabular">{formatPrice(a.quote.high24h, a.asset.currency)}</dd>
          <dd className="font-mono tabular">{formatPrice(a.quote.low24h, a.asset.currency)}</dd>
          <dd className="font-mono tabular">{formatCompact(a.quote.marketCap ?? a.quote.volume24h)}</dd>
        </dl>
      </div>
    </div>
  );
}
